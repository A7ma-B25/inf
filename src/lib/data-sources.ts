// Centralized metadata for every report field shown to admins.
// Drives the on-screen MetricInfo popover and the PDF methodology appendix.

export type Reliability = 1 | 2 | 3 | 4 | 5;

export interface FieldMeta {
  field: string;
  label: string;
  formula: string;
  source: string;
  reliability: Reliability;
  note?: string;
}

export const FIELD_REGISTRY: Record<string, FieldMeta> = {
  followers: {
    field: "followers",
    label: "Followers",
    formula: "Direct value from profile",
    source: "Apify — instagram-profile-scraper",
    reliability: 5,
  },
  engagement_rate: {
    field: "engagement_rate",
    label: "Engagement Rate",
    formula: "Avg(likes + comments) / followers × 100",
    source: "Apify — last 12 posts",
    reliability: 4,
    note: "Average (not median). Saves/shares not included (require OAuth).",
  },
  avg_likes: {
    field: "avg_likes",
    label: "Average Likes",
    formula: "sum(likes) / count(posts)",
    source: "Apify — last 12 posts",
    reliability: 5,
  },
  avg_comments: {
    field: "avg_comments",
    label: "Average Comments",
    formula: "sum(comments) / count(posts)",
    source: "Apify — last 12 posts",
    reliability: 5,
  },
  avg_views: {
    field: "avg_views",
    label: "Average Views",
    formula: "sum(views) / count(video posts)",
    source: "Apify — video posts only",
    reliability: 4,
  },
  avg_reach: {
    field: "avg_reach",
    label: "Average Reach",
    formula: "followers × 0.25",
    source: "Estimated — Meta Insights API required for actual value",
    reliability: 2,
  },
  avg_impressions: {
    field: "avg_impressions",
    label: "Average Impressions",
    formula: "reach × 1.3",
    source: "Estimated — Meta Insights API required for actual value",
    reliability: 2,
  },
  total_reach: {
    field: "total_reach",
    label: "Total Reach",
    formula: "avg_reach × posts_count",
    source: "Estimated",
    reliability: 2,
  },
  audience_top_country: {
    field: "audience_top_country",
    label: "Top Audience Country",
    formula: "Highest-share country from audience_country_split",
    source: "AI inference + comment-language statistical model",
    reliability: 3,
    note: "Distribution is estimated. Real demographics require Meta Insights API (OAuth).",
  },
  audience_country_split: {
    field: "audience_country_split",
    label: "Audience Country Breakdown",
    formula: "0.6 × AI inference (bio + comments + mentions) + 0.4 × language detection on ≥10 real comments, mapped via language→country weights, biased +15% toward creator's country, top 5 normalized to 100%",
    source: "Gemini / Lovable AI + Apify comments",
    reliability: 3,
    note: "Estimate. For 100% accurate values use Meta Graph API audience_country insight.",
  },
  audience_city_split: {
    field: "audience_city_split",
    label: "Audience City Breakdown",
    formula: "AI inference from bio + comments + hashtags (top 5 cities, ~100%)",
    source: "Gemini / Lovable AI",
    reliability: 2,
    note: "City-level demographics require Meta Insights API for real values.",
  },
  audience_age_groups: {
    field: "audience_age_groups",
    label: "Audience Age Groups",
    formula: "AI inference (no demographic API access)",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  audience_gender_split: {
    field: "audience_gender_split",
    label: "Audience Gender Split",
    formula: "AI inference from comment patterns",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  fake_followers_score: {
    field: "fake_followers_score",
    label: "Fake Followers Score",
    formula: "AI heuristic on engagement vs followers ratio",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  audience_authenticity_score: {
    field: "audience_authenticity_score",
    label: "Audience Authenticity",
    formula: "100 − fake_followers_score, validated by engagement-to-follower distribution",
    source: "Gemini / Lovable AI + Apify engagement signals",
    reliability: 3,
    note: "Estimate. Exact value requires Meta Insights API (OAuth).",
  },
  audience_quality_score: {
    field: "audience_quality_score",
    label: "Audience Quality Score",
    formula: "Weighted blend of authenticity, engagement consistency, and audience activity",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  engaged_audience: {
    field: "engaged_audience",
    label: "Engaged Audience",
    formula: "min(100, engagement_rate × 10) — share of followers actively engaging",
    source: "Derived from engagement_rate (Apify posts)",
    reliability: 3,
  },
  reachability: {
    field: "reachability",
    label: "Reachability",
    formula: "Bucket from audience_quality_score: ≥80 Good, ≥60 Average, else Low",
    source: "Derived from audience_quality_score",
    reliability: 3,
  },
  overall_score: {
    field: "overall_score",
    label: "Overall Score",
    formula: "Weighted blend of ER, growth, audience quality, content",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  growth_rate: {
    field: "growth_rate",
    label: "Growth Rate",
    formula: "(followers_now − followers_prev) / followers_prev × 100",
    source: "tracked_snapshots — requires prior snapshot",
    reliability: 3,
  },
  recent_posts: {
    field: "recent_posts",
    label: "Recent Posts",
    formula: "Direct scrape",
    source: "Apify — instagram-scraper (last 12)",
    reliability: 5,
  },
  top_hashtags: {
    field: "top_hashtags",
    label: "Top Hashtags",
    formula: "Frequency count across recent post captions",
    source: "Derived from Apify posts",
    reliability: 5,
  },
  top_mentions: {
    field: "top_mentions",
    label: "Top Mentions",
    formula: "Frequency count of @mentions in recent captions",
    source: "Derived from Apify posts",
    reliability: 5,
  },
  best_time_to_post: {
    field: "best_time_to_post",
    label: "Best Time to Post",
    formula: "Engagement aggregated by hour/day across recent posts",
    source: "Derived from Apify posts",
    reliability: 3,
  },
  ai_insights: {
    field: "ai_insights",
    label: "AI Insights",
    formula: "LLM analysis of profile + posts + audience",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  brand_safety_score: {
    field: "brand_safety_score",
    label: "Brand Safety Score",
    formula: "AI analysis of caption sentiment, controversies",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  avg_shares: {
    field: "avg_shares",
    label: "Average Shares",
    formula: "sum(shares) / count(posts) — when available from Apify",
    source: "Apify posts (when shares exposed); estimated otherwise",
    reliability: 3,
  },
  avg_saves: {
    field: "avg_saves",
    label: "Average Saves",
    formula: "sum(saves) / count(posts) — when available from Apify",
    source: "Apify posts (when saves exposed); estimated otherwise",
    reliability: 3,
  },
  posts_count: {
    field: "posts_count",
    label: "Posts Count",
    formula: "Direct value from profile",
    source: "Apify — instagram-profile-scraper",
    reliability: 5,
  },
  follower_growth_30d: {
    field: "follower_growth_30d",
    label: "30-day Follower Growth",
    formula: "(followers_now − followers_30d_ago) / followers_30d_ago × 100",
    source: "tracked_snapshots (requires prior snapshot, else 0)",
    reliability: 3,
  },
  net_growth: {
    field: "net_growth",
    label: "Net Growth",
    formula: "new_followers − unfollowers across the period",
    source: "Derived from tracked_snapshots",
    reliability: 3,
  },
  trust_score: {
    field: "trust_score",
    label: "Trust Score",
    formula: "AI heuristic on tone, transparency, sponsored disclosures",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  recommendation_power_score: {
    field: "recommendation_power_score",
    label: "Recommendation Power",
    formula: "AI score: persuasion language × engagement quality",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  ad_reusability_score: {
    field: "ad_reusability_score",
    label: "Ad Reusability",
    formula: "AI score: branded-content fit and asset repurposability",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  audience_purchase_intent_score: {
    field: "audience_purchase_intent_score",
    label: "Audience Purchase Intent",
    formula: "AI inference from comment intent + niche category",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  conversion_intent_score: {
    field: "conversion_intent_score",
    label: "Conversion Intent",
    formula: "AI score combining purchase intent and CTA response signals",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  creator_brand_affinity: {
    field: "creator_brand_affinity",
    label: "Creator Brand Affinity",
    formula: "AI extraction of brands mentioned/tagged by creator",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  follower_brand_affinity: {
    field: "follower_brand_affinity",
    label: "Follower Brand Affinity",
    formula: "AI inference of brands followers also follow/mention",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  top_performing_format: {
    field: "top_performing_format",
    label: "Best Format",
    formula: "Format (Reel/Image/Carousel) with highest median ER",
    source: "Derived from Apify posts",
    reliability: 4,
  },
  top_performing_hook_type: {
    field: "top_performing_hook_type",
    label: "Best Hook",
    formula: "Hook type with highest median ER from recent posts",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  top_performing_content_style: {
    field: "top_performing_content_style",
    label: "Best Style",
    formula: "Style (Educational/Entertainment/…) with highest median ER",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  posting_consistency: {
    field: "posting_consistency",
    label: "Posting Consistency",
    formula: "Stable / Irregular bucket from posting cadence variance",
    source: "Derived from Apify post timestamps",
    reliability: 4,
  },
  top_niches: {
    field: "top_niches",
    label: "Top Content Pillars",
    formula: "Top topics by frequency + AI categorization",
    source: "Gemini / Lovable AI + recent captions",
    reliability: 3,
  },
  audience_languages: {
    field: "audience_languages",
    label: "Audience Languages",
    formula: "Language detection on real comments + AI inference",
    source: "Apify comments + Gemini / Lovable AI",
    reliability: 3,
  },
  interest_categories: {
    field: "interest_categories",
    label: "Audience Interests",
    formula: "AI inference from comment topics + creator niche",
    source: "Gemini / Lovable AI",
    reliability: 2,
  },
  suspicious_engagement_score: {
    field: "suspicious_engagement_score",
    label: "Suspicious Engagement",
    formula: "AI heuristic on bot-like comment patterns and like spikes",
    source: "Gemini / Lovable AI",
    reliability: 3,
  },
  engagement_growth: {
    field: "engagement_growth",
    label: "Engagement Growth",
    formula: "(ER_now − ER_prev) / ER_prev × 100",
    source: "Derived from tracked_snapshots",
    reliability: 3,
  },
};

export function getFieldMeta(field: string): FieldMeta | null {
  return FIELD_REGISTRY[field] || null;
}

export function reliabilityLabel(r: Reliability): string {
  return ["", "ضعيفة جداً", "تقديرية", "متوسطة", "عالية", "مؤكدة"][r];
}

export function reliabilityColor(r: Reliability): string {
  return ["", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#059669"][r];
}
