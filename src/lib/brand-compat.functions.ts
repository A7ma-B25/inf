import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/lovable-ai.server";

const TargetingSchema = z.object({
  industry: z.string().default(""),
  subCategory: z.string().default(""),
  countries: z.array(z.string()).default([]),
  cities: z.string().default(""),
  ageRanges: z.array(z.string()).default([]),
  gender: z.string().default(""),
  interests: z.array(z.string()).default([]),
});

const InputSchema = z.object({
  influencerId: z.string().uuid(),
  targeting: TargetingSchema,
});

export type CriterionScore = {
  key: string;            // country | age | gender | niche | city | interests
  score: number;          // 0-100
  label_ar: string;       // e.g. الدولة
  label_en: string;       // e.g. Country
  verdict_ar: string;     // توافق ممتاز | توافق جيد | توافق متوسط | توافق ضعيف
  verdict_en: string;     // Excellent match | Good match | Fair match | Weak match
  reason_ar: string;      // 1-sentence explanation (Arabic)
  reason_en: string;      // 1-sentence explanation (English)
};

export type BrandCompatResult = {
  overall_score: number;
  verdict_ar: string;
  verdict_en: string;
  verdict_short_ar: string;
  verdict_short_en: string;
  reason_ar: string;
  reason_en: string;
  main_reason_ar: string;
  main_reason_en: string;
  matched_criteria: string[];
  failed_criteria: string[];
  criterion_scores: CriterionScore[];
  no_targeting: boolean;
};

const ALL_CRITERIA = ["country", "age", "gender", "niche", "city", "interests"] as const;

function hasAnyTargeting(t: z.infer<typeof TargetingSchema>) {
  return !!(
    t.industry ||
    t.subCategory ||
    (t.countries && t.countries.length) ||
    (t.cities && t.cities.trim()) ||
    (t.ageRanges && t.ageRanges.length) ||
    t.gender ||
    (t.interests && t.interests.length)
  );
}

const LABEL_AR: Record<string, string> = {
  country: "الدولة", age: "العمر", gender: "الجنس",
  niche: "المجال", city: "المدينة", interests: "الاهتمامات",
};
const LABEL_EN: Record<string, string> = {
  country: "Country", age: "Age", gender: "Gender",
  niche: "Niche", city: "City", interests: "Interests",
};

const SYSTEM_PROMPT = `You are a brand-influencer matching expert. Return ONLY valid JSON, no markdown, no code fences. Output exactly this shape:
{
  "overall_score": number (0-100),
  "verdict_ar": "توافق ممتاز" | "توافق جيد" | "توافق متوسط" | "توافق ضعيف",
  "verdict_en": "Excellent match" | "Good match" | "Fair match" | "Weak match",
  "verdict_short_ar": "موصى به" | "موصى به بحذر" | "غير موصى به",
  "verdict_short_en": "Recommended" | "Recommended with caution" | "Not recommended",
  "reason_ar": string (2-3 sentences in Arabic explaining WHY this score, naming which criteria matched and which did not),
  "reason_en": string (SAME explanation as reason_ar but in natural English — same facts, same percentages),
  "main_reason_ar": string (one short Arabic sentence: the SINGLE most important reason the score is what it is),
  "main_reason_en": string (the same single most important reason in natural English),
  "matched_criteria": string[] (subset of: country, age, gender, niche, city, interests — only criteria the brand actually provided),
  "failed_criteria": string[] (subset of: country, age, gender, niche, city, interests — only criteria the brand actually provided),
  "criterion_scores": [
    {
      "key": "country" | "age" | "gender" | "niche" | "city" | "interests",
      "score": number (0-100),
      "verdict_ar": "توافق ممتاز" | "توافق جيد" | "توافق متوسط" | "توافق ضعيف",
      "verdict_en": "Excellent match" | "Good match" | "Fair match" | "Weak match",
      "reason_ar": string (1 short Arabic sentence with concrete data like percentages or place names),
      "reason_en": string (the SAME sentence rendered in natural English, citing the same percentages / place names)
    }
  ]
}
Score rules:
- ALL criteria match well → 80-100 → "توافق ممتاز" / "موصى به" / "Excellent match" / "Recommended"
- MOST criteria match → 60-79 → "توافق جيد" / "موصى به" / "Good match" / "Recommended"
- SOME criteria match → 40-59 → "توافق متوسط" / "موصى به بحذر" / "Fair match" / "Recommended with caution"
- FEW or NO criteria match → 0-39 → "توافق ضعيف" / "غير موصى به" / "Weak match" / "Not recommended"
Per-criterion score must reflect HOW WELL the influencer matches that filter. Use the influencer audience data to back each reason with a concrete fact.
Only include criteria the brand actually provided (skip "(not set)" filters).
One filter failing heavily should pull the overall score down. The overall score must reflect ALL filters combined.
Always provide BOTH the _ar and _en variants for every text field. Never leave one empty.`;

function buildPrompt(inf: any, t: z.infer<typeof TargetingSchema>) {
  const infSummary = {
    niche: inf.niche,
    sub_niche: inf.sub_niche,
    strongest_niche_fit: inf.strongest_niche_fit,
    top_niches: inf.top_niches,
    interest_categories: inf.interest_categories,
    audience_top_country: inf.audience_top_country,
    audience_top_cities: inf.audience_top_cities,
    audience_gender_split: inf.audience_gender_split,
    audience_age_groups: inf.audience_age_groups,
    creator_style: inf.creator_style,
    biography: inf.biography,
    country: inf.country,
    city: inf.city,
  };
  return `Calculate a Brand Compatibility Score (0-100) reflecting how well this influencer matches ALL brand criteria COMBINED, plus individual per-criterion scores.

Brand Criteria:
- Industry: ${t.industry || "(not set)"}
- Sub-Category: ${t.subCategory || "(not set)"}
- Target Countries: ${t.countries.join(", ") || "(not set)"}
- Target Cities: ${t.cities || "(not set)"}
- Target Age Range: ${t.ageRanges.join(", ") || "(not set)"}
- Target Gender: ${t.gender || "(not set)"}
- Target Interests: ${t.interests.join(", ") || "(not set)"}

Matching logic:
1. country: influencer audience top countries vs Target Countries
2. age: influencer audience age groups vs Target Age Range
3. gender: compare audience_gender_split numerically to Target Gender. If Target Gender is "All" or empty, skip. If target is "Female", score = female_share %; if "Male", score = male_share %. >=70% match → 80-100, 50-69% → 50-79, <50% → 0-49. Cite the actual percentages in reason_ar.
4. niche: influencer niche/content style vs Industry/Sub-Category
5. city: influencer audience cities vs Target Cities
6. interests: influencer content interests vs Target Interests

Only score the criteria the brand actually provided (skip "(not set)").

Influencer data:
${JSON.stringify(infSummary).slice(0, 8000)}

Return ONLY the JSON object.`;
}

function fallbackCriterionScores(targeting: z.infer<typeof TargetingSchema>): CriterionScore[] {
  const out: CriterionScore[] = [];
  const push = (key: string) => out.push({
    key, score: 0,
    label_ar: LABEL_AR[key] || key,
    label_en: LABEL_EN[key] || key,
    verdict_ar: "توافق ضعيف",
    verdict_en: "Weak match",
    reason_ar: "لا تتوفر بيانات كافية للمقارنة.",
    reason_en: "Not enough data to compare.",
  });
  if (targeting.countries.length) push("country");
  if (targeting.ageRanges.length) push("age");
  if (targeting.gender) push("gender");
  if (targeting.industry || targeting.subCategory) push("niche");
  if (targeting.cities && targeting.cities.trim()) push("city");
  if (targeting.interests.length) push("interests");
  return out;
}

export const computeBrandCompat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<BrandCompatResult> => {
    const { data: inf, error } = await supabaseAdmin
      .from("influencers")
      .select("*")
      .eq("id", data.influencerId)
      .maybeSingle();
    if (error || !inf) throw new Error("Influencer not found");

    // No targeting: fall back to quality-only score
    if (!hasAnyTargeting(data.targeting)) {
      const score = Math.round(Number(inf.overall_score || 0));
      return {
        overall_score: score,
        verdict_ar: verdictAr(score),
        verdict_en: verdictEn(score),
        verdict_short_ar: verdictShortAr(score),
        verdict_short_en: verdictShortEn(score),
        reason_ar: "لم يتم إدخال بيانات استهداف البراند. النتيجة تعكس الجودة العامة للإنفلونسر فقط (التفاعل، الأصالة، جودة المحتوى).",
        reason_en: "No brand targeting data was provided. The score reflects only the influencer's overall quality (engagement, authenticity, content quality).",
        main_reason_ar: "النتيجة عامة لعدم إدخال معايير البراند.",
        main_reason_en: "Generic score: no brand criteria were provided.",
        matched_criteria: [],
        failed_criteria: [],
        criterion_scores: [],
        no_targeting: true,
      };
    }

    // Resolve active AI provider from platform settings, falling back to Lovable AI.
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("active_ai_provider_id")
      .limit(1)
      .maybeSingle();

    const { data: activeProvider } = settings?.active_ai_provider_id
      ? await supabaseAdmin
          .from("ai_providers")
          .select("*")
          .eq("id", settings.active_ai_provider_id)
          .eq("is_enabled", true)
          .maybeSingle()
      : { data: null as any };

    const userPrompt = buildPrompt(inf, data.targeting);
    let text = "";

    if (activeProvider?.api_key && activeProvider?.provider && activeProvider?.model) {
      try {
        const { callAiProvider } = await import("@/lib/ai-multi.server");
        text = await callAiProvider({
          provider: activeProvider.provider as any,
          model: activeProvider.model,
          api_key: activeProvider.api_key,
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
        });
      } catch (e) {
        console.warn("[brand-compat] active provider failed, falling back to Lovable AI:", e);
        text = "";
      }
    }

    if (!text) {
      const lovableApiKey = process.env.LOVABLE_API_KEY;
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");
      const gateway = createLovableAiGatewayProvider(lovableApiKey);
      const res = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });
      text = res.text;
    }

    let parsed: any = {};
    try {
      const cleaned = text.replace(/```json\s*|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // fall back
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_score) || 0)));
    const matched = Array.isArray(parsed.matched_criteria)
      ? parsed.matched_criteria.filter((c: string) => (ALL_CRITERIA as readonly string[]).includes(c))
      : [];
    const failed = Array.isArray(parsed.failed_criteria)
      ? parsed.failed_criteria.filter((c: string) => (ALL_CRITERIA as readonly string[]).includes(c))
      : [];

    const rawCs: any[] = Array.isArray(parsed.criterion_scores) ? parsed.criterion_scores : [];
    const criterion_scores: CriterionScore[] = rawCs
      .filter((c) => c && (ALL_CRITERIA as readonly string[]).includes(c.key))
      .map((c) => ({
        key: c.key,
        score: Math.max(0, Math.min(100, Math.round(Number(c.score) || 0))),
        label_ar: LABEL_AR[c.key] || c.key,
        label_en: LABEL_EN[c.key] || c.key,
        verdict_ar: typeof c.verdict_ar === "string" && c.verdict_ar ? c.verdict_ar : verdictAr(Number(c.score) || 0),
        verdict_en: typeof c.verdict_en === "string" && c.verdict_en ? c.verdict_en : verdictEn(Number(c.score) || 0),
        reason_ar: typeof c.reason_ar === "string" && c.reason_ar.trim() ? c.reason_ar : "—",
        reason_en: typeof c.reason_en === "string" && c.reason_en.trim() ? c.reason_en : (typeof c.reason_ar === "string" ? c.reason_ar : "—"),
      }));

    return {
      overall_score: score,
      verdict_ar: typeof parsed.verdict_ar === "string" ? parsed.verdict_ar : verdictAr(score),
      verdict_en: typeof parsed.verdict_en === "string" && parsed.verdict_en ? parsed.verdict_en : verdictEn(score),
      verdict_short_ar: typeof parsed.verdict_short_ar === "string" ? parsed.verdict_short_ar : verdictShortAr(score),
      verdict_short_en: typeof parsed.verdict_short_en === "string" && parsed.verdict_short_en ? parsed.verdict_short_en : verdictShortEn(score),
      reason_ar: typeof parsed.reason_ar === "string" && parsed.reason_ar.trim()
        ? parsed.reason_ar
        : "تم احتساب النتيجة بناءً على معايير الاستهداف المُدخلة.",
      reason_en: typeof parsed.reason_en === "string" && parsed.reason_en.trim()
        ? parsed.reason_en
        : "Score calculated based on the provided targeting criteria.",
      main_reason_ar: typeof parsed.main_reason_ar === "string" && parsed.main_reason_ar.trim()
        ? parsed.main_reason_ar
        : (failed.length ? `أهم سبب ضعف التوافق: ${failed.map((f: string) => LABEL_AR[f] || f).join("، ")}.` : "تتوافق معظم المعايير مع البراند."),
      main_reason_en: typeof parsed.main_reason_en === "string" && parsed.main_reason_en.trim()
        ? parsed.main_reason_en
        : (failed.length ? `Top reason for the weak match: ${failed.map((f: string) => LABEL_EN[f] || f).join(", ")}.` : "Most criteria match the brand well."),
      matched_criteria: matched,
      failed_criteria: failed,
      criterion_scores: criterion_scores.length ? criterion_scores : fallbackCriterionScores(data.targeting),
      no_targeting: false,
    };
  });

function verdictAr(score: number): string {
  if (score >= 80) return "توافق ممتاز";
  if (score >= 60) return "توافق جيد";
  if (score >= 40) return "توافق متوسط";
  return "توافق ضعيف";
}

function verdictShortAr(score: number): string {
  if (score >= 60) return "موصى به";
  if (score >= 40) return "موصى به بحذر";
  return "غير موصى به";
}

function verdictEn(score: number): string {
  if (score >= 80) return "Excellent match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Fair match";
  return "Weak match";
}

function verdictShortEn(score: number): string {
  if (score >= 60) return "Recommended";
  if (score >= 40) return "Recommended with caution";
  return "Not recommended";
}
