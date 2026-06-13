# Full Bilingual Pass — Report Titles + Compatibility AI

## Scope

Two areas remain Arabic-only in English mode (and vice-versa):

1. **AI Compatibility cards** — `verdict_ar`, `reason_ar`, `main_reason_ar`, `label_ar` are rendered as-is regardless of UI language.
2. **Report section titles** — ~60+ `HaTitle` children are hardcoded English strings (Engagement Rate Over Time, Top Hashtags, Audience Reachability, etc.) and stay English even in Arabic mode.

## Implementation

### A. Compatibility AI — add `_en` fields

`src/lib/brand-compat.functions.ts`
- Update the AI prompt schema: each criterion returns `label_ar` + `label_en`, `verdict_ar` + `verdict_en`, `reason_ar` + `reason_en`. Top-level: `verdict_ar/en`, `reason_ar/en`, `main_reason_ar/en`.
- Update validation/zod to require both. Keep `_ar` for backward compat (existing cached rows).
- Re-run is automatic on next compute; old cached rows fall back to `_ar`.

`src/components/report/sections.tsx` (CompatibilityScoreCard + CriterionCard, ~lines 540-660)
- Read `const lang = i18n.language` and pick `data.verdict_en ?? data.verdict_ar`, etc.

### B. Report Titles — i18n keys

`src/lib/i18n.ts`
- Add `report.titles.*` namespace with ~60 keys (e.g. `engagement_rate_over_time`, `top_hashtags`, `audience_reachability`, `growth_summary`, …). Both `en` and `ar` values.

`src/components/report/sections.tsx`
- Replace each `<HaTitle …>Hardcoded English</HaTitle>` with `<HaTitle …>{t("report.titles.<key>")}</HaTitle>`.
- Same treatment for sibling hardcoded labels in the same cards (Total Engagements, Highest Engagement Time, Best Format, etc.) where they appear next to a HaTitle.

### C. Verification

- Switch language toggle on a report page → every section title flips.
- Open compatibility card in EN → verdict/reason render in English; switch to AR → Arabic.
- Old reports (no `_en` from AI) still render gracefully using `_ar` fallback.

## Out of scope

- PDF export strings (separate pass if needed).
- Tooltips inside `MetricInfo` admin overlays.

## Technical Notes

- ~60 HaTitle replacements + ~15 sibling labels.
- ~7 AI prompt field additions + Zod schema update.
- 1 fallback chain in 2 React components.
- No DB migration (cached JSON in `compatibility_scores.payload` just gains optional fields).

Estimated edit volume: ~1 large i18n addition, ~80 line edits in `sections.tsx`, ~30 lines in `brand-compat.functions.ts`.

Confirm to proceed and I'll ship it.
