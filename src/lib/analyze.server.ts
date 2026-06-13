import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/lovable-ai.server";
import { callAiProvider } from "@/lib/ai-multi.server";
import type { ProviderId } from "@/lib/ai-providers";

type Log = { ts: number; msg: string; type: "info" | "success" | "error" | "warn" };

const APIFY_BASE = "https://api.apify.com/v2";

// Map a detected language code to plausible audience countries with weights (sum=1).
const LANG_TO_COUNTRIES: Record<string, Record<string, number>> = {
  ar: { "Saudi Arabia": 0.30, "Egypt": 0.22, "United Arab Emirates": 0.15, "Kuwait": 0.10, "Jordan": 0.08, "Morocco": 0.08, "Iraq": 0.07 },
  en: { "United States": 0.35, "United Kingdom": 0.18, "India": 0.12, "Canada": 0.10, "Australia": 0.08, "United Arab Emirates": 0.07, "Philippines": 0.10 },
  fr: { "France": 0.55, "Morocco": 0.15, "Algeria": 0.12, "Canada": 0.10, "Belgium": 0.08 },
  es: { "Spain": 0.30, "Mexico": 0.25, "Argentina": 0.12, "Colombia": 0.12, "United States": 0.10, "Chile": 0.11 },
  tr: { "Turkey": 0.90, "Germany": 0.10 },
  fa: { "Iran": 0.80, "Afghanistan": 0.10, "United Arab Emirates": 0.10 },
  ur: { "Pakistan": 0.65, "India": 0.20, "Saudi Arabia": 0.15 },
  hi: { "India": 0.85, "United Arab Emirates": 0.15 },
  id: { "Indonesia": 0.95, "Malaysia": 0.05 },
  pt: { "Brazil": 0.75, "Portugal": 0.20, "Angola": 0.05 },
  de: { "Germany": 0.75, "Austria": 0.15, "Switzerland": 0.10 },
  ru: { "Russia": 0.75, "Kazakhstan": 0.10, "Belarus": 0.08, "Ukraine": 0.07 },
};

function detectLang(text: string): string | null {
  if (!text) return null;
  const t = text.replace(/[\d\s\p{P}\p{S}]/gu, "");
  if (!t) return null;
  if (/[\u0600-\u06FF]/.test(t)) {
    if (/[\u067E\u0686\u06AF\u06CC]/.test(t) && !/[\u0629\u064A]/.test(t)) return "fa";
    return "ar";
  }
  if (/[\u0900-\u097F]/.test(t)) return "hi";
  if (/[\u0400-\u04FF]/.test(t)) return "ru";
  if (/[\u4E00-\u9FFF]/.test(t)) return "zh";
  if (/[\u3040-\u30FF]/.test(t)) return "ja";
  if (/[\u0E00-\u0E7F]/.test(t)) return "th";
  if (/[ñáéíóúü¿¡]/i.test(t)) return "es";
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(t)) return "fr";
  if (/[äöüß]/i.test(t)) return "de";
  if (/[ãõçáéíóú]/i.test(t)) return "pt";
  if (/[ışğüöçİ]/i.test(t)) return "tr";
  if (/^[a-z\s]+$/i.test(t)) return "en";
  return null;
}

function computeCountrySplitFromComments(comments: any[], creatorCountry?: string): Record<string, number> | null {
  if (!Array.isArray(comments) || comments.length < 10) return null;
  const langCounts: Record<string, number> = {};
  let total = 0;
  for (const c of comments.slice(0, 500)) {
    const txt = c?.text || c?.comment || "";
    const l = detectLang(String(txt));
    if (!l) continue;
    langCounts[l] = (langCounts[l] || 0) + 1;
    total++;
  }
  if (total < 10) return null;
  const country: Record<string, number> = {};
  for (const [lang, count] of Object.entries(langCounts)) {
    const map = LANG_TO_COUNTRIES[lang];
    if (!map) continue;
    const share = count / total;
    for (const [c, w] of Object.entries(map)) country[c] = (country[c] || 0) + share * w * 100;
  }
  // Bias toward creator's own country (+15%).
  if (creatorCountry) country[creatorCountry] = (country[creatorCountry] || 0) + 15;
  const sum = Object.values(country).reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  const norm: Record<string, number> = {};
  for (const [k, v] of Object.entries(country)) norm[k] = Number(((v / sum) * 100).toFixed(1));
  // Keep top 5.
  const top = Object.entries(norm).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const s2 = top.reduce((a, [, v]) => a + v, 0);
  return Object.fromEntries(top.map(([k, v]) => [k, Number(((v / s2) * 100).toFixed(1))]));
}

function mergeSplits(aiSplit: any, statSplit: Record<string, number> | null, aiWeight = 0.6): Record<string, number> | null {
  const ai = aiSplit && typeof aiSplit === "object" && !Array.isArray(aiSplit) ? aiSplit : null;
  if (!ai && !statSplit) return null;
  if (!ai) return statSplit;
  if (!statSplit) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(ai)) out[k] = Number(v) || 0;
    return out;
  }
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(ai), ...Object.keys(statSplit)]);
  for (const k of keys) {
    out[k] = (Number(ai[k]) || 0) * aiWeight + (statSplit[k] || 0) * (1 - aiWeight);
  }
  const top = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const s = top.reduce((a, [, v]) => a + v, 0);
  if (s <= 0) return null;
  return Object.fromEntries(top.map(([k, v]) => [k, Number(((v / s) * 100).toFixed(1))]));
}

async function appendLogs(jobId: string, logs: Log[], extra: Log[]) {
  logs.push(...extra);
  await supabaseAdmin.from("analysis_jobs").update({ logs, updated_at: new Date().toISOString() }).eq("id", jobId);
}

async function runApifyActor(actorId: string, input: any, apiKey: string, logs: Log[], jobId: string, timeoutMs = 180000): Promise<any[]> {
  const startUrl = `${APIFY_BASE}/acts/${actorId.replace("/", "~")}/runs?token=${apiKey}`;
  await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `▶ Starting ${actorId}`, type: "info" }]);
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!startRes.ok) {
    const txt = await startRes.text();
    throw new Error(`Apify start failed ${actorId}: ${startRes.status} ${txt.slice(0, 200)}`);
  }
  const { data: run } = await startRes.json();
  const runId = run.id;
  const datasetId = run.defaultDatasetId;
  await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `  runId=${runId}`, type: "info" }]);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${apiKey}`);
    const { data: status } = await statusRes.json();
    if (status.status === "SUCCEEDED") {
      const dsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${apiKey}&clean=true&format=json`);
      const items = await dsRes.json();
      await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `✓ ${actorId} returned ${items.length} items`, type: "success" }]);
      return items;
    }
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status.status)) {
      throw new Error(`Apify ${actorId} ${status.status}`);
    }
  }
  throw new Error(`Apify ${actorId} timeout`);
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert influencer marketing analyst. Return ONLY valid JSON with all fields filled. All scores are 0-100. No markdown, no explanation, no code fences. Output a single JSON object matching this shape exactly:
{
  "niche": string, "sub_niche": string, "country": string, "city": string, "primary_language": string,
  "audience_gender_split": {"female": number, "male": number},
  "audience_age_groups": {"13-17": number, "18-24": number, "25-34": number, "35-44": number, "45+": number},
  "audience_top_country": string, "audience_top_cities": string,
  "audience_country_split": {"<CountryName>": number, "...": number},
  "audience_city_split": {"<CityName>": number, "...": number},
  "audience_languages": [{"language": string, "percentage": number}],
  "audience_quality_score": number, "audience_authenticity_score": number,
  "fake_followers_score": number, "suspicious_engagement_score": number, "inactive_followers_score": number,
  "follower_growth_30d": number, "follower_growth_90d": number, "engagement_growth": number, "viral_frequency_score": number,
  "avg_view_rate": number, "avg_completion_rate": number, "avg_watch_time": number,
  "top_performing_format": string, "top_performing_hook_type": string, "top_performing_content_style": string,
  "conversion_intent_score": number, "trust_score": number, "recommendation_power_score": number,
  "audience_purchase_intent_score": number, "ad_reusability_score": number,
  "positive_comment_ratio": number, "negative_comment_ratio": number, "buying_comments_ratio": number, "trust_comments_ratio": number,
  "best_campaign_goal": string, "best_brand_fit": string, "strongest_niche_fit": string, "strongest_season_fit": string, "strongest_platform": string,
  "creator_style": string, "filming_style": string, "editing_style": string, "pacing_style": string, "storytelling_style": string,
  "avg_collab_price": number,
  "post_price_min": number, "post_price_estimated": number, "post_price_max": number,
  "story_price_min": number, "story_price_estimated": number, "story_price_max": number,
  "reel_price_min": number, "reel_price_estimated": number, "reel_price_max": number,
  "reliability_score": number, "posting_consistency": string,
  "controversy_score": number, "overpromotion_score": number, "audience_mismatch_risk": number, "inconsistency_risk": number, "brand_safety_score": number,
  "overall_score": number,
  "top_niches": [{"name": string, "score": number}],
  "creator_brand_affinity": [{"brand": string, "score": number}],
  "follower_brand_affinity": [{"brand": string, "score": number}],
  "interest_categories": [{"category": string, "score": number}],
  "psychological_traits": [{"trait": string, "score": number}],
  "sentiment_positive": number, "sentiment_neutral": number, "sentiment_negative": number,
  "sentiment_verdict": string, "sentiment_net_score": number,
  "trending_topics": [string],
  "word_cloud": [{"word": string, "frequency": number}],
  "top_hashtags": [{"tag": string, "count": number}],
  "top_mentions": [{"mention": string, "count": number}],
  "best_time_to_post": {"peak_day": string, "peak_hour": string, "heatmap": number[][]},
  "ai_summary": string, "ai_strengths": string, "ai_weaknesses": string, "ai_recommendation": string,
  "best_for_tags": [string], "collab_tips": [string]
}
heatmap MUST be a 7x24 array (Mon-Sun rows, 0-23h cols) of numbers 0-100.
audience_country_split MUST be a JSON object with EXACTLY 5-8 country names as keys and percentage numbers as values summing to 100. Example: {"Saudi Arabia": 35, "Kuwait": 20, "UAE": 15, "Qatar": 12, "Egypt": 10, "Other": 8}. NEVER return a single country with 100%. Infer from: comment text language/dialect, @mentions geography, hashtags with location names, bio location, creator's own country.
audience_city_split MUST be a JSON object with EXACTLY 4-6 city names as keys and percentage numbers as values summing to 100. Example: {"Riyadh": 25, "Jeddah": 18, "Kuwait City": 15, "Dubai": 12, "Doha": 10, "Other": 20}. NEVER return a single city with 100%.
audience_age_groups MUST be a JSON object with keys: "13-17", "18-24", "25-34", "35-44", "45-54", "55+" and values as percentages summing to EXACTLY 100.`;

const buildAnalysisUserPrompt = (payload: any) =>
  `Analyze this influencer based on real scraped data. Fill all fields with realistic, well-reasoned values. Focus on Gulf/MENA market when relevant.\n\nData:\n${JSON.stringify(payload).slice(0, 30000)}`;

async function callGemini(apiKey: string, payload: any, logs: Log[], jobId: string): Promise<any> {
  await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "🤖 Calling Gemini for AI analysis", type: "info" }]);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildAnalysisUserPrompt(payload) }] }],
      systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const j = await res.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try {
    const parsed = JSON.parse(text);
    await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "✓ Gemini AI analysis complete", type: "success" }]);
    return parsed;
  } catch {
    await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "✗ Gemini JSON parse failed", type: "error" }]);
    return {};
  }
}

async function callLovableAi(payload: any, logs: Log[], jobId: string): Promise<any> {
  await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "↻ Gemini quota exceeded — retrying with Lovable AI", type: "info" }]);

  const lovableApiKey = process.env.LOVABLE_API_KEY;
  if (!lovableApiKey) {
    throw new Error("Lovable AI is not configured on the server.");
  }

  const gateway = createLovableAiGatewayProvider(lovableApiKey);
  const result = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt: buildAnalysisUserPrompt(payload),
  });

  try {
    const parsed = JSON.parse(result.text || "{}");
    await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "✓ Lovable AI analysis complete", type: "success" }]);
    return parsed;
  } catch {
    await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "✗ Lovable AI JSON parse failed", type: "error" }]);
    return {};
  }
}

function validateAiOutput(ai: any): { valid: any; warnings: string[] } {
  const warnings: string[] = [];
  const valid = { ...ai };

  const scoreFields = [
    'overall_score', 'fake_followers_score', 'audience_authenticity_score',
    'audience_quality_score', 'trust_score', 'brand_safety_score',
    'reliability_score', 'conversion_intent_score', 'suspicious_engagement_score'
  ];

  for (const field of scoreFields) {
    const val = Number(valid[field]);
    if (isNaN(val) || valid[field] === null || valid[field] === undefined) {
      valid[field] = 0;
      warnings.push(`${field}: كان null/undefined — تم تعيينه 0`);
    } else if (val < 0 || val > 100) {
      valid[field] = Math.max(0, Math.min(100, val));
      warnings.push(`${field}: كان ${val} خارج النطاق — تم تصحيحه إلى ${valid[field]}`);
    }
  }

  if (valid.audience_age_groups && typeof valid.audience_age_groups === 'object') {
    const total = Object.values(valid.audience_age_groups)
      .reduce((s: number, v: any) => s + Number(v || 0), 0);
    if (total < 50 || total > 150) {
      warnings.push(`audience_age_groups: المجموع ${Math.round(total)}% بعيد عن 100%`);
    }
  }

  if (valid.audience_gender_split && typeof valid.audience_gender_split === 'object') {
    const gTotal = (Number(valid.audience_gender_split.male) || 0) +
                   (Number(valid.audience_gender_split.female) || 0);
    if (gTotal < 80 || gTotal > 120) {
      warnings.push(`audience_gender_split: المجموع ${Math.round(gTotal)}% غير منطقي`);
    }
  }

  if (Number(valid.engagement_rate) > 20) {
    warnings.push(`engagement_rate: ${valid.engagement_rate}% مرتفع جداً — تحقق يدوياً`);
  }

  return { valid, warnings };
}

export async function processJob(jobId: string): Promise<{ ok: boolean; influencerId?: string; error?: string }> {
  const { data: job } = await supabaseAdmin.from("analysis_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, error: "Job not found" };

  const logs: Log[] = Array.isArray(job.logs) ? (job.logs as any) : [];
  const { url, platform, username } = job;
  const tier: "free" | "full" = (logs[0] as any)?.meta?.tier === "free" ? "free" : "full";

  await supabaseAdmin.from("analysis_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
    attempts: (job.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  try {
    const { data: settings } = await supabaseAdmin.from("settings").select("*").limit(1).maybeSingle();
    const apifyKey = settings?.apify_api_key;
    const geminiKey = settings?.gemini_api_key;
    if (!apifyKey) throw new Error("Apify API key missing. Configure in Settings.");

    // Resolve active AI provider (new system) — falls back to legacy gemini key / Lovable AI.
    let activeProvider: { provider: ProviderId; model: string; api_key: string; name: string } | null = null;
    if ((settings as any)?.active_ai_provider_id) {
      const { data: p } = await supabaseAdmin
        .from("ai_providers")
        .select("*")
        .eq("id", (settings as any).active_ai_provider_id)
        .eq("is_enabled", true)
        .maybeSingle();
      if (p) activeProvider = { provider: p.provider as ProviderId, model: p.model, api_key: p.api_key, name: p.name };
    }


    const { data: tools } = await supabaseAdmin.from("apify_tools").select("*").eq("platform", platform).eq("is_enabled", true);

    let profile: any = null;
    let posts: any[] = [];
    let comments: any[] = [];

    if (platform === "instagram") {
      const profileTool = tools?.find((t: any) => t.actor_id === "apify/instagram-profile-scraper");
      const postsTool = tools?.find((t: any) => t.actor_id === "apify/instagram-scraper");
      const commentsTool = tools?.find((t: any) => t.actor_id === "apify/instagram-comment-scraper");

      const phase1: Promise<any[]>[] = [];
      if (profileTool) phase1.push(runApifyActor(profileTool.actor_id, { usernames: [username] }, apifyKey, logs, jobId));
      if (postsTool) phase1.push(runApifyActor(postsTool.actor_id, { directUrls: [`https://instagram.com/${username}/`], resultsType: "posts", resultsLimit: 12 }, apifyKey, logs, jobId));

      const [profRes, postRes] = await Promise.all(phase1);
      profile = profRes?.[0] || null;
      posts = postRes || [];

      if (commentsTool && posts.length && tier !== "free") {
        const postUrls = posts.filter((p: any) => p.url?.includes("/p/")).slice(0, 6).map((p: any) => p.url);
        if (postUrls.length) {
          try {
            comments = await runApifyActor(commentsTool.actor_id, { directUrls: postUrls }, apifyKey, logs, jobId, 90000);
          } catch (e: any) {
            await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `comments skipped: ${e.message}`, type: "error" }]);
          }
        }
      } else if (tier === "free") {
        await appendLogs(jobId, logs, [{ ts: Date.now(), msg: "Free tier: skipping comments scrape to save credits", type: "info" }]);
      }
    } else if (platform === "tiktok") {
      const tiktokTool = tools?.find((t: any) => t.actor_id === "clockworks/free-tiktok-scraper");
      if (tiktokTool) {
        const items = await runApifyActor(tiktokTool.actor_id, { profiles: [username], resultsPerPage: 12, shouldDownloadVideos: false }, apifyKey, logs, jobId);
        profile = items?.[0]?.authorMeta || items?.[0] || null;
        posts = items || [];
      }
    }

    const followers = profile?.followersCount ?? profile?.fans ?? 0;
    const following = profile?.followingCount ?? profile?.following ?? 0;
    const postsCount = profile?.postsCount ?? profile?.video ?? posts.length;
    const profilePicUrl = profile?.profilePicUrl ?? profile?.profilePicUrlHD ?? profile?.avatar ?? "";
    const biography = profile?.biography ?? profile?.signature ?? "";
    const verified = profile?.verified ?? profile?.is_verified ?? false;
    const fullName = profile?.fullName ?? profile?.nickName ?? username;

    const mappedPosts = posts.slice(0, 12).map((p: any) => ({
      thumbnail: p.displayUrl || p.thumbnailUrl || p.videoMeta?.coverUrl || p.images?.[0] || "",
      caption: (p.caption || p.text || "").slice(0, 200),
      likes: p.likesCount ?? p.diggCount ?? 0,
      comments: p.commentsCount ?? p.commentCount ?? 0,
      views: p.videoViewCount ?? p.videoPlayCount ?? p.playCount ?? 0,
      shares: p.shareCount ?? 0,
      timestamp: p.timestamp ?? p.createTimeISO ?? null,
      url: p.url ?? p.webVideoUrl ?? "",
      type: p.type ?? (p.videoUrl ? "Video" : "Image"),
      shortCode: p.shortCode ?? p.id ?? "",
    }));

    const avg = (k: keyof typeof mappedPosts[0]) =>
      mappedPosts.length ? Math.round(mappedPosts.reduce((s, p) => s + (Number(p[k]) || 0), 0) / mappedPosts.length) : 0;

    const avg_likes = avg("likes");
    const avg_comments = avg("comments");
    const avg_views = avg("views");
    const avg_shares = avg("shares");
    const allLikes = mappedPosts.map((p: any) => p.likes)
      .filter((v: number) => typeof v === 'number')
      .sort((a: number, b: number) => a - b);
    const allComments = mappedPosts.map((p: any) => p.comments)
      .filter((v: number) => typeof v === 'number')
      .sort((a: number, b: number) => a - b);
    const mid = Math.floor(allLikes.length / 2);
    const medianLikes = allLikes.length > 0 ? (allLikes[mid] || 0) : avg_likes;
    const medianComments = allComments.length > 0 ? (allComments[mid] || 0) : avg_comments;
    // ER uses averages (industry-standard). Median falls back when posts are sparse but
    // can collapse to 0 if the middle post has no engagement, so we use median only when
    // it is strictly higher than the average (resistant to a single viral outlier).
    const engNumerator = Math.max(avg_likes + avg_comments, medianLikes + medianComments);
    const engagement_rate = platform === 'tiktok'
      ? (avg_views > 0
          ? Number(((engNumerator / avg_views) * 100).toFixed(2))
          : 0)
      : (followers > 0
          ? Number(((engNumerator / followers) * 100).toFixed(2))
          : 0);

    const avg_reach = platform === 'tiktok'
      ? avg_views
      : Math.round(followers * 0.25);
    const avg_impressions = platform === 'tiktok'
      ? Math.round(avg_views * 1.1)
      : Math.round(avg_reach * 1.3);

    const _confScore = Math.round(
      (!!(profile && (profile.followersCount ?? profile.fans ?? 0) > 0) ? 40 : 0) +
      (Math.min(mappedPosts.length, 12) / 12 * 40) +
      (Math.min(comments?.length || 0, 100) / 100 * 20)
    );
    const dataConfidence = {
      has_real_profile: !!(profile && (profile.followersCount ?? profile.fans ?? 0) > 0),
      has_posts: mappedPosts.length >= 6,
      has_comments: (comments?.length || 0) >= 20,
      posts_count: mappedPosts.length,
      comments_count: comments?.length || 0,
      confidence_score: _confScore,
      confidence_label: _confScore >= 90 ? 'عالية الدقة' : _confScore >= 60 ? 'بيانات جيدة' : 'بيانات تقريبية',
    };

    const aiPayload = {
      username, platform, fullName, biography, followers, following, postsCount,
      engagement_rate, avg_likes, avg_comments, avg_views,
      posts: mappedPosts.map((p: any) => ({ caption: p.caption, likes: p.likes, comments: p.comments, views: p.views, type: p.type })),
      comments: comments.slice(0, 100).map((c: any) => c.text || c.comment || "").filter(Boolean),
    };

    let ai: any;
    try {
      if (activeProvider) {
        await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `🤖 Calling ${activeProvider.name} (${activeProvider.provider}/${activeProvider.model})`, type: "info" }]);
        const text = await callAiProvider({
          provider: activeProvider.provider,
          model: activeProvider.model,
          api_key: activeProvider.api_key,
          system: ANALYSIS_SYSTEM_PROMPT,
          prompt: buildAnalysisUserPrompt(aiPayload),
        });
        try { ai = JSON.parse(text); } catch { ai = {}; }
        await appendLogs(jobId, logs, [{ ts: Date.now(), msg: `✓ ${activeProvider.name} analysis complete`, type: "success" }]);
      } else if (geminiKey) {
        ai = await callGemini(geminiKey, aiPayload, logs, jobId);
      } else {
        ai = await callLovableAi(aiPayload, logs, jobId);
      }
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        ai = await callLovableAi(aiPayload, logs, jobId);
      } else {
        throw error;
      }
    }

    const { valid: validatedAi, warnings } = validateAiOutput(ai);

    if (warnings.length > 0) {
      logs.push({
        ts: Date.now(),
        msg: `⚠️ AI Validation: ${warnings.length} issues — ${warnings.join(' | ')}`,
        type: 'warn'
      });
    }

    // Statistical language→country boost from real Apify comments.
    const langCountrySplit = computeCountrySplitFromComments(comments, profile?.country || validatedAi.country);
    const mergedCountrySplit = mergeSplits(validatedAi.audience_country_split, langCountrySplit, 0.6);
    if (mergedCountrySplit) {
      validatedAi.audience_country_split = mergedCountrySplit;
      const topC = Object.entries(mergedCountrySplit).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0];
      if (topC) validatedAi.audience_top_country = topC;
    }
    if (validatedAi.audience_city_split && typeof validatedAi.audience_city_split === "object") {
      const topCity = Object.entries(validatedAi.audience_city_split)
        .sort((a:any,b:any)=>Number(b[1])-Number(a[1]))[0]?.[0];
      if (topCity) validatedAi.audience_top_cities = String(topCity);
    }

    if (validatedAi.audience_age_groups) {
      const ageVals = Object.values(validatedAi.audience_age_groups) as number[];
      const ageTotal = ageVals.reduce((s, v) => s + Number(v || 0), 0);
      if (ageTotal > 0 && Math.abs(ageTotal - 100) > 5) {
        const normalized: Record<string, number> = {};
        for (const [k, v] of Object.entries(validatedAi.audience_age_groups)) {
          normalized[k] = Number(((Number(v) / ageTotal) * 100).toFixed(1));
        }
        validatedAi.audience_age_groups = normalized;
      }
    }

    const merged = {
      ...validatedAi,
      profile_url: url,
      platform,
      username,
      influencer_name: fullName,
      profile_pic_url: profilePicUrl,
      biography,
      is_verified: verified,
      followers, following, posts_count: postsCount,
      avg_likes, avg_comments, avg_views, avg_shares,
      engagement_rate, avg_reach, avg_impressions,
      recent_posts: mappedPosts,
      popular_posts: [...mappedPosts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments)).slice(0, 6),
      raw_apify_data: { profile, postsCount: posts.length, commentsCount: comments.length },
      ai_validation_warnings: warnings,
      data_confidence: dataConfidence,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin.from("influencers").insert(merged).select("id").single();
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    logs.push({ ts: Date.now(), msg: `✓ Saved report ${inserted.id}`, type: "success" });
    await supabaseAdmin.from("analysis_jobs").update({
      status: "done",
      influencer_id: inserted.id,
      logs,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    return { ok: true, influencerId: inserted.id };
  } catch (e: any) {
    logs.push({ ts: Date.now(), msg: `✗ ${e.message}`, type: "error" });
    await supabaseAdmin.from("analysis_jobs").update({
      status: "error",
      error: e.message,
      logs,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    return { ok: false, error: e.message };
  }
}
