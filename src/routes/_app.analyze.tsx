import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { detectPlatform, extractUsername, platformBadgeClass, imgProxy } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Copy, ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { enqueueAnalysis, getJobStatus } from "@/lib/analyze.functions";
import { supabase } from "@/integrations/supabase/client";
import { getRole, getAnalysisCount, getAnalysisLimit, incrementAnalysisCount, addUserReportId, refreshUserUsage } from "@/lib/auth";
import { saveTargetingForInfluencer } from "@/lib/compatibility";
import { AttemptsExhaustedModal } from "@/components/AttemptsExhaustedModal";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/analyze")({ component: AnalyzePage });

type Log = { ts: string; msg: string; type: "info" | "success" | "error" };

const WORKER_URL = "/api/public/hooks/process-jobs";

const INDUSTRIES = ["Beauty & Cosmetics","Fashion","Food & Beverage","Health & Wellness","Fitness","Technology","Mobile App","E-commerce","Automotive","Travel","Education","Finance","Real Estate","Entertainment","Gaming","Other"];
const COUNTRIES = ["Saudi Arabia","UAE","Kuwait","Qatar","Bahrain","Oman","Egypt","Iraq","Jordan","Other"];
const AGE_RANGES = ["13-17","18-24","25-34","35-44","45-54","55+"];
const GENDERS = ["Male","Female","All"];
const INTERESTS = ["Beauty","Fashion","Lifestyle","Family","Food","Fitness","Health","Technology","Business","Education","Travel","Automotive","Gaming","Entertainment","Shopping"];

export type Targeting = {
  industry: string;
  subCategory: string;
  countries: string[];
  cities: string;
  ageRanges: string[];
  gender: string;
  interests: string[];
};

const emptyTargeting: Targeting = { industry: "", subCategory: "", countries: [], cities: "", ageRanges: [], gender: "", interests: [] };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("px-3 py-1 rounded-full text-xs border transition", active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary")}>
      {children}
    </button>
  );
}

function TargetingForm({ value, onChange }: { value: Targeting; onChange: (v: Targeting) => void }) {
  const { t } = useTranslation();
  const toggle = (key: "countries" | "ageRanges" | "interests", item: string) => {
    const list = value[key];
    onChange({ ...value, [key]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] });
  };
  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-background">
      <h3 className="text-sm font-semibold text-foreground">{t("analyze.targeting")}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.industry")}</label>
          <select value={value.industry} onChange={e => onChange({ ...value, industry: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">{t("analyze.selectIndustryPh")}</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.subCategory")}</label>
          <input value={value.subCategory} onChange={e => onChange({ ...value, subCategory: e.target.value })} placeholder={t("analyze.subCategoryPh")} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.gender")}</label>
          <select value={value.gender} onChange={e => onChange({ ...value, gender: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">{t("analyze.selectGenderPh")}</option>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.cities")}</label>
          <input value={value.cities} onChange={e => onChange({ ...value, cities: e.target.value })} placeholder={t("analyze.citiesPh")} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-2">{t("analyze.countries")}</label>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(c => <Chip key={c} active={value.countries.includes(c)} onClick={() => toggle("countries", c)}>{c}</Chip>)}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-2">{t("analyze.ageRange")}</label>
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map(a => <Chip key={a} active={value.ageRanges.includes(a)} onClick={() => toggle("ageRanges", a)}>{a}</Chip>)}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-2">{t("analyze.interests")}</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(i => <Chip key={i} active={value.interests.includes(i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}
        </div>
      </div>
    </div>
  );
}

function AnalyzePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enqueueFn = useServerFn(enqueueAnalysis);
  const statusFn = useServerFn(getJobStatus);
  const [urls, setUrls] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [progress, setProgress] = useState<Record<string, { username: string; step: string; status: "pending" | "ok" | "err"; pic?: string }>>({});
  const [completed, setCompleted] = useState<{ id: string; name: string; pic?: string } | null>(null);
  const seenLogTs = useRef<Set<string>>(new Set());
  const role = typeof window !== "undefined" ? getRole() : null;
  const [limitOpen, setLimitOpen] = useState(false);
  const [usedCount, setUsedCount] = useState(0);
  const [targeting, setTargeting] = useState<Targeting>(emptyTargeting);
  const [sessionIds, setSessionIds] = useState<string[]>([]);

  // Whenever the user tweaks any targeting filter, immediately re-persist it
  // for every influencer analyzed in this session and notify any open report so
  // its Brand Compatibility Score recomputes right away.
  useEffect(() => {
    if (sessionIds.length === 0) return;
    sessionIds.forEach((id) => saveTargetingForInfluencer(id, targeting));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("boom-targeting-updated", { detail: { ids: sessionIds } }));
    }
  }, [targeting, sessionIds]);
  const [elapsed, setElapsed] = useState(0);
  const [limit, setLimit] = useState(getAnalysisLimit());
  useEffect(() => {
    setUsedCount(getAnalysisCount());
    setLimit(getAnalysisLimit());
    // Pull fresh values from the DB once, then mirror locally
    refreshUserUsage().then(() => {
      setUsedCount(getAnalysisCount());
      setLimit(getAnalysisLimit());
    });
  }, []);
  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const startedAt = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // API config
  const [keysOpen, setKeysOpen] = useState(false);
  const [apifyKey, setApifyKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showApify, setShowApify] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("id, apify_api_key, gemini_api_key").limit(1).maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setApifyKey(data.apify_api_key || "");
        setGeminiKey(data.gemini_api_key || "");
      }
    })();
  }, []);

  const persistKeys = (apify: string, gemini: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      if (settingsId) {
        await supabase.from("settings").update({ apify_api_key: apify, gemini_api_key: gemini, updated_at: new Date().toISOString() }).eq("id", settingsId);
      } else {
        const { data } = await supabase.from("settings").insert({ apify_api_key: apify, gemini_api_key: gemini }).select("id").maybeSingle();
        if (data) setSettingsId(data.id);
      }
    }, 600);
  };

  const log = (msg: string, type: Log["type"] = "info") =>
    setLogs(l => [...l, { ts: new Date().toLocaleTimeString(), msg, type }]);

  const lines = urls.split("\n").map(s => s.trim()).filter(Boolean);

  const pollJob = async (jobId: string, username: string): Promise<{ id?: string; error?: string }> => {
    // Kick the worker once immediately (fire-and-forget) and on interval as fallback
    fetch(WORKER_URL, { method: "POST" }).catch(() => {});
    const start = Date.now();
    const maxMs = 10 * 60 * 1000; // 10 min cap
    let lastKick = Date.now();
    while (Date.now() - start < maxMs) {
      await new Promise(r => setTimeout(r, 3000));
      const job = await statusFn({ data: { jobId } });
      if (!job) continue;
      const newLogs = (job.logs as any[]) || [];
      for (const entry of newLogs) {
        const key = `${jobId}-${entry.ts}-${entry.msg}`;
        if (!seenLogTs.current.has(key)) {
          seenLogTs.current.add(key);
          log(`[${username}] ${entry.msg}`, entry.type);
        }
      }
      if (job.status === "done") return { id: job.influencer_id as string };
      if (job.status === "error") return { error: job.error || "Failed" };
      // Re-kick worker every 15s in case cron hasn't fired
      if (Date.now() - lastKick > 15000) {
        fetch(WORKER_URL, { method: "POST" }).catch(() => {});
        lastKick = Date.now();
      }
    }
    return { error: "Timed out waiting for job" };
  };

  // Early-trigger limit modal as soon as the user pastes/types a URL with no attempts left
  useEffect(() => {
    if (role === "user" && lines.length > 0 && getAnalysisCount() >= getAnalysisLimit()) {
      setLimitOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls, role, limit, usedCount]);

  const run = async () => {
    // Block immediately if user is out of attempts — before any validation or work
    if (role === "user" && getAnalysisCount() >= getAnalysisLimit()) { setLimitOpen(true); return; }
    if (lines.length === 0) return toast.error(t("analyze.pasteOne"));
    if (!targeting.industry) return toast.error(t("analyze.selectIndustry"));
    try {
      const list = JSON.parse(localStorage.getItem("boom_targeting_submissions") || "[]");
      list.push({ at: new Date().toISOString(), urls: lines, targeting });
      localStorage.setItem("boom_targeting_submissions", JSON.stringify(list));
    } catch {}
    setRunning(true);
    setLogs([]);
    setProgress({});
    setCompleted(null);
    seenLogTs.current = new Set();
    log(`Starting analysis for ${lines.length} URL(s)`);

    const createdIds: { id: string; name: string; pic?: string }[] = [];
    for (const url of lines) {
      const platform = detectPlatform(url) as "instagram" | "tiktok" | "unknown";
      const username = extractUsername(url) || url;
      if (!extractUsername(url)) {
        log(`[${url}] could not extract username`, "error");
        setProgress(p => ({ ...p, [url]: { username, step: "Failed", status: "err" } }));
        continue;
      }
      setProgress(p => ({ ...p, [url]: { username, step: "Queued", status: "pending" } }));
      log(`[${username}] Queueing job…`);

      try {
        const { jobId } = await enqueueFn({ data: { url, platform, username, tier: role === "user" ? "free" : "full" } });
        log(`[${username}] Job ${jobId.slice(0, 8)} queued — processing in background`);
        setProgress(p => ({ ...p, [url]: { username, step: "Processing", status: "pending" } }));

        const res = await pollJob(jobId, username);
        if (res.id) {
          // Persist the targeting filter for this influencer so the report can show the compatibility analysis
          saveTargetingForInfluencer(res.id, targeting);
          setSessionIds((ids) => (ids.includes(res.id!) ? ids : [...ids, res.id!]));
          // Fetch profile pic + name for the completion banner
          const { data: prof } = await supabase.from("influencers").select("influencer_name, profile_pic_url").eq("id", res.id).maybeSingle();
          createdIds.push({ id: res.id, name: prof?.influencer_name || username, pic: prof?.profile_pic_url || undefined });
          setProgress(p => ({ ...p, [url]: { username, step: "Done", status: "ok", pic: prof?.profile_pic_url || undefined } }));
          if (role === "user") {
            const n = await incrementAnalysisCount();
            setUsedCount(n);
            try { await addUserReportId(res.id); } catch {}
            if (n >= getAnalysisLimit()) { setLimitOpen(true); break; }
          } else {
            // Admins still get the report added to their personal list so /reports shows it
            try { await addUserReportId(res.id); } catch {}
          }
        } else {
          log(`[${username}] ${res.error}`, "error");
          setProgress(p => ({ ...p, [url]: { username, step: "Failed", status: "err" } }));
        }
      } catch (e: any) {
        log(`[${username}] ${e.message}`, "error");
        setProgress(p => ({ ...p, [url]: { username, step: "Failed", status: "err" } }));
      }
    }

    setRunning(false);
    if (createdIds.length === 1) {
      // Immediately open the report when a single analysis finishes
      navigate({ to: "/report/$id", params: { id: createdIds[0].id } });
    } else if (createdIds.length > 1) {
      navigate({ to: "/compare", search: { ids: createdIds.map(c => c.id).join(",") } as any });
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.map(l => `[${l.ts}] ${l.msg}`).join("\n"));
    toast.success("Logs copied");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analyze.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("analyze.subtitle")}</p>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <textarea
          value={urls}
          onChange={e => setUrls(e.target.value)}
          placeholder={"https://instagram.com/username\nhttps://tiktok.com/@username"}
          rows={6}
          className="w-full px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
        />
        {lines.length > 0 && (
          <div className="space-y-1">
            {lines.map(l => (
              <div key={l} className="flex items-center gap-2 text-xs">
                <span className={cn("px-2 py-0.5 rounded", platformBadgeClass(detectPlatform(l)))}>{detectPlatform(l)}</span>
                <span className="truncate text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
        )}

        {lines.length > 0 && <TargetingForm value={targeting} onChange={setTargeting} />}

        <button
          onClick={run}
          disabled={running || lines.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {running && <Loader2 className="h-4 w-4 animate-spin" />}
          {running ? t("analyze.analyzing") : t("analyze.start")}
        </button>
      </div>

      {/* API Configuration (admin only) */}
      {role !== "user" && (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setKeysOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-background"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("analyze.apiConfig")}</span>
            <span className="text-xs text-muted-foreground">{t("analyze.keysHint")}</span>
          </div>
          {keysOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {keysOpen && (
          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-border">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.apifyKeyLabel")}</label>
              <div className="flex gap-2">
                <input
                  type={showApify ? "text" : "password"}
                  value={apifyKey}
                  onChange={(e) => { setApifyKey(e.target.value); persistKeys(e.target.value, geminiKey); }}
                  placeholder="apify_api_..."
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
                />
                <button type="button" onClick={() => setShowApify(s => !s)} className="px-3 rounded-md border border-input hover:bg-accent">
                  {showApify ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">{t("analyze.geminiKeyLabel")}</label>
              <div className="flex gap-2">
                <input
                  type={showGemini ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); persistKeys(apifyKey, e.target.value); }}
                  placeholder="AIza..."
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
                />
                <button type="button" onClick={() => setShowGemini(s => !s)} className="px-3 rounded-md border border-input hover:bg-accent">
                  {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("analyze.keysSaved")}</p>
          </div>
        )}
      </div>
      )}

      {completed && (
        <div className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-5 flex flex-wrap items-center gap-4 animate-fade-in">
          {completed.pic && <img src={imgProxy(completed.pic) || completed.pic} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#10b981]" />}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 text-[#065f46] font-semibold">
              <CheckCircle2 className="h-5 w-5" /> {t("analyze.complete")}
            </div>
            <div className="text-sm text-[#047857] mt-0.5">{completed.name} — {t("analyze.readyToView")}</div>
          </div>
          <Link
            to="/report/$id"
            params={{ id: completed.id }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "#461bb6" }}
          >
            {t("analyze.viewReport")}
          </Link>
        </div>
      )}

      {running && (
        <div className="rounded-xl border border-[#ece4ff] bg-gradient-to-r from-[#faf7ff] to-white p-5 flex items-center gap-4 animate-fade-in">
          <Loader2 className="h-6 w-6 animate-spin text-[#461bb6]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("analyze.inProgress")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t("analyze.autoOpen")}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-bold text-[#461bb6] tabular-nums">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("analyze.timer")}</div>
          </div>
        </div>
      )}

      {Object.keys(progress).length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          {Object.entries(progress).map(([url, p]) => (
            <div key={url} className="flex items-center gap-3 text-sm">
              {p.pic ? (
                <img src={imgProxy(p.pic) || p.pic} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-[#dad1f0]" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {(p.username || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">@{p.username}</div>
                <div className="text-xs text-muted-foreground truncate">{url}</div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                p.status === "ok" && "bg-[#d1fae5] text-[#065f46]",
                p.status === "err" && "bg-[#fee2e2] text-[#991b1b]",
                p.status === "pending" && "bg-muted text-foreground"
              )}>
                {p.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981] animate-in fade-in zoom-in duration-300" />}
                {p.status === "err" && <XCircle className="h-3.5 w-3.5" />}
                {p.status === "pending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {p.step}
              </span>
            </div>
          ))}
        </div>
      )}

      {role !== "user" && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">{t("analyze.debugLogs")}</h3>
            <button onClick={copyLogs} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent">
              <Copy className="h-3 w-3" /> {t("analyze.copy")}
            </button>
          </div>
          <div className="font-mono text-xs space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
            {logs.length === 0 && <div className="text-muted-foreground">{t("analyze.noLogs")}</div>}
            {logs.map((l, i) => (
              <div key={i} className={cn(
                l.type === "success" && "text-success",
                l.type === "error" && "text-destructive",
                l.type === "info" && "text-muted-foreground"
              )}>
                [{l.ts}] {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}


      {role === "user" && (
        <div className="text-xs text-muted-foreground">{t("analyze.freeTrial", { used: Math.min(usedCount, limit), limit })}</div>
      )}

      <AttemptsExhaustedModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      <AnalysisCountdownModal open={running} elapsed={elapsed} totalUrls={lines.length} tier={role === "user" ? "free" : "full"} />
    </div>
  );
}

// Estimated time per URL: free tier skips comment scraping → ~75s; full tier ~150s
function AnalysisCountdownModal({ open, elapsed, totalUrls, tier }: { open: boolean; elapsed: number; totalUrls: number; tier: "free" | "full" }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  if (!open) return null;
  const perUrl = tier === "free" ? 75 : 150;
  const totalEstimated = Math.max(60, perUrl * Math.max(1, totalUrls));
  const remaining = Math.max(0, totalEstimated - elapsed);
  const pct = Math.min(100, Math.round((elapsed / totalEstimated) * 100));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-[4px]" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-[420px] mx-4 bg-card rounded-2xl shadow-2xl p-7 text-center">
        <div className="mx-auto mb-5 relative" style={{ width: 120, height: 120 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#f3f4f6" strokeWidth={10} />
            <circle
              cx={60} cy={60} r={52} fill="none" stroke="#461bb6" strokeWidth={10}
              strokeDasharray={2 * Math.PI * 52} strokeDashoffset={(2 * Math.PI * 52) * (1 - pct / 100)}
              strokeLinecap="round" transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.8s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-[22px] font-extrabold text-[#461bb6] tabular-nums">{mm}:{ss}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t("analyze.remaining")}</div>
          </div>
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">{t("analyze.countdownTitle")}</h2>
        <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
          {t("analyze.countdownThanks")}
        </p>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-[#461bb6] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          {totalUrls} {totalUrls === 1 ? t("analyze.account") : t("analyze.accounts")} · {t("analyze.elapsed")} {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
