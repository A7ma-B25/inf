import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { nfmt, pct, imgProxy } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BadgeCheck, MapPin, ArrowLeft, Download, Loader2, Users, TrendingUp, MessageCircle, FileText, Radio, Tag, LayoutDashboard, Share2, Lock, Sparkles } from "lucide-react";
import { exportInfluencerPdf } from "@/lib/exportReportPdf";
import { ShareReportModal } from "@/components/ShareReportModal";
import { SubscribeModal } from "@/components/SubscribeModal";
import { getRole, isAdmin, canViewAll } from "@/lib/auth";
import { AdminProvider } from "@/components/admin/MetricInfo";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/report/$id")({ component: ReportLayout });

function ReportLayout() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [lockedLabel, setLockedLabel] = useState<string | undefined>(undefined);
  const canSeeAll = typeof window !== "undefined" && canViewAll();
  const isUserRole = typeof window !== "undefined" && getRole() === "user" && !canSeeAll;
  const isAdminUser = typeof window !== "undefined" && isAdmin();
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin_unlock_sections") === "1";
  });
  const toggleAdminUnlock = () => {
    const next = !adminUnlocked;
    setAdminUnlocked(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_unlock_sections", next ? "1" : "0");
    }
  };
  // Sections are locked for: free users always, and admins by default (until they toggle unlock).
  const sectionsLocked = isUserRole || (isAdminUser && !adminUnlocked);

  const ALL_SECTIONS: { to: any; label: string; icon: any; exact?: boolean; locked?: boolean }[] = [
    { to: "/report/$id", label: t("report.overview"), icon: LayoutDashboard, exact: true },
    { to: "/report/$id/audience", label: t("report.audience"), icon: Users },
    { to: "/report/$id/growth", label: t("report.growth"), icon: TrendingUp, locked: sectionsLocked },
    { to: "/report/$id/engagement", label: t("report.engagement"), icon: MessageCircle, locked: sectionsLocked },
    { to: "/report/$id/content", label: t("report.content"), icon: FileText, locked: sectionsLocked },
    { to: "/report/$id/reach", label: t("report.reach"), icon: Radio, locked: sectionsLocked },
    { to: "/report/$id/brand", label: t("report.brand"), icon: Tag, locked: sectionsLocked },
    { to: "/report/$id/ai", label: t("report.ai"), icon: Sparkles, locked: sectionsLocked },
  ];
  const SECTIONS = ALL_SECTIONS;




  const handleExportPdf = async () => {
    if (!r) return;
    setPdfLoading(true);
    try {
      await exportInfluencerPdf(r, { isAdmin: isAdmin() });
      toast.success(t("report.pdfSuccess"));
    } catch (e: any) {
      toast.error(`${t("report.pdfFailed")}: ${e?.message || "unknown error"}`);
    } finally {
      setPdfLoading(false);
    }
  };


  const { data: r, isLoading } = useQuery({
    queryKey: ["influencer", id],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  // Free-tier users and (locked) admins can only view overview & audience — redirect locked pages.
  const lockedSubpaths = ["/growth", "/engagement", "/content", "/reach", "/brand", "/ai"];
  if (sectionsLocked && lockedSubpaths.some((suf) => path.endsWith(suf))) {
    navigate({ to: "/report/$id", params: { id } as any, replace: true });
  }


  if (isLoading) return <div className="p-8 text-muted-foreground">{t("common.loading")}</div>;
  if (!r) return <div className="p-8">{t("report.notFound")} <Link to="/reports" className="text-[#461bb6] underline">{t("common.back")}</Link></div>;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-[1600px] mx-auto">
      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0 space-y-5 pb-28 lg:pb-24">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
        </div>


        {/* PROFILE HEADER */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <img src={imgProxy(r.profile_pic_url)} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-[#dad1f0] mx-auto sm:mx-0" />
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-[20px] md:text-[22px] font-bold text-foreground">{r.influencer_name}</h1>
                {r.is_verified && <BadgeCheck className="h-5 w-5 text-[#3b82f6]" />}
              </div>
              <div className="text-[14px] text-muted-foreground">@{r.username}</div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded" style={{ background: "#dad1f0", color: "#461bb6" }}>{r.platform}</span>
                {r.niche && <span className="px-2 py-0.5 rounded bg-muted text-foreground">{r.niche}</span>}
                {(r.city || r.country) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-foreground">
                    <MapPin className="h-3 w-3" /> {[r.city, r.country].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              {r.created_at && (
                <div className="text-[11px] text-muted-foreground mt-1.5">
                  {t("report.analyzedOn")} {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </div>
              )}
            </div>
          </div>
          {r.biography && (
            <p className="text-sm text-foreground leading-relaxed mt-4 whitespace-pre-wrap break-words">
              {renderBio(r.biography)}
            </p>
          )}
        </div>

        {/* MOBILE SECTION NAV — horizontal scrollable tabs */}
        <nav className="lg:hidden -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-1 bg-card border border-border rounded-lg p-1 min-w-max">
            {SECTIONS.map(s => {
              const fullPath = (s.to as string).replace("$id", id);
              const active = path === fullPath;
              const Icon = s.icon;
              const locked = !!s.locked;
              return (
                <button
                  key={s.to}
                  type="button"
                  onClick={() => {
                    if (locked && !isAdminUser) {
                      setLockedLabel(s.label);
                      setSubscribeOpen(true);
                    } else {
                      if (locked && isAdminUser && !adminUnlocked) toggleAdminUnlock();
                      navigate({ to: s.to as any, params: { id } as any });
                    }
                  }}
                  title={locked ? t("report.lockedTooltip") : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors min-h-[40px]",
                    locked
                      ? "text-muted-foreground opacity-70 hover:opacity-100 hover:bg-muted/40"
                      : active ? "bg-[#461bb6] text-white" : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {locked ? <Lock className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />} {s.label}
                </button>
              );
            })}
          </div>
        </nav>


        <div ref={contentRef} data-report-content className="animate-fade-in">
          <AdminProvider value={isAdmin()}>
            <Outlet />
          </AdminProvider>
        </div>

        <SubscribeModal open={subscribeOpen} onOpenChange={setSubscribeOpen} sectionLabel={lockedLabel} />

        {!isUserRole && (
          <div className="text-center text-[11px] text-muted-foreground py-6">
            &nbsp;
          </div>
        )}

        {!isUserRole && (
          <div className="sticky bottom-[64px] md:bottom-0 -mx-4 md:-mx-6 border-t border-border bg-card/95 backdrop-blur p-3 flex flex-col sm:flex-row justify-end gap-2 z-10">
            <button onClick={() => setShareOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/40 min-h-[44px]">
              <Share2 className="h-4 w-4" /> {r.is_public ? t("report.sharingOn") : t("report.share")}
            </button>
            <button onClick={handleExportPdf} disabled={pdfLoading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 min-h-[44px]" style={{ background: "#461bb6" }}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {pdfLoading ? t("common.loading") : t("report.exportPdf")}
            </button>
          </div>
        )}

        {!isUserRole && (
          <ShareReportModal
            open={shareOpen}
            onOpenChange={setShareOpen}
            influencer={r}
            onUpdated={(patch) => { Object.assign(r, patch); }}
          />
        )}


      </div>

      {/* RIGHT SIDEBAR — tablet narrow / desktop full */}
      <aside className="hidden lg:block w-[200px] xl:w-[260px] shrink-0">

        <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img src={imgProxy(r.profile_pic_url)} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">{r.influencer_name}</div>
                <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-3 text-center">
              <div><div className="text-[10px] text-muted-foreground uppercase">{t("reports.followers")}</div><div className="text-xs font-bold text-foreground">{nfmt(r.followers)}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">{t("reports.er")}</div><div className="text-xs font-bold text-foreground">{pct(r.engagement_rate)}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">{t("reports.score")}</div><div className="text-xs font-bold" style={{ color: "#461bb6" }}>{r.overall_score}</div></div>
            </div>
          </div>

          <nav className="bg-card border border-border rounded-lg p-2">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("report.sectionsHeader")}</div>
              {isAdminUser && (
                <button
                  type="button"
                  onClick={toggleAdminUnlock}
                  title={adminUnlocked ? "Lock sections" : "Unlock all sections (admin)"}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors",
                    adminUnlocked
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
                  )}
                >
                  <Lock className="h-3 w-3" />
                  {adminUnlocked ? "Unlocked" : "Unlock"}
                </button>
              )}
            </div>

            {SECTIONS.map(s => {
              const fullPath = (s.to as string).replace("$id", id);
              const active = path === fullPath;
              const Icon = s.icon;
              const locked = !!s.locked;
              return (
                <button
                  key={s.to}
                  type="button"
                  title={locked ? t("report.lockedTooltip") : undefined}
                  onClick={() => {
                    if (locked && !isAdminUser) {
                      setLockedLabel(s.label);
                      setSubscribeOpen(true);
                    } else {
                      if (locked && isAdminUser && !adminUnlocked) toggleAdminUnlock();
                      navigate({ to: s.to as any, params: { id } as any });
                    }
                  }}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border-l-2",
                    locked
                      ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      : active
                        ? "border-[#461bb6] bg-[#461bb6]/10 dark:bg-[#461bb6]/25 text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="flex-1">{s.label}</span>
                  {locked && <span className="text-[10px] text-muted-foreground">{t("report.locked")}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  );
}


function renderBio(text: string) {
  // Highlight @mentions, #hashtags in purple, URLs as clickable links
  const re = /(https?:\/\/[^\s]+)|(@[A-Za-z0-9_.]+)|(#[\p{L}0-9_]+)/gu;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (m[1]) {
      out.push(
        <a key={`u${i}`} href={token} target="_blank" rel="noopener noreferrer" className="text-[#461bb6] underline hover:opacity-80 break-all">
          {token}
        </a>
      );
    } else if (m[2]) {
      out.push(<span key={`m${i}`} className="text-[#461bb6] font-medium">{token}</span>);
    } else {
      out.push(<span key={`h${i}`} className="text-[#461bb6] font-medium">{token}</span>);
    }
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}


