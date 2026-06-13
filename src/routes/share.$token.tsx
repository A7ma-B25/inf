import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, MapPin } from "lucide-react";
import { imgProxy, nfmt, pct } from "@/lib/format";
import { OverviewTab, AudienceTab, GrowthTab, EngagementTab, ContentTab, ReachTab, BrandTab } from "@/components/report/sections";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/share/$token")({ component: SharePage });

function SharePage() {
  const { token } = Route.useParams();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const { data: r, isLoading } = useQuery({
    queryKey: ["share", token],
    queryFn: async () => {
      const { data } = await supabase
        .from("influencers")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-muted/40 flex items-center justify-center text-muted-foreground" dir={rtl ? "rtl" : "ltr"}>{t("common.loading")}</div>;
  }

  if (!r) {
    return (
      <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-6 text-center" dir={rtl ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("share.unavailableTitle")}</h1>
        <p className="text-muted-foreground">{t("share.unavailableBody")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40" dir={rtl ? "rtl" : "ltr"}>
      {/* Top banner */}
      <div className="w-full text-white px-4 md:px-8 py-3 flex items-center justify-between" style={{ background: "#461bb6" }}>
        <div className="font-bold text-sm md:text-base">{t("share.brandTitle")}</div>
        <div className="text-[11px] md:text-xs opacity-90">{t("share.poweredBy")}</div>
      </div>

      <div className="max-w-[1100px] mx-auto p-4 md:p-8 space-y-5">
        {/* Profile header */}
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
            </div>
            <div className="grid grid-cols-3 gap-3 sm:w-auto w-full">
              <div className="text-center"><div className="text-[10px] text-muted-foreground uppercase">{t("reports.followers")}</div><div className="text-sm font-bold text-foreground">{nfmt(r.followers)}</div></div>
              <div className="text-center"><div className="text-[10px] text-muted-foreground uppercase">{t("reports.er")}</div><div className="text-sm font-bold text-foreground">{pct(r.engagement_rate)}</div></div>
              <div className="text-center"><div className="text-[10px] text-muted-foreground uppercase">{t("reports.score")}</div><div className="text-sm font-bold" style={{ color: "#461bb6" }}>{r.overall_score}</div></div>
            </div>
          </div>
          {r.biography && <p className="text-sm text-foreground leading-relaxed mt-4 whitespace-pre-wrap break-words">{r.biography}</p>}
        </div>

        <Section title={t("report.overview")}><OverviewTab r={r} /></Section>
        <Section title={t("report.audience")}><AudienceTab r={r} /></Section>
        <Section title={t("report.growth")}><GrowthTab r={r} /></Section>
        <Section title={t("report.engagement")}><EngagementTab r={r} /></Section>
        <Section title={t("report.content")}><ContentTab r={r} /></Section>
        <Section title={t("report.reach")}><ReachTab r={r} /></Section>
        <Section title={t("share.brandMentions")}><BrandTab r={r} /></Section>

        <footer className="text-center text-xs text-muted-foreground py-8">
          {t("share.footer")}
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#461bb6] px-1">{title}</h2>
      {children}
    </div>
  );
}
