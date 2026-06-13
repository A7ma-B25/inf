import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nfmt, pct, imgProxy, platformBadgeClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/top-lists")({ component: TopLists });

type Tab = "All" | "Instagram" | "TikTok" | "By Score";
type SortKey = "rank" | "followers" | "engagement_rate" | "audience_quality_score" | "brand_safety_score" | "overall_score";

const COLS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "rank", label: "Rank" },
  { key: "followers", label: "Followers", numeric: true },
  { key: "engagement_rate", label: "ER", numeric: true },
  { key: "audience_quality_score", label: "Quality Score", numeric: true },
  { key: "brand_safety_score", label: "Brand Safety", numeric: true },
  { key: "overall_score", label: "Overall Score", numeric: true },
];

function TopLists() {
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<Tab>("All");
  const [sortKey, setSortKey] = useState<SortKey>("overall_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: rows = [] } = useQuery({
    queryKey: ["top-lists"],
    queryFn: async () => {
      const { data } = await supabase
        .from("influencers")
        .select("id, influencer_name, username, platform, profile_pic_url, followers, engagement_rate, audience_quality_score, brand_safety_score, overall_score")
        .order("overall_score", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let r = rows;
    if (tab === "Instagram") r = r.filter((x: any) => (x.platform || "").toLowerCase() === "instagram");
    else if (tab === "TikTok") r = r.filter((x: any) => (x.platform || "").toLowerCase() === "tiktok");

    const key = tab === "By Score" ? "overall_score" : sortKey;
    const dir = tab === "By Score" ? "desc" : sortDir;
    const sorted = [...r].sort((a: any, b: any) => {
      if (key === "rank") return 0;
      const av = Number(a[key] || 0), bv = Number(b[key] || 0);
      return dir === "desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [rows, tab, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === "rank") return;
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (k === "rank") return null;
    if (sortKey !== k) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown className="inline h-3 w-3 ml-1" />
      : <ArrowUp className="inline h-3 w-3 ml-1" />;
  };

  const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tr("topLists.title")}</h1>
        <p className="text-muted-foreground mt-1">{tr("topLists.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-md p-1 w-fit">
        {(["All", "Instagram", "TikTok", "By Score"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("text-sm px-4 py-1.5 rounded transition-colors",
              tab === t ? "bg-card text-primary font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No influencers analyzed yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium cursor-pointer" onClick={() => toggleSort("rank")}>Rank<SortIcon k="rank" /></th>
                  <th className="text-left py-2 font-medium">Photo</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Platform</th>
                  <th className="text-right py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("followers")}>Followers<SortIcon k="followers" /></th>
                  <th className="text-right py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("engagement_rate")}>ER<SortIcon k="engagement_rate" /></th>
                  <th className="text-right py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("audience_quality_score")}>Quality<SortIcon k="audience_quality_score" /></th>
                  <th className="text-right py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("brand_safety_score")}>Brand Safety<SortIcon k="brand_safety_score" /></th>
                  <th className="text-right py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("overall_score")}>Overall<SortIcon k="overall_score" /></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any, i: number) => (
                  <tr key={r.id} className="border-b border-border hover:bg-background">
                    <td className="py-2.5 font-semibold text-foreground">
                      {medal(i) ? <span className="text-lg mr-1">{medal(i)}</span> : null}
                      <span className={cn(i < 3 && "text-primary")}>{i + 1}</span>
                    </td>
                    <td className="py-2.5">
                      <img src={imgProxy(r.profile_pic_url) || "https://i.pravatar.cc/40"} alt="" className="h-9 w-9 rounded-full object-cover" />
                    </td>
                    <td className="py-2.5">
                      <Link to="/report/$id" params={{ id: r.id }} className="hover:text-primary">
                        <div className="font-medium text-foreground">{r.influencer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">@{r.username}</div>
                      </Link>
                    </td>
                    <td className="py-2.5">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-xs", platformBadgeClass(r.platform))}>{r.platform}</span>
                    </td>
                    <td className="py-2.5 text-right">{nfmt(r.followers)}</td>
                    <td className="py-2.5 text-right">{pct(r.engagement_rate)}</td>
                    <td className="py-2.5 text-right">{r.audience_quality_score || 0}</td>
                    <td className="py-2.5 text-right">{r.brand_safety_score || 0}</td>
                    <td className="py-2.5 text-right font-semibold text-primary">{r.overall_score || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
