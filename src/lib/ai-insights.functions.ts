import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/lovable-ai.server";

// ─── shared helpers ─────────────────────────────────────────────────────

async function runAi(system: string, prompt: string): Promise<string> {
  // Prefer admin-configured provider, fall back to Lovable AI Gateway.
  const { data: settings } = await supabaseAdmin
    .from("settings").select("active_ai_provider_id").limit(1).maybeSingle();
  const { data: provider } = settings?.active_ai_provider_id
    ? await supabaseAdmin.from("ai_providers").select("*")
        .eq("id", settings.active_ai_provider_id).eq("is_enabled", true).maybeSingle()
    : { data: null as any };

  if (provider?.api_key && provider?.provider && provider?.model) {
    try {
      const { callAiProvider } = await import("@/lib/ai-multi.server");
      const out = await callAiProvider({
        provider: provider.provider as any,
        model: provider.model, api_key: provider.api_key,
        system, prompt,
      });
      if (out) return out;
    } catch (e) { console.warn("[ai-insights] provider failed:", e); }
  }
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const gw = createLovableAiGatewayProvider(key);
  const res = await generateText({ model: gw("google/gemini-2.5-flash"), system, prompt });
  return res.text;
}

function parseJson<T = any>(text: string, fallback: T): T {
  try { return JSON.parse(text.replace(/```json\s*|```/g, "").trim()); } catch { return fallback; }
}

async function loadInf(id: string) {
  const { data, error } = await supabaseAdmin
    .from("influencers").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Influencer not found");
  return data;
}

function summarizeInf(inf: any) {
  return {
    name: inf.influencer_name, username: inf.username, platform: inf.platform,
    followers: inf.followers, engagement_rate: inf.engagement_rate,
    avg_likes: inf.avg_likes, avg_comments: inf.avg_comments, avg_views: inf.avg_views,
    niche: inf.niche, sub_niche: inf.sub_niche, top_niches: inf.top_niches,
    creator_style: inf.creator_style, biography: inf.biography,
    country: inf.country, city: inf.city,
    audience_top_country: inf.audience_top_country,
    audience_top_cities: inf.audience_top_cities,
    audience_gender_split: inf.audience_gender_split,
    audience_age_groups: inf.audience_age_groups,
    overall_score: inf.overall_score,
    posts_sample: Array.isArray(inf.recent_posts) ? inf.recent_posts.slice(0, 10).map((p: any) => ({
      caption: (p.caption || "").slice(0, 280),
      likes: p.likes, comments: p.comments, views: p.views,
    })) : [],
  };
}

// ─── 1) AI Influencer Summary ────────────────────────────────────────────

const IdInput = z.object({ influencerId: z.string().uuid() });

export type AiSummary = {
  strengths: string[]; weaknesses: string[];
  audience_type: string; best_industries: string[]; risks: string[];
  overall_recommendation: string;
};

export const getInfluencerAiSummary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }): Promise<AiSummary> => {
    const inf = await loadInf(data.influencerId);
    const system = `You are an influencer marketing analyst. Output ONLY valid JSON, no markdown. Shape:
{"strengths":string[3-5],"weaknesses":string[2-4],"audience_type":string,"best_industries":string[3-5],"risks":string[1-3],"overall_recommendation":string}
Write each bullet in Arabic, concrete, 1 short sentence each, grounded in the data provided.`;
    const prompt = `Analyze this influencer and produce the JSON.\nData:\n${JSON.stringify(summarizeInf(inf)).slice(0, 8000)}`;
    const text = await runAi(system, prompt);
    const p = parseJson<any>(text, {});
    return {
      strengths: Array.isArray(p.strengths) ? p.strengths.slice(0, 6) : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses.slice(0, 6) : [],
      audience_type: typeof p.audience_type === "string" ? p.audience_type : "",
      best_industries: Array.isArray(p.best_industries) ? p.best_industries.slice(0, 6) : [],
      risks: Array.isArray(p.risks) ? p.risks.slice(0, 5) : [],
      overall_recommendation: typeof p.overall_recommendation === "string" ? p.overall_recommendation : "",
    };
  });

// ─── 2) AI Brand Match Score ─────────────────────────────────────────────

const MatchInput = z.object({
  influencerId: z.string().uuid(),
  industry: z.string().default(""),
  country: z.string().default(""),
  audienceType: z.string().default(""),
});

export type BrandMatch = {
  score: number;
  recommendation: "Use" | "Maybe" | "Avoid";
  reasons: string[];
  summary_ar: string;
};

export const getBrandMatchScore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MatchInput.parse(d))
  .handler(async ({ data }): Promise<BrandMatch> => {
    const inf = await loadInf(data.influencerId);
    const system = `You are a brand-influencer matching expert. Output ONLY JSON:
{"score":0-100,"recommendation":"Use"|"Maybe"|"Avoid","reasons":string[3-5],"summary_ar":string}
Reasons in Arabic, each tied to concrete data (audience country %, niche fit, engagement, etc.). Score reflects ALL three brand inputs combined.`;
    const prompt = `Brand inputs:\n- Industry: ${data.industry || "(unset)"}\n- Target Country: ${data.country || "(unset)"}\n- Target Audience: ${data.audienceType || "(unset)"}\n\nInfluencer:\n${JSON.stringify(summarizeInf(inf)).slice(0, 8000)}`;
    const text = await runAi(system, prompt);
    const p = parseJson<any>(text, {});
    const score = Math.max(0, Math.min(100, Math.round(Number(p.score) || 0)));
    const rec = ["Use", "Maybe", "Avoid"].includes(p.recommendation)
      ? p.recommendation : (score >= 70 ? "Use" : score >= 45 ? "Maybe" : "Avoid");
    return {
      score, recommendation: rec,
      reasons: Array.isArray(p.reasons) ? p.reasons.slice(0, 6) : [],
      summary_ar: typeof p.summary_ar === "string" ? p.summary_ar : "",
    };
  });

// ─── 3) Campaign Simulator (rule-based + AI explanation) ─────────────────

const SimInput = z.object({
  influencerId: z.string().uuid(),
  budget: z.number().positive(),
  country: z.string().default(""),
  industry: z.string().default(""),
});

export type CampaignSim = {
  estimated_reach: number;
  estimated_impressions: number;
  estimated_engagement: number;
  estimated_clicks: number;
  estimated_conversions: number;
  estimated_cpm: number;
  estimated_cpc: number;
  estimated_roi_pct: number;
  posts_count: number;
  explanation_ar: string;
  assumptions: string[];
};

export const simulateCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SimInput.parse(d))
  .handler(async ({ data }): Promise<CampaignSim> => {
    const inf = await loadInf(data.influencerId);
    const followers = Number(inf.followers) || 0;
    const er = Number(inf.engagement_rate) || 2; // %
    const avgLikes = Number(inf.avg_likes) || Math.round(followers * er / 100);
    const avgComments = Number(inf.avg_comments) || 0;
    const avgViews = Number(inf.avg_views) || Math.round(followers * 0.35);

    // Cost per post heuristic: $0.01 per follower, clamped.
    const costPerPost = Math.max(50, Math.min(50000, followers * 0.01));
    const posts = Math.max(1, Math.floor(data.budget / costPerPost));

    const reachPerPost = Math.max(avgViews, Math.round(followers * 0.30));
    const reach = Math.min(followers * 3, reachPerPost * posts);
    const impressions = Math.round(reach * 1.35);
    const engagementPerPost = avgLikes + avgComments;
    const engagement = engagementPerPost * posts;
    const ctr = 0.012; // 1.2% conservative
    const clicks = Math.round(impressions * ctr);
    const convRate = 0.025; // 2.5%
    const conversions = Math.round(clicks * convRate);
    const cpm = impressions > 0 ? (data.budget / impressions) * 1000 : 0;
    const cpc = clicks > 0 ? data.budget / clicks : 0;
    const aov = 40; // assumed avg order value USD
    const revenue = conversions * aov;
    const roi = data.budget > 0 ? ((revenue - data.budget) / data.budget) * 100 : 0;

    // AI explanation
    let explanation_ar = "";
    try {
      const system = `Write a 2-sentence Arabic explanation of campaign projections. No JSON, just text.`;
      const prompt = `Budget: $${data.budget}, Country: ${data.country || "—"}, Industry: ${data.industry || "—"}.
Influencer: ${inf.username}, followers ${followers}, ER ${er}%, posts ${posts}.
Projected reach ${reach}, impressions ${impressions}, engagement ${engagement}, conversions ${conversions}, ROI ${roi.toFixed(0)}%.
Explain briefly whether this is a strong fit and one risk.`;
      explanation_ar = (await runAi(system, prompt)).trim();
    } catch {}

    return {
      estimated_reach: reach,
      estimated_impressions: impressions,
      estimated_engagement: engagement,
      estimated_clicks: clicks,
      estimated_conversions: conversions,
      estimated_cpm: Number(cpm.toFixed(2)),
      estimated_cpc: Number(cpc.toFixed(2)),
      estimated_roi_pct: Number(roi.toFixed(1)),
      posts_count: posts,
      explanation_ar,
      assumptions: [
        "CTR افتراضي 1.2%",
        "معدل تحويل 2.5%",
        "متوسط قيمة الطلب $40",
        "تكلفة المنشور = 1% من عدد المتابعين (حد أدنى $50)",
        "الوصول يستند إلى avg_views الفعلي للمنشورات",
      ],
    };
  });

// ─── 4) Brand Safety (caption-based) ─────────────────────────────────────

export type BrandSafety = {
  score: number; // 0-100, higher = safer
  badge: "green" | "yellow" | "red";
  toxic_score: number;
  political_score: number;
  sensitive_score: number;
  flagged_phrases: string[];
  explanation_ar: string;
};

export const analyzeBrandSafety = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data }): Promise<BrandSafety> => {
    const inf = await loadInf(data.influencerId);
    const posts = Array.isArray(inf.recent_posts) ? inf.recent_posts : [];
    if (!posts.length) {
      return {
        score: 0, badge: "yellow",
        toxic_score: 0, political_score: 0, sensitive_score: 0,
        flagged_phrases: [],
        explanation_ar: "لا توجد منشورات متاحة لتحليل سلامة العلامة التجارية.",
      };
    }
    const captions = posts.slice(0, 25).map((p: any, i: number) =>
      `[${i + 1}] ${(p.caption || "").slice(0, 400)}`).join("\n");
    const bio = (inf.biography || "").slice(0, 400);

    const system = `You are a brand safety analyst. Output ONLY JSON:
{"toxic_score":0-100,"political_score":0-100,"sensitive_score":0-100,"flagged_phrases":string[0-5],"explanation_ar":string}
Scores represent RISK (higher = more risk). Analyze ONLY the provided captions/bio text. Flagged phrases are short verbatim excerpts. Explanation in Arabic, 2-3 sentences.`;
    const prompt = `Bio: ${bio}\n\nRecent post captions:\n${captions}`;
    const text = await runAi(system, prompt);
    const p = parseJson<any>(text, {});
    const tox = Math.max(0, Math.min(100, Math.round(Number(p.toxic_score) || 0)));
    const pol = Math.max(0, Math.min(100, Math.round(Number(p.political_score) || 0)));
    const sen = Math.max(0, Math.min(100, Math.round(Number(p.sensitive_score) || 0)));
    const risk = Math.round((tox * 0.5 + pol * 0.25 + sen * 0.25));
    const score = 100 - risk;
    const badge = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
    return {
      score, badge,
      toxic_score: tox, political_score: pol, sensitive_score: sen,
      flagged_phrases: Array.isArray(p.flagged_phrases) ? p.flagged_phrases.slice(0, 5) : [],
      explanation_ar: typeof p.explanation_ar === "string" ? p.explanation_ar
        : "تم احتساب النتيجة بناءً على تحليل نصوص المنشورات الأخيرة فقط.",
    };
  });
