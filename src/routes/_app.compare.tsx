import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nfmt, pct, imgProxy, platformBadgeClass } from "@/lib/format";
import { Trophy, Download, CheckCircle2, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";


const search = z.object({ ids: z.string().optional() });
export const Route = createFileRoute("/_app/compare")({
  component: ComparePage,
  validateSearch: (s) => search.parse(s),
});

function ComparePage() {
  const { t } = useTranslation();
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const idList = (ids || "").split(",").filter(Boolean);
  const [showSelector, setShowSelector] = useState(idList.length < 2);

  const { data: allRows = [] } = useQuery({
    queryKey: ["compare-all"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const rows = useMemo(
    () => (idList.length ? allRows.filter((r) => idList.includes(r.id)) : []),
    [allRows, ids]
  );

  if (showSelector || rows.length < 2) {
    return (
      <SelectionScreen
        all={allRows}
        initialSelected={idList}
        onCompare={(sel) => {
          navigate({ to: "/compare", search: { ids: sel.join(",") } as any });
          setShowSelector(false);
        }}
      />
    );
  }

  const radarData = [
    { axis: "ER", ...Object.fromEntries(rows.map(r => [r.username, Number(r.engagement_rate) * 10])) },
    { axis: "Quality", ...Object.fromEntries(rows.map(r => [r.username, r.audience_quality_score])) },
    { axis: "Trust", ...Object.fromEntries(rows.map(r => [r.username, r.trust_score])) },
    { axis: "Growth", ...Object.fromEntries(rows.map(r => [r.username, Number(r.follower_growth_30d) * 10])) },
    { axis: "Brand Safety", ...Object.fromEntries(rows.map(r => [r.username, r.brand_safety_score])) },
    { axis: "Conversion", ...Object.fromEntries(rows.map(r => [r.username, r.conversion_intent_score])) },
  ];

  const colors = ["hsl(295 70% 55%)", "hsl(155 65% 50%)", "hsl(25 80% 60%)", "hsl(220 70% 55%)"];

  const rowsMetric = (label: string, key: string, fmt: (v: any) => string, higherBetter = true) => {
    const vals = rows.map(r => Number((r as any)[key]) || 0);
    const best = higherBetter ? Math.max(...vals) : Math.min(...vals);
    return (
      <tr className="border-t border-border">
        <td className="py-2 font-medium text-muted-foreground">{label}</td>
        {rows.map((r, i) => {
          const isBest = vals[i] === best && best > 0;
          return (
            <td
              key={r.id}
              className={isBest ? "py-2 text-center bg-[#d1fae5] text-[#065f46] font-semibold rounded" : "py-2 text-center"}
            >
              {fmt((r as any)[key])}
              {isBest && <Trophy className="inline h-3 w-3 ml-1 text-[#10b981]" />}
            </td>
          );
        })}
      </tr>
    );
  };

  const exportComparisonPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Influencer Comparison", 14, 16);
      doc.setFontSize(10);
      let y = 28;
      rows.forEach((r, i) => {
        doc.text(`${i + 1}. @${r.username} — ${r.influencer_name}`, 14, y);
        doc.text(`Followers: ${nfmt(r.followers)} | ER: ${pct(r.engagement_rate)} | Score: ${r.overall_score || 0}/100`, 14, y + 6);
        y += 16;
      });
      const winner = rows.slice().sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0];
      doc.setFontSize(12);
      doc.text(`Recommendation: @${winner?.username}`, 14, y + 4);
      doc.save("comparison.pdf");
      toast.success("Comparison PDF exported");
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message || "error"}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSelector(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("nav.compare")}</h1>
            <p className="text-muted-foreground mt-1">{rows.length}</p>
          </div>
        </div>
        <button
          onClick={exportComparisonPdf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ background: "#461bb6" }}
        >
          <Download className="h-4 w-4" /> Export Comparison PDF
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map((r, i) => (
          <div key={r.id} className="glass-card rounded-xl p-4 text-center">
            <img src={imgProxy(r.profile_pic_url) || "https://i.pravatar.cc/100"} alt="" className="h-16 w-16 rounded-full mx-auto ring-2 object-cover" style={{ ringColor: colors[i] } as any} />
            <div className="font-semibold mt-2 text-sm">{r.influencer_name}</div>
            <div className="text-xs text-muted-foreground">@{r.username}</div>
          </div>
        ))}
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-semibold mb-3">Multi-axis Comparison</h2>
        <div className="h-80">
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" />
              <PolarRadiusAxis />
              {rows.map((r, i) => (
                <Radar key={r.id} name={r.username || ""} dataKey={r.username || ""} stroke={colors[i]} fill={colors[i]} fillOpacity={0.2} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-card rounded-xl p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Detailed Comparison</h2>
        <table className="w-full text-sm">
          <thead>
            <tr><th></th>{rows.map(r => <th key={r.id} className="py-2 text-center">@{r.username}</th>)}</tr>
          </thead>
          <tbody>
            <tr><td colSpan={rows.length + 1} className="pt-3 text-xs font-bold uppercase text-muted-foreground">Basic</td></tr>
            {rowsMetric("Followers", "followers", v => nfmt(v))}
            {rowsMetric("Engagement Rate", "engagement_rate", v => pct(v))}
            {rowsMetric("Overall Score", "overall_score", v => `${v}/100`)}
            <tr><td colSpan={rows.length + 1} className="pt-3 text-xs font-bold uppercase text-muted-foreground">Quality</td></tr>
            {rowsMetric("Audience Quality", "audience_quality_score", v => `${v}/100`)}
            {rowsMetric("Trust Score", "trust_score", v => `${v}/100`)}
            {rowsMetric("Brand Safety", "brand_safety_score", v => `${v}/100`)}
            <tr><td colSpan={rows.length + 1} className="pt-3 text-xs font-bold uppercase text-muted-foreground">Growth</td></tr>
            {rowsMetric("30D Growth", "follower_growth_30d", v => pct(v))}
            {rowsMetric("90D Growth", "follower_growth_90d", v => pct(v))}
            <tr><td colSpan={rows.length + 1} className="pt-3 text-xs font-bold uppercase text-muted-foreground">Pricing</td></tr>
            {rowsMetric("Avg Collab", "avg_collab_price", v => `$${nfmt(v)}`, false)}
            {rowsMetric("Reel Estimated", "reel_price_estimated", v => `$${nfmt(v)}`, false)}
          </tbody>
        </table>
      </section>

      {(() => {
        const winner = rows.slice().sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0];
        if (!winner) return null;
        return (
          <section className="rounded-xl p-6 border-2 border-[#461bb6] bg-gradient-to-br from-[#f5f5f5] to-white">
            <div className="text-[11px] uppercase tracking-wider text-[#461bb6] font-bold mb-2">🏆 Our Recommendation</div>
            <div className="flex flex-wrap items-center gap-4">
              <img src={imgProxy(winner.profile_pic_url) || "https://i.pravatar.cc/100"} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#461bb6]" />
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold text-lg text-foreground">{winner.influencer_name} <span className="text-[#461bb6]">@{winner.username}</span></div>
                <div className="text-sm text-muted-foreground mt-1">
                  Best Pick with an overall score of <span className="font-semibold text-[#461bb6]">{winner.overall_score || 0}/100</span> — strong balance of engagement ({pct(winner.engagement_rate)}), audience quality ({winner.audience_quality_score || 0}/100), and brand safety ({winner.brand_safety_score || 0}/100).
                </div>
              </div>
              <Link to="/report/$id" params={{ id: winner.id }} className="px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90" style={{ background: "#461bb6" }}>
                View Profile
              </Link>
            </div>
          </section>
        );
      })()}
    </div>
  );
}

function SelectionScreen({
  all,
  initialSelected,
  onCompare,
}: {
  all: any[];
  initialSelected: string[];
  onCompare: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 4) {
        toast.error("Max 4 selections");
        return s;
      }
      return [...s, id];
    });
  };

  const canCompare = selected.length >= 2;

  if (all.length === 0) {
    return (
      <div className="text-center py-20 max-w-7xl mx-auto">
        <p className="text-muted-foreground">No influencers available.</p>
        <Link to="/analyze" className="text-primary underline">Analyze your first profile</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("compare.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("compare.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {all.map((r) => {
          const isSel = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={cn(
                "text-left relative rounded-xl p-4 bg-card border-2 transition-all",
                isSel
                  ? "border-[#461bb6] shadow-md"
                  : "border-border hover:border-[#461bb6]/60"
              )}
            >
              {isSel && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#461bb6] text-white grid place-content-center shadow">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <img
                  src={imgProxy(r.profile_pic_url) || "https://i.pravatar.cc/100"}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.influencer_name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
                  <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-xs", platformBadgeClass(r.platform))}>
                    {r.platform}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                <span className="px-2 py-1 rounded bg-muted">{nfmt(r.followers)} followers</span>
                <span className="px-2 py-1 rounded bg-muted">{pct(r.engagement_rate)} ER</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-30 px-4">
        <div className="max-w-3xl mx-auto bg-card border border-border shadow-xl rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <div className="text-sm font-medium flex-1 min-w-[120px]">
            {selected.length} of 4 selected
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear Selection
            </button>
          )}
          <button
            disabled={!canCompare}
            onClick={() => onCompare(selected)}
            className={cn(
              "px-6 py-2.5 rounded-md text-white text-sm font-medium transition-colors",
              canCompare ? "bg-[#461bb6] hover:bg-[#3a16a0]" : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Compare Now
          </button>
        </div>
      </div>
    </div>
  );
}
