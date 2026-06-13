import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Users, Plus, X, Search, Eye, RefreshCw, Trash2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { nfmt, pct, platformBadgeClass, imgProxy, detectPlatform } from "@/lib/format";
import { cn } from "@/lib/utils";
import { enqueueAnalysis, getJobStatus } from "@/lib/analyze.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/tracked")({ component: TrackedPage });

const HA_PURPLE = "#461bb6";

type Tracked = {
  id: string;
  influencer_id: string;
  tracked_since: string;
  last_checked: string | null;
  check_frequency: string;
  notes: string | null;
  is_active: boolean;
  influencer?: any;
};

type Snapshot = {
  id: string;
  influencer_id: string;
  snapshot_date: string;
  followers: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  overall_score: number;
};

function TrackedPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const enqueueFn = useServerFn(enqueueAnalysis);
  const statusFn = useServerFn(getJobStatus);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const { data: tracked = [] } = useQuery({
    queryKey: ["tracked"],
    queryFn: async (): Promise<Tracked[]> => {
      const { data: t } = await supabase.from("tracked_influencers").select("*").eq("is_active", true).order("tracked_since", { ascending: false });
      if (!t || t.length === 0) return [];
      const ids = t.map((x: any) => x.influencer_id);
      const { data: infs } = await supabase.from("influencers").select("*").in("id", ids);
      const byId = new Map((infs || []).map((i: any) => [i.id, i]));
      return t.map((x: any) => ({ ...x, influencer: byId.get(x.influencer_id) }));
    },
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["tracked-snapshots"],
    queryFn: async (): Promise<Snapshot[]> => {
      const { data } = await supabase.from("tracked_snapshots").select("*").order("snapshot_date", { ascending: true });
      return (data as any) || [];
    },
  });

  const snapshotsByInf = useMemo(() => {
    const m = new Map<string, Snapshot[]>();
    snapshots.forEach((s) => {
      const arr = m.get(s.influencer_id) || [];
      arr.push(s);
      m.set(s.influencer_id, arr);
    });
    return m;
  }, [snapshots]);

  // Stats
  const totalTracked = tracked.length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeWeek = tracked.filter((t) => t.last_checked && new Date(t.last_checked).getTime() > weekAgo).length;
  const growths = tracked
    .map((t) => {
      const snaps = snapshotsByInf.get(t.influencer_id) || [];
      if (snaps.length < 2) return null;
      const first = snaps[0].followers || 1;
      const last = snaps[snaps.length - 1].followers || 0;
      return ((last - first) / first) * 100;
    })
    .filter((x): x is number => x != null);
  const avgGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
  const topPerformer = tracked
    .slice()
    .sort((a, b) => (b.influencer?.overall_score || 0) - (a.influencer?.overall_score || 0))[0];

  const stats = [
    { label: "Total Tracked", value: String(totalTracked) },
    { label: "Active This Week", value: String(activeWeek) },
    { label: "Avg Growth", value: `${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(2)}%` },
    { label: "Top Performer", value: topPerformer?.influencer?.influencer_name || "—" },
  ];

  const untrack = async (t: Tracked) => {
    qc.setQueryData<Tracked[]>(["tracked"], (old) => (old || []).filter((x) => x.id !== t.id));
    const { error } = await supabase.from("tracked_influencers").delete().eq("id", t.id);
    if (error) {
      toast.error("Failed to untrack");
      qc.invalidateQueries({ queryKey: ["tracked"] });
    } else {
      toast.success(`Untracked ${t.influencer?.influencer_name || "influencer"}`);
    }
  };

  const checkNow = async (t: Tracked) => {
    if (!t.influencer) return;
    setCheckingId(t.id);
    try {
      const url = t.influencer.profile_url;
      const platform = t.influencer.platform || detectPlatform(url || "");
      const username = t.influencer.username;
      toast.info(`Re-analyzing ${t.influencer.influencer_name}… (running in background)`);
      const { jobId } = await enqueueFn({ data: { url, platform, username } });
      fetch("/api/public/hooks/process-jobs", { method: "POST" }).catch(() => {});
      const start = Date.now();
      while (Date.now() - start < 10 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 4000));
        const job = await statusFn({ data: { jobId } });
        if (job?.status === "done") break;
        if (job?.status === "error") throw new Error(job.error || "Job failed");
      }
      // Refresh influencer record
      const { data: fresh } = await supabase.from("influencers").select("*").eq("id", t.influencer_id).maybeSingle();
      if (fresh) {
        await supabase.from("tracked_snapshots").insert({
          influencer_id: t.influencer_id,
          followers: fresh.followers,
          engagement_rate: fresh.engagement_rate,
          avg_likes: fresh.avg_likes,
          avg_comments: fresh.avg_comments,
          avg_views: fresh.avg_views,
          overall_score: fresh.overall_score,
        });
        await supabase.from("tracked_influencers").update({ last_checked: new Date().toISOString() }).eq("id", t.id);
      }
      qc.invalidateQueries({ queryKey: ["tracked"] });
      qc.invalidateQueries({ queryKey: ["tracked-snapshots"] });
      toast.success("Snapshot saved!");
    } catch (e: any) {
      toast.error(`Check failed: ${e?.message || "unknown"}`);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" style={{ fontFamily: "Rubik, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("tracked.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("nav.tracking")}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0] transition-colors">
          <Plus className="h-4 w-4" /> Track New
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className="text-[20px] font-bold text-foreground mt-1 leading-tight truncate">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {tracked.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-[#f3e8ff] flex items-center justify-center mb-4">
            <TrendingUp className="h-7 w-7 text-[#461bb6]" />
          </div>
          <div className="text-base font-semibold text-foreground">No tracked influencers yet</div>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Start tracking influencers to monitor their growth over time.</p>
          <Link to="/reports" className="inline-flex items-center px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0]">
            Go to Reports
          </Link>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {tracked.map((t) => {
          const inf = t.influencer || {};
          const snaps = snapshotsByInf.get(t.influencer_id) || [];
          const last = snaps[snaps.length - 1];
          const prev = snaps[snaps.length - 2];
          const followersChange = last && prev && prev.followers ? ((last.followers - prev.followers) / prev.followers) * 100 : 0;
          const erChange = last && prev && prev.engagement_rate ? Number(last.engagement_rate) - Number(prev.engagement_rate) : 0;
          const isExp = expanded === t.id;

          return (
            <div key={t.id} className="bg-card border border-border rounded-lg p-5">
              <div className="grid lg:grid-cols-[260px_1fr_220px] gap-5 items-center">
                {/* Left: Profile */}
                <div className="flex items-center gap-3">
                  <img src={imgProxy(inf.profile_pic_url) || "https://i.pravatar.cc/100"} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#461bb6]/30" />
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{inf.influencer_name || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">@{inf.username}</div>
                    <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-[10px]", platformBadgeClass(inf.platform))}>{inf.platform}</span>
                    <div className="text-[10px] text-muted-foreground mt-1">Tracked since {new Date(t.tracked_since).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Middle: Sparklines */}
                <div className="grid grid-cols-3 gap-3">
                  <Spark label="Followers" data={snaps.map((s) => ({ v: s.followers || 0 }))} />
                  <Spark label="ER" data={snaps.map((s) => ({ v: Number(s.engagement_rate || 0) }))} />
                  <Spark label="Score" data={snaps.map((s) => ({ v: s.overall_score || 0 }))} />
                </div>

                {/* Right: Stats */}
                <div className="space-y-1 text-[12px]">
                  <Stat label="Followers" value={nfmt(inf.followers)} change={followersChange} />
                  <Stat label="ER" value={pct(inf.engagement_rate)} change={erChange} suffix="pp" />
                  <Stat label="Score" value={`${inf.overall_score || 0}/100`} />
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2">
                <Link to="/report/$id" params={{ id: t.influencer_id }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#461bb6] text-white text-xs font-medium hover:bg-[#3a16a0]">
                  <Eye className="h-3 w-3" /> View Report
                </Link>
                <button onClick={() => checkNow(t)} disabled={checkingId === t.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-[#e5e7eb] disabled:opacity-60">
                  <RefreshCw className={cn("h-3 w-3", checkingId === t.id && "animate-spin")} /> {checkingId === t.id ? "Checking…" : "Check Now"}
                </button>
                <button onClick={() => untrack(t)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">
                  <Trash2 className="h-3 w-3" /> Untrack
                </button>
                <button onClick={() => setExpanded(isExp ? null : t.id)} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[#461bb6] text-xs font-medium hover:bg-[#f3e8ff]">
                  {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isExp ? "Hide" : "Growth"} History
                </button>
              </div>

              {/* Expanded history */}
              {isExp && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {snaps.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No snapshots yet. Click "Check Now" to save the first one.</div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-3 gap-4">
                        <HistoryChart title="Followers" data={snaps} dataKey="followers" />
                        <HistoryChart title="Engagement Rate (%)" data={snaps} dataKey="engagement_rate" />
                        <HistoryChart title="Overall Score" data={snaps} dataKey="overall_score" />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead><tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 font-medium">Date</th>
                            <th className="py-2 font-medium text-right">Followers</th>
                            <th className="py-2 font-medium text-right">ER</th>
                            <th className="py-2 font-medium text-right">Avg Likes</th>
                            <th className="py-2 font-medium text-right">Avg Comments</th>
                            <th className="py-2 font-medium text-right">Avg Views</th>
                            <th className="py-2 font-medium text-right">Score</th>
                          </tr></thead>
                          <tbody>{snaps.slice().reverse().map((s) => (
                            <tr key={s.id} className="border-b border-border">
                              <td className="py-2 text-foreground">{new Date(s.snapshot_date).toLocaleString()}</td>
                              <td className="py-2 text-right">{nfmt(s.followers)}</td>
                              <td className="py-2 text-right">{pct(s.engagement_rate)}</td>
                              <td className="py-2 text-right">{nfmt(s.avg_likes)}</td>
                              <td className="py-2 text-right">{nfmt(s.avg_comments)}</td>
                              <td className="py-2 text-right">{nfmt(s.avg_views)}</td>
                              <td className="py-2 text-right font-semibold text-foreground">{s.overall_score || 0}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && <TrackModal onClose={() => setModalOpen(false)} trackedIds={new Set(tracked.map((t) => t.influencer_id))} onTracked={() => { qc.invalidateQueries({ queryKey: ["tracked"] }); }} />}
    </div>
  );
}

function Spark({ label, data }: { label: string; data: { v: number }[] }) {
  const safe = data.length ? data : [{ v: 0 }, { v: 0 }];
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="h-12">
        <ResponsiveContainer>
          <LineChart data={safe}>
            <Line type="monotone" dataKey="v" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, change, suffix = "%" }: { label: string; value: string; change?: number; suffix?: string }) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground">{value}</span>
        {change != null && change !== 0 && (
          <span className={cn("text-[11px] font-medium", up ? "text-[#10b981]" : "text-red-500")}>
            {up ? "▲" : "▼"}{Math.abs(change).toFixed(2)}{suffix}
          </span>
        )}
      </span>
    </div>
  );
}

function HistoryChart({ title, data, dataKey }: { title: string; data: Snapshot[]; dataKey: keyof Snapshot }) {
  const chartData = data.map((s) => ({ date: new Date(s.snapshot_date).toLocaleDateString(), value: Number(s[dataKey] || 0) }));
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="text-[12px] font-semibold text-foreground mb-2">{title}</div>
      <div className="h-40">
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => nfmt(v)} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={HA_PURPLE} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrackModal({ onClose, trackedIds, onTracked }: { onClose: () => void; trackedIds: Set<string>; onTracked: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [freq, setFreq] = useState("weekly");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: influencers = [] } = useQuery({
    queryKey: ["all-influencers"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("id, influencer_name, username, profile_pic_url, platform, followers").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => influencers.filter((i: any) => {
    if (trackedIds.has(i.id)) return false;
    if (search && !`${i.influencer_name} ${i.username}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [influencers, search, trackedIds]);

  const start = async () => {
    if (!selected) { toast.error("Select an influencer"); return; }
    setSaving(true);
    const inf = influencers.find((i: any) => i.id === selected);
    const { error: te } = await supabase.from("tracked_influencers").insert({
      influencer_id: selected,
      check_frequency: freq,
      notes: notes || null,
    });
    if (te) { toast.error(te.message); setSaving(false); return; }
    // Initial snapshot
    if (inf) {
      const { data: full } = await supabase.from("influencers").select("*").eq("id", selected).maybeSingle();
      if (full) {
        await supabase.from("tracked_snapshots").insert({
          influencer_id: selected,
          followers: full.followers,
          engagement_rate: full.engagement_rate,
          avg_likes: full.avg_likes,
          avg_comments: full.avg_comments,
          avg_views: full.avg_views,
          overall_score: full.overall_score,
        });
      }
    }
    toast.success("Tracking started!");
    onTracked();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Track New Influencer</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Select influencer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search by name or username" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-md border border-border text-sm" />
            </div>
            <div className="mt-2 border border-border rounded-md max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No available influencers. <Link to="/reports" className="text-[#461bb6] underline">Analyze one</Link>.</div>
              ) : filtered.map((i: any) => (
                <button key={i.id} onClick={() => setSelected(i.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 border-b border-border last:border-b-0", selected === i.id && "bg-[#f3e8ff]")}>
                  <img src={imgProxy(i.profile_pic_url) || "https://i.pravatar.cc/40"} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{i.influencer_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">@{i.username} · {nfmt(i.followers)} followers</div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-[10px]", platformBadgeClass(i.platform))}>{i.platform}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Check frequency</label>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly"].map((f) => (
                <button key={f} onClick={() => setFreq(f)} className={cn("px-4 py-2 rounded-md text-sm font-medium capitalize border", freq === f ? "bg-[#461bb6] text-white border-[#461bb6]" : "bg-card text-foreground border-border hover:bg-muted/40")}>{f}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why are you tracking this influencer?" className="w-full px-3 py-2 rounded-md border border-border text-sm" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-foreground hover:bg-muted">Cancel</button>
          <button onClick={start} disabled={saving || !selected} className="px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0] disabled:opacity-50">{saving ? "Starting…" : "Start Tracking"}</button>
        </div>
      </div>
    </div>
  );
}
