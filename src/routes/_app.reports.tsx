import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { nfmt, pct, platformBadgeClass, imgProxy } from "@/lib/format";
import { Eye, Scale, Trash2, Search, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getRole, getUserReportIds, refreshUserUsage } from "@/lib/auth";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/reports")({ component: Reports });

function Reports() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [minF, setMinF] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: rows = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [reportIdsTick, setReportIdsTick] = useState(0);
  useEffect(() => { refreshUserUsage().then(() => setReportIdsTick(t => t + 1)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const role = getRole();
    // Every account (admin or user) sees only their own analyses
    const allowedIds: Set<string> = new Set(getUserReportIds());
    return rows.filter(r => {
      if (!allowedIds.has(r.id)) return false;
      if (search && !(`${r.influencer_name} ${r.username}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (platform !== "all" && r.platform !== platform) return false;
      if (minF && Number(r.followers) < Number(minF)) return false;
      return true;
    });
  }, [rows, search, platform, minF, reportIdsTick]);

  const toggleSel = (id: string) => {
    setSelected(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 4) { toast.error("Max 4 selections"); return s; }
      return [...s, id];
    });
  };

  const del = async (id: string, name: string) => {
    qc.setQueryData<any[]>(["reports"], (old) => (old || []).filter(r => r.id !== id));
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      qc.invalidateQueries({ queryKey: ["reports"] });
    } else {
      toast.success(`Deleted ${name}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h1>
          <p className="text-muted-foreground mt-1">{filtered.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder={t("reports.searchPh")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background"
          />
        </div>
        <select value={platform} onChange={e => setPlatform(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background">
          <option value="all">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <input
          type="number"
          placeholder="Min followers"
          value={minF}
          onChange={e => setMinF(e.target.value)}
          className="w-36 px-3 py-2 rounded-md border border-input bg-background"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => {
          const isSel = selected.includes(r.id);
          const days = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000));
          const ago = days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
          return (
            <div key={r.id} className={cn("glass-card rounded-xl p-5 relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5", isSel && "ring-2 ring-primary")}>
              {isSel && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary fill-primary text-primary-foreground" />}
              <div className="flex items-start gap-3">
                <img src={imgProxy(r.profile_pic_url) || "https://i.pravatar.cc/100"} alt="" className="h-14 w-14 rounded-full ring-2 ring-primary/40 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.influencer_name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
                  <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-xs", platformBadgeClass(r.platform))}>{r.platform}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className="font-bold text-primary">{r.overall_score || 0}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                <span className="px-2 py-1 rounded bg-muted">{nfmt(r.followers)} followers</span>
                <span className="px-2 py-1 rounded bg-muted">{pct(r.engagement_rate)} ER</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">Analyzed {ago}</div>
              <div className="flex gap-1 mt-3">
                <Link to="/report/$id" params={{ id: r.id }} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  <Eye className="h-3 w-3" /> View
                </Link>
                <button onClick={() => toggleSel(r.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs bg-accent text-accent-foreground hover:bg-accent/80">
                  <Scale className="h-3 w-3" /> Compare
                </button>
                <button onClick={() => del(r.id, r.influencer_name || "")} className="px-2 py-1.5 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#dad1f0] text-[#461bb6] mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No influencers analyzed yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Start by analyzing your first profile.</p>
            <Link to="/analyze" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0] transition-colors">
              Start Analysis
            </Link>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-20 glass-card rounded-full shadow-lg px-5 py-3 flex items-center gap-4 max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <button
            onClick={() => navigate({ to: "/compare", search: { ids: selected.join(",") } as any })}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Compare Now
          </button>
          <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}
    </div>
  );
}
