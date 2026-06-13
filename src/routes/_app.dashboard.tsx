import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Sparkles, ShieldCheck, ArrowRight, Eye, Scale, Trash2 } from "lucide-react";
import { nfmt, pct, imgProxy, platformBadgeClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: infls = [] } = useQuery({
    queryKey: ["infls"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("id, created_at, engagement_rate, audience_quality_score");
      return data || [];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("influencers")
        .select("id, influencer_name, username, platform, profile_pic_url, followers, engagement_rate, overall_score, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const total = infls.length;
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = infls.filter(i => new Date(i.created_at).getTime() > weekAgo).length;
  const avgER = total ? infls.reduce((s, i) => s + Number(i.engagement_rate || 0), 0) / total : 0;
  const avgQ = total ? Math.round(infls.reduce((s, i) => s + Number(i.audience_quality_score || 0), 0) / total) : 0;

  const stats = [
    { label: t("dashboard.totalInfluencers"), value: nfmt(total), icon: Users },
    { label: t("nav.tracked"), value: nfmt(thisWeek), icon: TrendingUp },
    { label: t("dashboard.avgEngagement"), value: pct(avgER), icon: Sparkles },
    { label: t("dashboard.avgQuality"), value: `${avgQ}/100`, icon: ShieldCheck },
  ];

  const remove = async (id: string) => {
    if (!confirm(t("common.confirm") + "?")) return;
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("common.success"));
    qc.invalidateQueries({ queryKey: ["dashboard-recent"] });
    qc.invalidateQueries({ queryKey: ["infls"] });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-card rounded-xl p-5 border-l-4 border-l-transparent hover:border-l-[#461bb6] hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">{t("dashboard.analyzeNew")}</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {t("dashboard.analyzeBlurb")}
        </p>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          {t("dashboard.startAnalysis")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Recent Analyses */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("dashboard.recent")}</h2>
          <Link to="/reports" className="text-xs font-semibold text-primary hover:underline">{t("nav.reports")} →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Photo</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">@username</th>
                  <th className="text-left py-2 font-medium">Platform</th>
                  <th className="text-right py-2 font-medium">Followers</th>
                  <th className="text-right py-2 font-medium">ER</th>
                  <th className="text-right py-2 font-medium">Score</th>
                  <th className="text-left py-2 font-medium pl-3">Date</th>
                  <th className="text-right py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-background">
                    <td className="py-2">
                      <img src={imgProxy(r.profile_pic_url) || "https://i.pravatar.cc/40"} alt="" className="h-9 w-9 rounded-full object-cover" />
                    </td>
                    <td className="py-2 font-medium text-foreground">{r.influencer_name || "—"}</td>
                    <td className="py-2 text-muted-foreground">@{r.username}</td>
                    <td className="py-2">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-xs", platformBadgeClass(r.platform))}>{r.platform}</span>
                    </td>
                    <td className="py-2 text-right">{nfmt(r.followers)}</td>
                    <td className="py-2 text-right">{pct(r.engagement_rate)}</td>
                    <td className="py-2 text-right font-semibold text-primary">{r.overall_score || 0}</td>
                    <td className="py-2 pl-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate({ to: "/report/$id", params: { id: r.id } })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => navigate({ to: "/compare", search: { ids: r.id } as any })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent" title="Compare">
                          <Scale className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(r.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
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
