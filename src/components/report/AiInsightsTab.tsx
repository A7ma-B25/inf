import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getInfluencerAiSummary, getBrandMatchScore, simulateCampaign, analyzeBrandSafety,
  type AiSummary, type BrandMatch, type CampaignSim, type BrandSafety,
} from "@/lib/ai-insights.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ShieldCheck, Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { nfmt } from "@/lib/format";

function Card({ title, icon: Icon, children, action }: any) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-[#461bb6]" />}
          <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PurpleBtn({ onClick, loading, children }: any) {
  return (
    <button onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
      style={{ background: "#461bb6" }}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  const map = {
    good: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-red-100 text-red-800",
    info: "bg-[#dad1f0] text-[#461bb6]",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${map[tone]}`}>{children}</span>;
}

function BulletList({ items, icon: Icon, color }: { items: string[]; icon?: any; color?: string }) {
  if (!items.length) return <div className="text-xs text-muted-foreground">—</div>;
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 items-start text-[13px] text-foreground">
          {Icon && <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color }} />}
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── 1) AI Summary card ───────────────────────────────────────────────

function SummaryCard({ id }: { id: string }) {
  const fn = useServerFn(getInfluencerAiSummary);
  const m = useMutation({ mutationFn: () => fn({ data: { influencerId: id } }) });
  const d = m.data as AiSummary | undefined;
  return (
    <Card title="AI Influencer Summary" icon={Sparkles}
      action={<PurpleBtn onClick={() => m.mutate()} loading={m.isPending}>{d ? "تحديث" : "توليد"}</PurpleBtn>}>
      {m.isPending && <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-5/6" /></div>}
      {m.isError && <div className="text-xs text-red-600">فشل التوليد. حاول مرة أخرى.</div>}
      {!m.isPending && !d && <div className="text-xs text-muted-foreground">اضغط "توليد" لتحليل الإنفلونسر بالذكاء الاصطناعي.</div>}
      {d && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">نقاط القوة</div>
              <BulletList items={d.strengths} icon={CheckCircle2} color="#10b981" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">نقاط الضعف</div>
              <BulletList items={d.weaknesses} icon={XCircle} color="#ef4444" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">نوع الجمهور</div>
              <div className="text-[13px] text-foreground">{d.audience_type || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">القطاعات الأنسب</div>
              <div className="flex flex-wrap gap-1.5">
                {d.best_industries.map((i, k) => <Pill key={k} tone="info">{i}</Pill>)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">مخاطر</div>
              <BulletList items={d.risks} icon={AlertTriangle} color="#f59e0b" />
            </div>
            {d.overall_recommendation && (
              <div className="mt-2 p-3 rounded bg-[#f5f5f5] text-[13px] text-foreground">{d.overall_recommendation}</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── 2) Brand Match card ──────────────────────────────────────────────

function BrandMatchCard({ id }: { id: string }) {
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const fn = useServerFn(getBrandMatchScore);
  const m = useMutation({ mutationFn: () => fn({ data: { influencerId: id, industry, country, audienceType } }) });
  const d = m.data as BrandMatch | undefined;
  const recTone = d?.recommendation === "Use" ? "good" : d?.recommendation === "Avoid" ? "bad" : "warn";
  const recAr = d?.recommendation === "Use" ? "موصى به" : d?.recommendation === "Avoid" ? "غير موصى به" : "ربما";
  return (
    <Card title="AI Brand Match Score" icon={Target}>
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={industry} onChange={(e) => setIndustry(e.target.value)}
          placeholder="القطاع (مثلاً: تجميل)"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
        <input value={country} onChange={(e) => setCountry(e.target.value)}
          placeholder="الدولة المستهدفة"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
        <input value={audienceType} onChange={(e) => setAudienceType(e.target.value)}
          placeholder="نوع الجمهور (مثلاً: نساء 25-34)"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
      </div>
      <PurpleBtn onClick={() => m.mutate()} loading={m.isPending}>احسب درجة التطابق</PurpleBtn>
      {m.isError && <div className="text-xs text-red-600">فشل الحساب.</div>}
      {d && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[36px] font-bold text-foreground leading-none">{d.score}<span className="text-base text-muted-foreground">/100</span></div>
            <Pill tone={recTone}>{recAr}</Pill>
          </div>
          {d.summary_ar && <div className="text-[13px] text-foreground">{d.summary_ar}</div>}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">أسباب</div>
            <BulletList items={d.reasons} icon={CheckCircle2} color="#461bb6" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── 3) Campaign Simulator ────────────────────────────────────────────

function SimulatorCard({ id }: { id: string }) {
  const [budget, setBudget] = useState(1000);
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const fn = useServerFn(simulateCampaign);
  const m = useMutation({ mutationFn: () => fn({ data: { influencerId: id, budget: Number(budget) || 0, country, industry } }) });
  const d = m.data as CampaignSim | undefined;
  return (
    <Card title="AI Campaign Simulator" icon={TrendingUp}>
      <div className="grid sm:grid-cols-3 gap-2">
        <input type="number" min={50} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
          placeholder="الميزانية (USD)" className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
        <input value={country} onChange={(e) => setCountry(e.target.value)}
          placeholder="الدولة" className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
        <input value={industry} onChange={(e) => setIndustry(e.target.value)}
          placeholder="القطاع" className="px-3 py-2 rounded-md border border-border bg-background text-sm" />
      </div>
      <PurpleBtn onClick={() => m.mutate()} loading={m.isPending}>محاكاة الحملة</PurpleBtn>
      {m.isError && <div className="text-xs text-red-600">فشل الحساب.</div>}
      {d && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["عدد المنشورات", String(d.posts_count)],
              ["الوصول التقديري", nfmt(d.estimated_reach)],
              ["الظهور التقديري", nfmt(d.estimated_impressions)],
              ["التفاعل المتوقع", nfmt(d.estimated_engagement)],
              ["النقرات التقديرية", nfmt(d.estimated_clicks)],
              ["التحويلات", nfmt(d.estimated_conversions)],
              ["CPM", `$${d.estimated_cpm}`],
              ["CPC", `$${d.estimated_cpc}`],
            ].map(([l, v]) => (
              <div key={l} className="bg-muted/40 rounded p-3">
                <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
                <div className="text-[16px] font-bold text-foreground">{v}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#f5f5f5] rounded p-4 flex items-center justify-between">
            <div className="text-[12px] text-muted-foreground">ROI التقديري</div>
            <div className={`text-[24px] font-bold ${d.estimated_roi_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {d.estimated_roi_pct >= 0 ? "+" : ""}{d.estimated_roi_pct}%
            </div>
          </div>
          {d.explanation_ar && <div className="text-[13px] text-foreground">{d.explanation_ar}</div>}
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">الفرضيات المستخدمة</summary>
            <ul className="list-disc pr-5 mt-2 space-y-1">
              {d.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </details>
        </div>
      )}
    </Card>
  );
}

// ─── 4) Brand Safety ──────────────────────────────────────────────────

function BrandSafetyCard({ id }: { id: string }) {
  const fn = useServerFn(analyzeBrandSafety);
  const m = useMutation({ mutationFn: () => fn({ data: { influencerId: id } }) });
  const d = m.data as BrandSafety | undefined;
  const badgeMap = { green: "good", yellow: "warn", red: "bad" } as const;
  const badgeText = { green: "آمن للعلامة التجارية", yellow: "حذر متوسط", red: "مخاطرة عالية" };
  return (
    <Card title="Brand Safety Analysis" icon={ShieldCheck}
      action={<PurpleBtn onClick={() => m.mutate()} loading={m.isPending}>{d ? "تحديث" : "تحليل"}</PurpleBtn>}>
      <div className="text-[11px] text-muted-foreground">تحليل يعتمد على نصوص المنشورات الأخيرة فقط (Captions + Bio).</div>
      {m.isPending && <Skeleton className="h-20 w-full" />}
      {m.isError && <div className="text-xs text-red-600">فشل التحليل.</div>}
      {d && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[36px] font-bold text-foreground leading-none">{d.score}<span className="text-base text-muted-foreground">/100</span></div>
            <Pill tone={badgeMap[d.badge]}>{badgeText[d.badge]}</Pill>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["محتوى سام", d.toxic_score],
              ["محتوى سياسي", d.political_score],
              ["محتوى حساس", d.sensitive_score],
            ].map(([l, v]) => (
              <div key={String(l)} className="bg-muted/40 rounded p-3">
                <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
                <div className="text-[18px] font-bold text-foreground">{v}%</div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div className="h-full" style={{ width: `${v}%`, background: Number(v) >= 50 ? "#ef4444" : Number(v) >= 25 ? "#f59e0b" : "#10b981" }} />
                </div>
              </div>
            ))}
          </div>
          {d.flagged_phrases.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">عبارات مرصودة</div>
              <div className="flex flex-wrap gap-1.5">
                {d.flagged_phrases.map((p, i) => <Pill key={i} tone="warn">{p}</Pill>)}
              </div>
            </div>
          )}
          <div className="text-[13px] text-foreground">{d.explanation_ar}</div>
        </div>
      )}
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function AiInsightsTab({ influencerId }: { influencerId: string }) {
  return (
    <div className="space-y-5">
      <SummaryCard id={influencerId} />
      <BrandMatchCard id={influencerId} />
      <SimulatorCard id={influencerId} />
      <BrandSafetyCard id={influencerId} />
    </div>
  );
}
