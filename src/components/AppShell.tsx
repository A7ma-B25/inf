import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Search, FileText, Scale, Settings, LogOut, Moon, Sun, Globe, List, Users, Menu, X, Zap, CalendarCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signOut, getRole, hasFullAccess } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { WelcomeModal } from "@/components/WelcomeModal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { useTranslation } from "react-i18next";

type NavItem = { to: any; label: string; icon: any; match?: "exact" | "prefix"; key?: string; external?: string };

// Calendly booking link for free influencer-marketing consultation
const BOOK_CONSULTATION_URL = "https://calendly.com/ammar-boom-agency/influencer-marketing-consultation-free-clone-1";

function buildNavGroups(t: (k: string) => string) {
  const ADMIN_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
    { label: t("nav.dashboard"), items: [{ to: "/dashboard", label: t("nav.overview"), icon: Home }] },
    { label: t("nav.analyze"), items: [
      { to: "/analyze", label: t("nav.newAnalysis"), icon: Search },
      { to: "/reports", label: t("nav.reports"), icon: FileText, match: "prefix", key: "reports" },
      { to: BOOK_CONSULTATION_URL, label: t("nav.bookConsultation"), icon: CalendarCheck, external: BOOK_CONSULTATION_URL },
    ]},
    { label: t("nav.marketAnalysis"), items: [
      { to: "/compare", label: t("nav.compare"), icon: Scale },
      { to: "/top-lists", label: t("nav.topLists"), icon: List },
    ]},
    { label: t("nav.tracking"), items: [
      { to: "/tracked", label: t("nav.tracked"), icon: Users },
      { to: "/campaigns", label: t("nav.campaigns"), icon: Globe },
    ]},
  ];
  const USER_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
    { label: t("nav.workspace"), items: [
      { to: "/analyze", label: t("nav.analyze"), icon: Search },
      { to: "/reports", label: t("nav.myReports"), icon: FileText, match: "prefix", key: "reports" },
      { to: BOOK_CONSULTATION_URL, label: t("nav.bookConsultation"), icon: CalendarCheck, external: BOOK_CONSULTATION_URL },
    ]},
  ];
  const ADMIN_BOTTOM: NavItem[] = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: Home },
    { to: "/analyze", label: t("nav.analyze"), icon: Search },
    { to: "/reports", label: t("nav.reports"), icon: FileText, match: "prefix" },
    { to: "/compare", label: t("nav.compare"), icon: Scale },
  ];
  const USER_BOTTOM: NavItem[] = [
    { to: "/analyze", label: t("nav.analyze"), icon: Search },
    { to: "/reports", label: t("nav.reports"), icon: FileText, match: "prefix" },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
  ];
  return { ADMIN_NAV_GROUPS, USER_NAV_GROUPS, ADMIN_BOTTOM, USER_BOTTOM };
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = () => { signOut(); navigate({ to: "/login" }); };

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  const { data: reportsCount = 0 } = useQuery({
    queryKey: ["reports-count"],
    queryFn: async () => {
      const { count } = await supabase.from("influencers").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const role = getRole();
  const fullAccess = hasFullAccess();
  const effectiveRole: "admin" | "user" = role === "admin" || fullAccess ? "admin" : "user";
  const { ADMIN_NAV_GROUPS, USER_NAV_GROUPS, ADMIN_BOTTOM, USER_BOTTOM } = buildNavGroups(t);
  const NAV_GROUPS = effectiveRole === "user" ? USER_NAV_GROUPS : ADMIN_NAV_GROUPS;
  const BOTTOM_NAV = effectiveRole === "user" ? USER_BOTTOM : ADMIN_BOTTOM;
  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const activeItem = allItems.find(it => {
    if (it.match === "prefix") return path === it.to || path.startsWith(it.to + "/");
    return path === it.to;
  });

  const isActive = (it: NavItem) => {
    if (it.match === "prefix") return path === it.to || path.startsWith(it.to + "/");
    return path === it.to;
  };

  // Sidebar shared content; `compact` = icon-only (tablet collapsed)
  const SidebarContent = ({ compact }: { compact: boolean }) => (
    <>
      <div className={cn("flex items-center justify-center border-b border-[#e2ddf5] dark:border-white/10", compact ? "px-2 py-3" : "px-4 py-4")}>
        <div className={cn("flex items-center justify-center rounded-xl px-4", compact ? "py-1.5" : "py-2")}>
          <Logo size={compact ? "sm" : "md"} />
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto scrollbar-thin">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className="space-y-0.5">
            {!compact ? (
              <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.12em] text-[#6b6880] dark:text-white/45 font-semibold">{group.label}</div>
            ) : gi > 0 ? (
              <div className="mx-3 mb-2 h-px bg-[#e2ddf5] dark:bg-white/10" />
            ) : null}
            {group.items.map(item => {
              const active = item === activeItem;
              const Icon = item.icon;
              const baseClass = cn(
                "group relative flex items-center gap-3 rounded-lg text-[13px] transition-all duration-200 min-h-[40px]",
                compact ? "justify-center px-2 py-2 mx-1" : "px-3 py-2 mx-1",
                active
                  ? "bg-[#461bb6]/10 text-[#461bb6] font-medium shadow-sm dark:bg-white/15 dark:text-white"
                  : item.external
                    ? "text-[#d97706] hover:bg-[#461bb6]/5 hover:text-[#111827] font-medium dark:text-[#fce96a] dark:hover:bg-white/10 dark:hover:text-white"
                    : "text-[#6b6880] hover:bg-[#461bb6]/5 hover:text-[#111827] dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
              );
              const inner = (
                <>
                  {active && !compact && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#461bb6] dark:bg-white" aria-hidden />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#461bb6] dark:text-white" : "text-[#6b6880] group-hover:text-[#111827] dark:text-white/70 dark:group-hover:text-white")} />
                  {!compact && <span className="flex-1 truncate">{item.label}</span>}
                </>
              );
              if (item.external) {
                return (
                  <a key={`${group.label}-${item.label}`} href={item.external} target="_blank" rel="noopener noreferrer" title={compact ? item.label : undefined} className={baseClass}>
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={`${group.label}-${item.label}`} to={item.to} title={compact ? item.label : undefined} className={baseClass}>
                  {inner}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e2ddf5] dark:border-white/10 p-2 space-y-0.5">
        <Link to="/settings" title={compact ? t("nav.settings") : undefined} className={cn(
          "group flex items-center gap-3 rounded-lg text-[13px] transition-all duration-200 min-h-[40px] mx-1",
          compact ? "justify-center px-2 py-2" : "px-3 py-2",
          path === "/settings" ? "bg-[#461bb6]/10 text-[#461bb6] dark:bg-white/15 dark:text-white" : "text-[#6b6880] hover:text-[#111827] hover:bg-[#461bb6]/5 dark:text-white/75 dark:hover:text-white dark:hover:bg-white/10"
        )}>
          <Settings className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-45 text-[#6b6880] group-hover:text-[#111827] dark:text-white/70 dark:group-hover:text-white" />
          {!compact && <span>{t("nav.settings")}</span>}
        </Link>
        <button onClick={handleLogout} title={compact ? t("nav.logout") : undefined} className={cn(
          "group w-full flex items-center gap-3 rounded-lg text-[13px] text-[#6b6880] hover:bg-red-50 hover:text-red-600 transition-all duration-200 min-h-[40px] mx-1 dark:text-white/75 dark:hover:bg-red-500/20 dark:hover:text-red-100",
          compact ? "justify-center px-2 py-2" : "px-3 py-2"
        )}>
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 text-[#6b6880] group-hover:text-red-600 dark:text-white/70 dark:group-hover:text-red-100" />
          {!compact && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </>
  );


  const sidebarBg = "bg-white dark:bg-[#0d0a1e]";

  return (
    <div className="min-h-screen w-full bg-[#f5f7fb] dark:bg-[#0f0f1a] text-[#111827] dark:text-white transition-colors">
      {/* Desktop sidebar — full (lg+) */}
      <aside className={cn("hidden lg:flex fixed top-0 left-0 bottom-0 h-screen w-[240px] z-40 flex-col text-[#111827] dark:text-[#e5e7eb] overflow-hidden shadow-[2px_0_12px_rgba(70,27,182,0.08)]", sidebarBg)}>
        <SidebarContent compact={false} />
      </aside>

      {/* Tablet sidebar — icon-only (md to lg) */}
      <aside className={cn("hidden md:flex lg:hidden fixed top-0 left-0 bottom-0 h-screen w-[64px] z-40 flex-col text-[#111827] dark:text-[#e5e7eb] overflow-hidden shadow-[2px_0_12px_rgba(70,27,182,0.08)]", sidebarBg)}>
        <SidebarContent compact={true} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className={cn("fixed top-0 left-0 bottom-0 h-screen z-50 w-[280px] flex flex-col text-[#111827] dark:text-[#e5e7eb] md:hidden shadow-2xl overflow-hidden", sidebarBg)}
            style={{ animation: "slideInLeft 0.2s ease-out" }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 z-10 h-10 w-10 inline-flex items-center justify-center rounded-md text-[#6b6880] hover:bg-[#f3f4f6] dark:text-white/70 dark:hover:bg-white/10"
              aria-label={t("nav.closeMenu")}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent compact={false} />
          </aside>
        </>
      )}

      <main className="min-w-0 bg-[#f5f7fb] dark:bg-[#0f0f1a] transition-colors md:ml-[64px] lg:ml-[240px] min-h-screen flex flex-col">

        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 py-3 border-b border-[#e5e7eb] dark:border-white/10 bg-white/85 dark:bg-[#0f0f1a]/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-[#f3f4f6] dark:hover:bg-white/10 text-[#111827] dark:text-white min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label={t("nav.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden flex items-center">
            <Logo size="sm" />
          </div>
          <div className="flex-1" />
          <LanguageToggle />
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-[#f3f4f6] dark:hover:bg-white/10 transition-colors text-[#6b7280] dark:text-white/70 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label={t("nav.toggleTheme")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <div key={path} className="p-4 md:p-6 pb-24 md:pb-6 page-fade">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch bg-white dark:bg-[#0f0f1a] border-t border-[#e5e7eb] dark:border-white/10 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {BOTTOM_NAV.map(item => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium min-h-[56px] transition-colors",
                active ? "text-[#461bb6]" : "text-[#6b7280]"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-[#461bb6]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <WelcomeModal />

      {/* Discreet floating WhatsApp button — expands on hover */}
      <WhatsAppFab />
    </div>
  );
}

function WhatsAppFab() {
  const { t } = useTranslation();
  const waUrl = `https://wa.me/966115030382?text=${encodeURIComponent(t("attempts.waMessage"))}`;
  const greeting = t("attempts.waGreeting");

  return (
    <div className="group fixed z-50 md:bottom-6 md:right-6 bottom-[72px] right-3">
      {/* Greeting label above the button — auto-visible on mobile (no hover), hover-revealed on desktop */}
      <div className="absolute bottom-full right-0 mb-2.5 flex items-center gap-2 whitespace-nowrap pointer-events-none transition-all duration-300 ease-out
                      opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0
                      animate-fade-in">
        <span className="text-[11px] md:text-[12px] font-medium text-[#461bb6] dark:text-[#a58aff] bg-white/90 dark:bg-[#1a1630]/90 backdrop-blur shadow-sm border border-[#e2ddf5] dark:border-white/10 rounded-lg px-2.5 py-1 md:px-3 md:py-1.5">
          {greeting}
        </span>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={t("attempts.cta")}
        aria-label={t("attempts.cta")}
        className="relative inline-flex items-center justify-center h-12 w-12 rounded-full text-white shadow-[0_8px_24px_-6px_rgba(70,27,182,0.55)] hover:shadow-[0_12px_32px_-6px_rgba(70,27,182,0.7)] transition-all duration-300 ease-out bg-gradient-to-r from-[#5b22d4] via-[#461bb6] to-[#7b3ff0] hover:scale-[1.08] active:scale-[0.95]"
        style={{ backgroundSize: "200% 100%", animation: "boraqShine 4s ease-in-out infinite" }}
      >
        {/* Pulse halo */}
        <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-ping opacity-40" />
        <span aria-hidden className="absolute inset-1 rounded-full bg-white/15 blur-[2px]" />
        <Zap className="relative h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" fill="#f4d768" strokeWidth={2.25} />
        <span aria-hidden className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f4d768] ring-2 ring-white/30 animate-pulse" />
      </a>
    </div>
  );
}

