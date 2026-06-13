// Compatibility scoring between an influencer and the user's submitted targeting filter.
import type { Targeting } from "@/routes/_app.analyze";

export type CompatibilityCriterion = { label: string; match: boolean; detail?: string };
export type CompatibilityResult = {
  hasTargeting: boolean;
  matchPct: number; // 0-100 (filter match)
  finalScore: number; // 0-100 combined with overall_score
  estimatedReach: number; // estimated served audience
  audienceServed: number; // audience size that matches the filter
  criteria: CompatibilityCriterion[];
  verdict: { label: string; color: string };
};

const norm = (s: any) => String(s || "").toLowerCase().trim();

export function getStoredTargeting(influencerId: string): Targeting | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`boom_targeting_${influencerId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveTargetingForInfluencer(influencerId: string, targeting: Targeting) {
  try { localStorage.setItem(`boom_targeting_${influencerId}`, JSON.stringify(targeting)); } catch {}
}

export function hasAnyTargeting(t: Targeting | null | undefined): boolean {
  if (!t) return false;
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

export const CRITERION_LABEL_AR: Record<string, string> = {
  country: "الدولة",
  age: "العمر",
  gender: "الجنس",
  niche: "المجال",
  city: "المدينة",
  interests: "الاهتمامات",
};

function topKey(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  let bestK = "", bestV = -1;
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v) || 0;
    if (n > bestV) { bestV = n; bestK = k; }
  }
  return bestK;
}

function matchScoreInAge(target: string[], ageGroups: any): number {
  if (!target.length) return 1;
  if (!ageGroups || typeof ageGroups !== "object") return 0;
  let sum = 0;
  for (const a of target) {
    const v = Number((ageGroups as any)[a]) || 0;
    sum += v;
  }
  // ageGroups values can be percent (0-100). Normalize to 0-1.
  return Math.min(1, sum / 100);
}

export function computeCompatibility(r: any, targeting: Targeting | null): CompatibilityResult {
  const overall = Math.min(100, Math.max(0, Number(r.overall_score || 0)));
  const followers = Number(r.followers || 0);
  const er = Number(r.engagement_rate || 0); // %
  const baseReach = followers * Math.max(0.005, er / 100);

  if (!targeting || !targeting.industry) {
    return {
      hasTargeting: false,
      matchPct: 0,
      finalScore: overall,
      estimatedReach: baseReach,
      audienceServed: baseReach,
      criteria: [],
      verdict: verdictFor(overall),
    };
  }

  const niches = [r.niche, r.sub_niche, r.strongest_niche_fit, ...(Array.isArray(r.top_niches) ? r.top_niches.map((n: any) => n?.name) : [])]
    .filter(Boolean).map(norm).join(" | ");
  const interestsList: string[] = (Array.isArray(r.interest_categories) ? r.interest_categories.map((c: any) => c?.category || c) : []).map(norm);
  const country = norm(r.audience_top_country || r.country);
  const cities = norm(r.audience_top_cities || r.city);
  const topGender = norm(topKey(r.audience_gender_split));

  const criteria: CompatibilityCriterion[] = [];
  const weights: { w: number; v: number }[] = [];

  // Industry / niche
  {
    const t = norm(targeting.industry);
    const sub = norm(targeting.subCategory);
    const both = `${t} ${sub}`.trim();
    const m = !!t && (niches.includes(t) || interestsList.some(i => i.includes(t) || t.includes(i)) || (!!sub && niches.includes(sub)));
    criteria.push({ label: "Industry / Niche", match: m, detail: `${targeting.industry}${sub ? " · " + targeting.subCategory : ""}` });
    weights.push({ w: 3, v: m ? 1 : (niches && t && both.split(" ").some(w => w && niches.includes(w)) ? 0.5 : 0) });
  }

  // Countries
  if (targeting.countries.length) {
    const m = targeting.countries.some(c => country.includes(norm(c)) || norm(c).includes(country.length > 2 ? country : "__"));
    criteria.push({ label: "Country", match: m, detail: targeting.countries.join(", ") });
    weights.push({ w: 2, v: m ? 1 : 0 });
  }

  // Cities
  if (targeting.cities && targeting.cities.trim()) {
    const wanted = targeting.cities.split(/[,،]/).map(c => norm(c)).filter(Boolean);
    const m = wanted.some(c => cities.includes(c));
    criteria.push({ label: "Cities", match: m, detail: targeting.cities });
    weights.push({ w: 1, v: m ? 1 : 0 });
  }

  // Gender
  if (targeting.gender) {
    const wanted = norm(targeting.gender);
    const m = wanted === "all" || (!!topGender && (topGender.includes(wanted) || wanted.includes(topGender)));
    criteria.push({ label: "Gender", match: m, detail: targeting.gender });
    weights.push({ w: 1.5, v: m ? 1 : 0 });
  }

  // Age
  if (targeting.ageRanges.length) {
    const score = matchScoreInAge(targeting.ageRanges, r.audience_age_groups);
    const m = score >= 0.3;
    criteria.push({ label: "Age Range", match: m, detail: targeting.ageRanges.join(", ") });
    weights.push({ w: 1.5, v: Math.min(1, score / 0.5) });
  }

  // Interests
  if (targeting.interests.length) {
    const t = targeting.interests.map(norm);
    const matched = t.filter(int => niches.includes(int) || interestsList.some(i => i.includes(int) || int.includes(i)));
    const m = matched.length > 0;
    criteria.push({ label: "Interests", match: m, detail: `${matched.length}/${t.length} ${targeting.interests.join(", ")}` });
    weights.push({ w: 2, v: matched.length / t.length });
  }

  const totalW = weights.reduce((s, x) => s + x.w, 0) || 1;
  const matchPct = Math.round((weights.reduce((s, x) => s + x.w * x.v, 0) / totalW) * 100);
  const finalScore = Math.round(overall * 0.4 + matchPct * 0.6);
  const audienceServed = Math.round(baseReach * (matchPct / 100));

  return {
    hasTargeting: true,
    matchPct,
    finalScore,
    estimatedReach: Math.round(baseReach),
    audienceServed,
    criteria,
    verdict: verdictFor(finalScore),
  };
}

function verdictFor(score: number) {
  if (score >= 80) return { label: "Excellent match", color: "#10b981" };
  if (score >= 60) return { label: "Good match", color: "#3b82f6" };
  if (score >= 40) return { label: "Average match", color: "#f59e0b" };
  return { label: "Poor match", color: "#ef4444" };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
