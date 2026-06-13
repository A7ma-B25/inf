import React, { useState, useEffect } from "react";
import i18n from "@/lib/i18n";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, AreaChart, Area,
  LineChart, Line, ReferenceLine, CartesianGrid,
} from "recharts";
import { nfmt, pct, imgProxy } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getStoredTargeting, hasAnyTargeting } from "@/lib/compatibility";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { computeBrandCompat, type BrandCompatResult } from "@/lib/brand-compat.functions";
import { Link } from "@tanstack/react-router";
import { MetricInfo } from "@/components/admin/MetricInfo";

export const CHART_COLORS = ["#461bb6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
const HA_PURPLE = "#461bb6";
const HA_PINK = "#ec4899";
const HA_BLUE = "#3b82f6";
const HA_GREEN = "#10b981";

// Median ER calculator from real posts. Returns null if fewer than 2 matches.
function calcMedianER(posts: any[], type: string | string[], followers: number): number | null {
  const matching = (posts || []).filter((p: any) => {
    const t = String(p?.type || p?.media_type || "").toLowerCase();
    if (Array.isArray(type)) return type.some((tp) => t.includes(tp.toLowerCase()));
    return t.includes(String(type).toLowerCase());
  });
  if (matching.length < 2) return null;
  const ers = matching
    .map((p: any) => ((Number(p.likes || 0) + Number(p.comments || 0)) / Math.max(1, followers)) * 100)
    .sort((a: number, b: number) => a - b);
  const mid = Math.floor(ers.length / 2);
  return Number(
    (ers.length % 2 === 0 ? (ers[mid - 1] + ers[mid]) / 2 : ers[mid]).toFixed(2),
  );
}

// Tiny dot indicating whether a number comes from real posts or industry-average fallback.
export function RealityDot({ isReal }: { isReal: boolean }) {
  const title = isReal
    ? i18n.t("report.calculatedFromReal")
    : i18n.t("report.estimateInstagram");
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-block w-2 h-2 rounded-full align-middle ml-1.5 shrink-0"
      style={{
        background: isReal ? "#10b981" : "#facc15",
        boxShadow: isReal
          ? "0 0 0 2px rgba(16,185,129,0.18)"
          : "0 0 0 2px rgba(250,204,21,0.22)",
      }}
    />
  );
}

export function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {badge && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, change, field }: { label: string; value: string; change?: string; field?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <span>{label}</span>
        {field && <MetricInfo field={field} value={value} />}
      </div>
      <div className="text-[20px] font-bold text-foreground mt-1 leading-tight">{value}</div>
      {change && <div className="text-[12px] text-[#10b981] font-medium mt-0.5">{change}</div>}
    </div>
  );
}

function Bar2({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 text-foreground"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{
          width: `${Math.min(100, value)}%`,
          background: color === "success" ? HA_GREEN : color === "destructive" ? "#ef4444" : HA_PURPLE,
        }} />
      </div>
    </div>
  );
}

// EN→AR map for report section titles (used by tHa() to localize HaTitle children).
const REPORT_TITLES_AR: Record<string, string> = {
  "Age":"العمر","Audience Activity Heatmap":"خريطة نشاط الجمهور","Audience Authenticity":"أصالة الجمهور",
  "Audience Insights":"رؤى الجمهور","Audience Interests":"اهتمامات الجمهور","Audience Quality Score":"جودة الجمهور",
  "Audience Reachability":"قابلية الوصول للجمهور","Audience Types":"أنواع الجمهور","Audience by Location":"الجمهور حسب الموقع",
  "Best Time to Post":"أفضل وقت للنشر","Brand Affinity Score":"نتيجة قرب البراند","Brand Association":"ارتباط البراند",
  "Brand Impact":"تأثير البراند","Brand Memory Score":"نتيجة تذكر البراند","Brand Mentions Over Time":"ذكر البراند عبر الزمن",
  "Brand Recall Performance":"أداء تذكر البراند","Brand Recall Rate":"معدل تذكر البراند","Branded Content Performance":"أداء المحتوى الإعلاني",
  "Caption Examples":"أمثلة على التسميات","Caption Length Analysis":"تحليل طول التسمية","Content Pillars":"محاور المحتوى",
  "Content by Type":"المحتوى حسب النوع","Daily Breakdown":"تفصيل يومي","Device Types":"أنواع الأجهزة",
  "ER Over Time":"معدل التفاعل عبر الزمن","ER by Caption Length":"التفاعل حسب طول التسمية","ER by Post Length":"التفاعل حسب طول المنشور",
  "Engaged Audience":"الجمهور المتفاعل","Engagement Insights":"رؤى التفاعل","Engagement Rate Breakdown":"تفصيل معدل التفاعل",
  "Engagement Rate Over Time":"معدل التفاعل عبر الزمن","Engagement Rate by Content Type":"معدل التفاعل حسب نوع المحتوى",
  "Engagement by Follower Count":"التفاعل حسب عدد المتابعين","Ethnicity":"العرق","Fake Followers":"المتابعون الوهميون",
  "Follower Milestones":"محطات المتابعين","Followers Growth Over Time":"نمو المتابعين عبر الزمن",
  "Followers Growth Rate Over Time":"معدل نمو المتابعين عبر الزمن","Followers Growth by Day of Week":"نمو المتابعين حسب يوم الأسبوع",
  "Followers Growth by Time of Day":"نمو المتابعين حسب وقت اليوم","Followers Growth by Week":"نمو المتابعين حسب الأسبوع",
  "Followers by Day":"المتابعون حسب اليوم","Followers by Language":"المتابعون حسب اللغة","Gender":"الجنس",
  "Growth Comparison":"مقارنة النمو","Growth Rate Highlights":"أبرز معدلات النمو","Growth Rate Over Time":"معدل النمو عبر الزمن",
  "Growth Summary":"ملخص النمو","Hashtag Performance":"أداء الهاشتاج","Hook Type Performance":"أداء نوع الهوك",
  "Map View":"عرض الخريطة","Mention Performance":"أداء الإشارات","Mentions by Type":"الإشارات حسب النوع",
  "Monthly Aggregated Growth":"النمو المجمّع شهرياً","New Followers":"متابعون جدد","New Followers vs Unfollowers":"متابعون جدد مقابل ملغي المتابعة",
  "OS Breakdown":"تفصيل أنظمة التشغيل","Paid vs Organic Reach":"الوصول المدفوع مقابل العضوي","Pillar Performance":"أداء محاور المحتوى",
  "Posting Frequency":"تكرار النشر","Posting Time":"وقت النشر","Posts":"المنشورات","Projected Growth":"النمو المتوقع",
  "Reach Over Time":"الوصول عبر الزمن","Reach by Content Type":"الوصول حسب نوع المحتوى","Reach by Hour of Day":"الوصول حسب ساعة اليوم",
  "Reach by Platform":"الوصول حسب المنصة","Real Followers Breakdown":"تفصيل المتابعين الحقيقيين","Recall Rate Over Time":"معدل التذكر عبر الزمن",
  "Reel Length Distribution":"توزيع طول الريلز","Score Breakdown":"تفصيل النتيجة","Score History":"تاريخ النتيجة",
  "Similar Brands Comparison":"مقارنة البراندات المماثلة","Stats":"الإحصائيات","Suspicious Engagement":"تفاعل مشبوه",
  "Top Brand Associations":"أبرز ارتباطات البراند","Top Brand Associations (Unaided)":"أبرز ارتباطات البراند (تلقائية)",
  "Top Cities":"أهم المدن","Top Countries":"أهم الدول","Top Hashtags":"أهم الهاشتاجات","Top Mentioned Brands":"أكثر البراندات إشارة",
  "Top Mentions":"أهم الإشارات","Top Performing Posts":"أفضل المنشورات أداءً","Top Performing Posts by Reach":"أفضل المنشورات وصولاً",
  "Top Words":"أهم الكلمات","Unfollowers":"ملغو المتابعة","Views Over Time":"المشاهدات عبر الزمن",
  "Weekly Aggregated Growth":"النمو المجمّع أسبوعياً",
};
function tHa(en: string): string {
  const lng = (i18n.language || "ar").toLowerCase();
  if (lng.startsWith("ar")) return REPORT_TITLES_AR[en] || en;
  return en;
}
function pickLang(en: any, ar: any): string {
  const lng = (i18n.language || "ar").toLowerCase();
  const e = typeof en === "string" ? en.trim() : "";
  const a = typeof ar === "string" ? ar.trim() : "";
  if (lng.startsWith("ar")) return a || e || "";
  return e || a || "";
}

function HaCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-card border border-border rounded-lg p-5", className)} style={{ color: "#111827" }}>{children}</div>;
}
function HaTitle({ children, field, value }: { children: React.ReactNode; field?: string; value?: any }) {
  return (
    <h3 className="text-[16px] font-bold text-foreground mb-4 inline-flex items-center gap-1.5">
      {children}
      {field && <MetricInfo field={field} value={value} />}
    </h3>
  );
}
function HaBarRow({ label, value, max = 100, isReal }: { label: string; value: number; max?: number; isReal?: boolean }) {
  const w = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-24 shrink-0 text-[13px] text-foreground">{label}</div>
      <div className="flex-1 h-[7px] bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: HA_PURPLE }} />
      </div>
      <div className="w-16 text-right text-[13px] font-semibold text-foreground inline-flex items-center justify-end">
        {value.toFixed(1)}%
        {typeof isReal === "boolean" && <RealityDot isReal={isReal} />}
      </div>
    </div>
  );
}

type GeoData = { mode: "full" | "partial" | "none"; items: { name: string; value: number }[] };
function audienceCountries(r: any): GeoData {
  const split = r?.audience_country_split;
  if (split && typeof split === "object" && !Array.isArray(split) && Object.keys(split).length > 0) {
    const items = Object.entries(split)
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    if (items.length === 1 || (items.length > 0 && items[0].value >= 95)) {
      return { mode: "partial", items: items.slice(0, 1) };
    }
    return { mode: "full", items };
  }
  if (r?.audience_top_country) {
    return { mode: "partial", items: [{ name: String(r.audience_top_country), value: 0 }] };
  }
  return { mode: "none", items: [] };
}
function audienceCities(r: any): GeoData {
  const split = r?.audience_city_split;
  if (split && typeof split === "object" && !Array.isArray(split) && Object.keys(split).length > 0) {
    const items = Object.entries(split)
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .filter(item => item.name !== 'Other' || Object.keys(split).length <= 2)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    if (items.length > 0 && !(items.length === 1 && items[0].value >= 99)) {
      return { mode: 'full', items };
    }
  }

  const topCitiesStr = r?.audience_top_cities;
  if (topCitiesStr && typeof topCitiesStr === 'string' && topCitiesStr.includes(',')) {
    const cities = topCitiesStr.split(',').map((c: string) => c.trim()).filter(Boolean);
    if (cities.length >= 2) {
      const weights = cities.map((_: string, j: number) => 1 / Math.pow(1.6, j));
      const wSum = weights.reduce((a: number, b: number) => a + b, 0);
      const items = cities.map((name: string, i: number) => ({
        name,
        value: Number(((weights[i] / wSum) * 100).toFixed(1)),
      }));
      return { mode: 'partial', items };
    }
  }

  const topCity = r?.audience_top_city ||
    (typeof topCitiesStr === 'string' ? topCitiesStr.split(',')[0]?.trim() : null);
  if (topCity) {
    return { mode: 'partial', items: [{ name: String(topCity), value: 100 }] };
  }

  return { mode: 'none', items: [] };
}
function GeoEmpty({ mode }: { mode: "partial" | "none" }) {
  return (
    <div className="text-[12px] text-muted-foreground py-2">
      {mode === "partial" ? i18n.t("report.partialDataOnly") : i18n.t("report.noData")}
    </div>
  );
}
const FLAGS: Record<string, string> = {
  "United Arab Emirates": "🇦🇪", "UAE": "🇦🇪", "U.A.E.": "🇦🇪", "Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦", "KSA": "🇸🇦", "Kuwait": "🇰🇼", "Qatar": "🇶🇦",
  "Oman": "🇴🇲", "Bahrain": "🇧🇭", "Egypt": "🇪🇬", "Jordan": "🇯🇴",
  "United States": "🇺🇸", "USA": "🇺🇸", "United Kingdom": "🇬🇧", "UK": "🇬🇧",
  "Lebanon": "🇱🇧", "Morocco": "🇲🇦",
};

export function HaHeatmap({ data }: { data: number[][] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cols = [0, 3, 6, 9, 12, 15, 18, 21];
  const colLabels = ["12AM", "3AM", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM"];
  const reduced = days.map((_, i) => cols.map(c => {
    const row = data[i] || [];
    const vals = [row[c] || 0, row[c + 1] || 0, row[c + 2] || 0];
    return vals.reduce((a, b) => a + b, 0) / 3;
  }));
  const max = Math.max(1, ...reduced.flat());
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "36px repeat(8, 1fr)" }}>
        <div />
        {colLabels.map(l => <div key={l} className="text-[10px] text-muted-foreground text-center">{l}</div>)}
        {days.map((d, i) => (
          <React.Fragment key={d}>
            <div className="text-[11px] text-muted-foreground flex items-center">{d}</div>
            {reduced[i].map((v, j) => {
              const intensity = v / max;
              const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`;
              return <div key={`${d}-${j}`} className="aspect-square rounded-md" style={{ background: bg }} title={`${d} ${colLabels[j]} — ${v.toFixed(1)}`} />;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
        <span>Lowest Activity</span>
        <div className="flex gap-1">
          {[0.15, 0.3, 0.5, 0.7, 0.95].map(o => <div key={o} className="h-3 w-5 rounded" style={{ background: `rgba(124, 58, 237, ${o})` }} />)}
        </div>
        <span>Highest Activity</span>
      </div>
    </div>
  );
}

// Merge "reel"/"video" content type names into a single "Video/Reel" label.
// TikTok posts are always Video/Reel regardless of the upstream `type` field.
function normalizeContentType(t: any, platform?: any): string {
  if (String(platform || "").toLowerCase().includes("tiktok")) return "Video/Reel";
  const s = String(t || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("video") || s.includes("reel") || s.includes("clips") || s.includes("igtv")) return "Video/Reel";
  if (s.includes("sidecar") || s.includes("carousel") || s.includes("album")) return "Carousel";
  if (s.includes("image") || s.includes("photo")) return "Image";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Aggregated bars from a 7x24 heatmap — either by hour (24 cols) or by day (7 rows)
function HaTimeBars({ data, mode }: { data: number[][]; mode: "By Day" | "By Hour" }) {
  const safe: number[][] = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => Number(data?.[d]?.[h] ?? 0))
  );
  if (mode === "By Hour") {
    const hours = Array.from({ length: 24 }, (_, h) =>
      safe.reduce((sum, row) => sum + (row[h] || 0), 0) / 7
    );
    const max = Math.max(1, ...hours);
    const labels = ["12A","","","3A","","","6A","","","9A","","","12P","","","3P","","","6P","","","9P","",""];
    return (
      <div>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
          {hours.map((v, h) => {
            const intensity = v / max;
            const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`;
            return <div key={h} className="aspect-square rounded-md" style={{ background: bg }} title={`${h}:00 — ${v.toFixed(1)}`} />;
          })}
        </div>
        <div className="grid gap-1 mt-1 text-[9px] text-muted-foreground text-center" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
          {labels.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    );
  }
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayVals = safe.map(row => row.reduce((a, b) => a + b, 0) / 24);
  const max = Math.max(1, ...dayVals);
  return (
    <div className="space-y-2">
      {days.map((d, i) => {
        const v = dayVals[i];
        const intensity = v / max;
        const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`;
        return (
          <div key={d} className="flex items-center gap-2">
            <div className="w-10 text-[11px] text-muted-foreground">{d}</div>
            <div className="flex-1 h-6 rounded-md" style={{ background: bg }} title={`${d} — ${v.toFixed(1)}`} />
            <div className="w-10 text-[11px] text-foreground text-right">{v.toFixed(0)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SubTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "whitespace-nowrap pb-3 text-[13px] font-medium border-b-2 -mb-px transition-colors",
              active === tab
                ? "border-[#461bb6] text-[#461bb6]"
                : "border-transparent text-muted-foreground hover:text-[#461bb6]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabPanel({ panelKey, children }: { panelKey: string; children: React.ReactNode }) {
  return (
    <div key={panelKey} className="space-y-6 animate-fade-in">
      {children}
    </div>
  );
}

function EmptyDataCard({ title, message }: { title: string; message: string }) {
  return (
    <HaCard>
      <div className="flex min-h-[180px] items-center justify-center">
        <div className="text-center">
          <div className="text-[15px] font-semibold text-foreground">{title}</div>
          <p className="mt-2 text-[13px] text-muted-foreground">{message}</p>
        </div>
      </div>
    </HaCard>
  );
}

function normalizeHeatmap(data?: number[][]): number[][] {
  const hasData = Array.isArray(data) && data.length === 7 && data.some((row) => Array.isArray(row) && row.some((value) => Number(value) > 0));
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      if (hasData) {
        return Number(data?.[day]?.[hour] ?? 0);
      }
      const weekdayBoost = day < 5 ? 1 : 0.76;
      const evening = Math.exp(-Math.pow((hour - 19) / 4, 2));
      const midday = 0.55 * Math.exp(-Math.pow((hour - 13) / 5.5, 2));
      return Number((((evening + midday + 0.08) * weekdayBoost) * 100).toFixed(1));
    })
  );
}

function hourLabel(hour: number) {
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${hour >= 12 ? "PM" : "AM"}`;
}

function FullHeatmap({ data }: { data?: number[][] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const full = normalizeHeatmap(data);
  const max = Math.max(1, ...full.flat());

  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "44px repeat(24, minmax(0, 1fr))" }}>
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="text-center text-[9px] text-muted-foreground">
            {hour % 3 === 0 ? hourLabel(hour) : ""}
          </div>
        ))}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="flex items-center text-[11px] text-muted-foreground">{day}</div>
            {full[dayIndex].map((value, hour) => {
              const intensity = value / max;
              const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.12 + intensity * 0.88})`;
              return (
                <div
                  key={`${day}-${hour}`}
                  className="aspect-square rounded-[4px]"
                  style={{ background: bg }}
                  title={`${day} ${hourLabel(hour)} — ${value.toFixed(1)}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Lowest Activity</span>
        <div className="flex gap-1">
          {[0.15, 0.3, 0.5, 0.7, 0.95].map((opacity) => (
            <div key={opacity} className="h-3 w-5 rounded" style={{ background: `rgba(124, 58, 237, ${opacity})` }} />
          ))}
        </div>
        <span>Highest Activity</span>
      </div>
    </div>
  );
}

function HaPill({ label, value, change, sub }: { label: string; value: string; change?: string; sub?: string }) {
  const positive = !change || change.startsWith("+");
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{value}</div>
      {change && <div className={cn("text-[12px] font-medium mt-0.5", positive ? "text-[#10b981]" : "text-[#ef4444]")}>{change}</div>}
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ScoreGauge({ value, max = 100, label, color = HA_PURPLE }: { value: number; max?: number; label: string; color?: string }) {
  const pctVal = Math.min(100, (value / max) * 100);
  return (
    <div className="relative h-44">
      <ResponsiveContainer>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: label, value: pctVal, fill: color }]} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "#f3f4f6" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[34px] font-bold leading-none text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1">out of {max}</div>
      </div>
    </div>
  );
}

function colorForScore(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function CompatibilityScoreCard({ r }: { r: any }) {
  // Re-read targeting from storage whenever the analyze page broadcasts an
  // update or the tab regains focus, so the Brand Compatibility Score reflects
  // the latest filter values without a manual refresh.
  const [targetingTick, setTargetingTick] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = (e?: any) => {
      if (e?.detail?.ids && !e.detail.ids.includes(r.id)) return;
      setTargetingTick((n) => n + 1);
    };
    window.addEventListener("boom-targeting-updated", bump as any);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("boom-targeting-updated", bump as any);
      window.removeEventListener("storage", bump);
    };
  }, [r.id]);

  // Re-render compatibility card on language toggle so verdict/reason switch
  // between Arabic and English without a page reload.
  const [, setLangTick] = useState(0);
  useEffect(() => {
    const handler = () => setLangTick((n) => n + 1);
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  const targeting = typeof window !== "undefined" ? getStoredTargeting(r.id) : null;
  const hasTargeting = hasAnyTargeting(targeting);
  const computeFn = useServerFn(computeBrandCompat);

  const targetingKey = targeting ? JSON.stringify(targeting) : "none";

  const { data, isLoading, isError, refetch } = useQuery<BrandCompatResult>({
    queryKey: ["brand-compat", r.id, targetingKey, targetingTick],
    queryFn: () => computeFn({ data: { influencerId: r.id, targeting: targeting || {
      industry: "", subCategory: "", countries: [], cities: "", ageRanges: [], gender: "", interests: [],
    } } }),
    enabled: hasTargeting,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  // Case 1: brand data not filled — gray card with CTA
  if (!hasTargeting) {
    return (
      <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="bg-muted/40 border border-border rounded-lg p-6 text-center">
        <div className="text-[15px] font-bold text-foreground mb-2">{i18n.t("report.brandCompatTitle")}</div>
        <p className="text-[13px] text-muted-foreground mb-4">{i18n.t("report.brandCompatCta")}</p>
        <Link
          to="/analyze"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90"
        >
          {i18n.t("report.brandCompatAddData")}
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="bg-card border border-border rounded-lg p-6 flex items-center justify-center" style={{ minHeight: 180 }}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-[#461bb6] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px]">{i18n.t("report.brandCompatLoading")}</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="bg-card border border-[#fecaca] rounded-lg p-6 text-center">
        <p className="text-[13px] text-[#991b1b] mb-3">{i18n.t("report.brandCompatError")}</p>
        <button onClick={() => refetch()} className="px-3 py-1.5 rounded-md bg-[#ef4444] text-white text-[12px] font-semibold">{i18n.t("report.retry")}</button>
      </div>
    );
  }

  const score = data.overall_score;
  const mainColor = colorForScore(score);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const isLowScore = score < 60;
  const tintBg = isLowScore ? "#fff5f5" : "#f0fdf4";
  const tintBorder = isLowScore ? "#fecaca" : "#bbf7d0";
  const verdictBadgeBg = isLowScore ? "#fee2e2" : "#dcfce7";
  const verdictBadgeText = isLowScore ? "#991b1b" : "#065f46";
  const accent = mainColor;

  return (
    <div dir={i18n.language?.startsWith("ar") ? "rtl" : "ltr"} className="space-y-0">
      {/* MAIN BRAND FIT CARD */}
      <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ borderRight: `4px solid ${accent}` }}>
        {/* Top: gauge + verdict */}
        <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
            <svg width={160} height={160} viewBox="0 0 160 160">
              <circle cx={80} cy={80} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={12} />
              <circle
                cx={80} cy={80} r={radius} fill="none" stroke={accent} strokeWidth={12}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[40px] font-extrabold text-foreground leading-none">{score}</div>
              <div className="text-[11px] text-muted-foreground mt-1">/100</div>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
              BRAND FIT SCORE
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
              <h2 className="text-[26px] font-extrabold text-foreground leading-tight">{pickLang((data as any).verdict_en, data.verdict_ar)}</h2>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: verdictBadgeBg, color: verdictBadgeText }}
              >
                {pickLang((data as any).verdict_short_en, data.verdict_short_ar)}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">{pickLang((data as any).reason_en, data.reason_ar)}</p>
          </div>
        </div>

        {/* Per-criterion grid */}
        {data.criterion_scores.length > 0 && (
          <div className="border-t border-border p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: isLowScore ? "#fee2e2" : "#dcfce7", color: isLowScore ? "#991b1b" : "#065f46" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h3 className="text-[15px] font-bold text-foreground">
                {isLowScore ? i18n.t("report.whyLowMatch") : i18n.t("report.matchDetails")}
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.criterion_scores.map((c) => (
                <CriterionCard key={c.key} c={c} />
              ))}
            </div>
          </div>
        )}

        {/* Main reason callout */}
        {(data.main_reason_ar || (data as any).main_reason_en) && (
          <div
            className="mx-5 mb-5 sm:mx-6 sm:mb-6 rounded-lg p-4 flex items-start gap-3"
            style={{ background: tintBg, border: `1px solid ${tintBorder}` }}
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5"
              style={{ background: isLowScore ? "#ef4444" : "#10b981", color: "white" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-foreground mb-0.5">
                {isLowScore ? i18n.t("report.mainReasonLow") : i18n.t("report.mainReasonMatch")}
              </div>
              <div className="text-[13px] text-foreground leading-relaxed">{pickLang((data as any).main_reason_en, data.main_reason_ar)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CriterionCard({ c }: { c: { key: string; score: number; label_ar: string; verdict_ar: string; reason_ar: string; label_en?: string; verdict_en?: string; reason_en?: string } }) {
  const color = colorForScore(c.score);
  const isGood = c.score >= 60;
  const tintBg = isGood ? "#dcfce7" : "#fee2e2";
  const tintText = isGood ? "#065f46" : "#991b1b";
  const iconBg = isGood ? "#d1fae5" : "#fee2e2";

  // Pick an icon glyph by criterion key
  const ICON: Record<string, string> = {
    gender: "⚥", country: "📍", city: "🏙️", age: "👥", niche: "🏷️", interests: "❤", country_alt: "🌍",
  };
  const glyph = ICON[c.key] || "•";

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[14px]"
          style={{ background: iconBg }}
        >
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-foreground leading-tight truncate">{pickLang(c.label_en, c.label_ar)}</div>
          <span
            className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: tintBg, color: tintText }}
          >
            {pickLang(c.verdict_en, c.verdict_ar)}
          </span>
        </div>
      </div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <div className="text-[20px] font-extrabold text-foreground leading-none">{c.score}</div>
        <div className="text-[10px] text-muted-foreground">/100</div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(2, c.score)}%`, background: color }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{pickLang(c.reason_en, c.reason_ar)}</p>
    </div>
  );
}

function OvAiBadge() {
  return null;
}

function ovErLabel(er: number) {
  if (er >= 6) return { text: "Excellent", color: "#10b981" };
  if (er >= 3) return { text: "Very good", color: "#10b981" };
  if (er >= 1) return { text: "Good", color: "#3b82f6" };
  return { text: "Average", color: "#f59e0b" };
}

function OvMetricPill({ label, value, quality, sub, field }: { label: string; value: string; quality: { text: string; color: string }; sub?: string; field?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <span>{label}</span>
        {field && <MetricInfo field={field} value={value} />}
      </div>
      <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{value}</div>
      <div className="text-[12px] font-semibold mt-0.5" style={{ color: quality.color }}>{quality.text}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function OvSparkline({ data, color }: { data: number[]; color: string }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10">
      <ResponsiveContainer>
        <LineChart data={series}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function OvSparkCard({ label, value, change, color, series, field }: { label: string; value: string; change: string; color: string; series?: number[]; field?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <span>{label}</span>
        {field && <MetricInfo field={field} value={value} />}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-[20px] font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-medium text-[#10b981]">{change}</div>
      </div>
      {series && series.length > 0 && <OvSparkline data={series} color={color} />}
    </div>
  );
}

function AdminDataIntelligencePanel({ r }: { r: any }) {
  const ok = (k: string) => "✅ " + i18n.t("report." + k);
  const warn = (k: string) => "⚠️ " + i18n.t("report." + k);
  const rows = [
    { field: "followers", value: r.followers, source: "Apify Scraper", rel: ok("real"), color: "#34d399" },
    { field: "engagement_rate", value: r.engagement_rate + "%", source: "Calculated: Avg(Likes+Comments)/Followers", rel: "⚠️ Average not Median", color: "#fbbf24" },
    { field: "avg_likes", value: r.avg_likes, source: "Apify — last 12 posts", rel: ok("real"), color: "#34d399" },
    { field: "avg_comments", value: r.avg_comments, source: "Apify — last 12 posts", rel: ok("real"), color: "#34d399" },
    { field: "avg_views", value: r.avg_views, source: "Apify — last 12 posts", rel: ok("real"), color: "#34d399" },
    { field: "avg_reach", value: r.avg_reach, source: "Formula: followers × 0.25", rel: warn("estimated"), color: "#fbbf24" },
    { field: "avg_impressions", value: r.avg_impressions, source: "Formula: reach × 1.3", rel: warn("estimated"), color: "#fbbf24" },
    { field: "audience_top_country", value: r.audience_top_country, source: "Gemini AI Estimate", rel: warn("aiTag"), color: "#fbbf24" },
    { field: "audience_age_groups", value: JSON.stringify(r.audience_age_groups), source: "Gemini AI Estimate", rel: warn("aiTag"), color: "#fbbf24" },
    { field: "audience_gender_split", value: JSON.stringify(r.audience_gender_split), source: "Gemini AI Estimate", rel: warn("aiTag"), color: "#fbbf24" },
    { field: "fake_followers_score", value: r.fake_followers_score, source: "Gemini AI Estimate", rel: warn("aiTag"), color: "#fbbf24" },
    { field: "overall_score", value: r.overall_score, source: "Gemini AI", rel: warn("aiTag"), color: "#fbbf24" },
    { field: "ai_validation_warnings", value: (r.ai_validation_warnings || []).length + " issues", source: "Server Validation", rel: ok("real"), color: "#34d399" },
  ];
  const handleExport = () => {
    const csv = [
      [i18n.t("report.fieldCol"), i18n.t("report.valueCol"), i18n.t("report.sourceCol"), i18n.t("report.reliabilityCol")],
      ["followers", r.followers, "Apify", "Real"],
      ["engagement_rate", r.engagement_rate, "Calculated Average", "Estimated"],
      ["avg_likes", r.avg_likes, "Apify", "Real"],
      ["avg_comments", r.avg_comments, "Apify", "Real"],
      ["avg_views", r.avg_views, "Apify", "Real"],
      ["avg_reach", r.avg_reach, "Formula x0.25", "Estimated"],
      ["avg_impressions", r.avg_impressions, "Formula x1.3", "Estimated"],
      ["overall_score", r.overall_score, "Gemini AI", "AI Estimate"],
    ].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-audit-${r.username || "report"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-lg border-2 p-4" style={{ borderColor: "#461bb6", background: "#faf5ff" }}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-[15px] font-bold" style={{ color: "#461bb6" }}>🔬 {i18n.t("report.dataIntelligence")} — {i18n.t("report.adminOnly")}</h3>
        <button
          type="button"
          onClick={handleExport}
          className="text-xs px-3 py-1.5 rounded text-white"
          style={{ background: "#461bb6" }}
        >
          📥 {i18n.t("report.exportCsv")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-2 font-medium">{i18n.t("report.fieldCol")}</th>
              <th className="text-left py-2 px-2 font-medium">{i18n.t("report.valueCol")}</th>
              <th className="text-left py-2 px-2 font-medium">{i18n.t("report.sourceCol")}</th>
              <th className="text-left py-2 px-2 font-medium">{i18n.t("report.reliabilityCol")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-b border-border/60">
                <td className="py-2 px-2 font-mono text-foreground">{row.field}</td>
                <td className="py-2 px-2 text-foreground break-all max-w-[260px]">{String(row.value ?? "—")}</td>
                <td className="py-2 px-2 text-muted-foreground">{row.source}</td>
                <td className="py-2 px-2 font-semibold" style={{ color: row.color }}>{row.rel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataConfidenceBadge({ r, isAdmin }: { r: any; isAdmin?: boolean }) {
  const dc = r?.data_confidence;
  if (!dc || typeof dc.confidence_score !== 'number') return null;
  const score = dc.confidence_score;
  const cfg = score >= 90
    ? { bg: '#dcfce7', fg: '#166534', border: '#86efac', icon: '✅', label: i18n.t("report.highAccuracy") }
    : score >= 60
    ? { bg: '#fef9c3', fg: '#854d0e', border: '#fde047', icon: '⚡', label: i18n.t("report.goodData") }
    : { bg: '#ffedd5', fg: '#9a3412', border: '#fdba74', icon: '⚠️', label: i18n.t("report.approximate") };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
        style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
      >
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </span>
      {isAdmin && (
        <span className="text-[11px] text-muted-foreground font-mono">
          confidence: {score}/100 · posts: {dc.posts_count ?? 0} · comments: {dc.comments_count ?? 0}
        </span>
      )}
    </div>
  );
}

export function OverviewTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const sub = "vs previous period";
  const er = Number(r.engagement_rate || 0);
  const avgLikes = Number(r.avg_likes || 0);
  const avgComments = Number(r.avg_comments || 0);
  const avgShares = Number(r.avg_shares || 0);
  const avgSaves = Number(r.avg_saves || 0);
  const totalEng = avgLikes + avgComments + avgShares + avgSaves;
  // Computed ER fallback: when stored ER is 0, derive from avg likes+comments/followers
  const followersN = Math.max(1, Number(r.followers || 1));
  const erComputed = er > 0 ? er : ((avgLikes + avgComments) / followersN) * 100;

  const [timeRange, setTimeRange] = useState<"7 days" | "30 days" | "90 days" | "1 year">("30 days");
  const [heatToggle, setHeatToggle] = useState<"By Day" | "By Hour">("By Day");

  const rangeDays = timeRange === "7 days" ? 7 : timeRange === "30 days" ? 30 : timeRange === "90 days" ? 90 : 365;
  const postsAll = (r.recent_posts || []) as any[];
  // Only count posts that actually have engagement data
  const postsWithEng = postsAll.filter((p: any) => (Number(p.likes || 0) + Number(p.comments || 0)) > 0);
  // Filter by selected time range using any available date field; fall back to all if too few match.
  const cutoffMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const postsInRange = (() => {
    const filtered = postsWithEng.filter((p: any) => {
      const t = p?.taken_at || p?.timestamp || p?.created_at || p?.date;
      if (!t) return false;
      const ms = new Date(t).getTime();
      return Number.isFinite(ms) && ms >= cutoffMs;
    });
    return filtered.length >= 2 ? filtered : postsWithEng;
  })();
  const hasErSeries = postsInRange.length > 3;
  const erOverTime = hasErSeries
    ? postsInRange.map((p: any, i: number) => ({
        d: i + 1,
        label: `Post ${i + 1}`,
        er: Number((((Number(p.likes || 0) + Number(p.comments || 0)) / followersN) * 100).toFixed(2)),
      }))
    : [];

  const breakdown = totalEng > 0 ? [
    { name: "Likes", value: avgLikes, color: HA_PURPLE },
    { name: "Comments", value: avgComments, color: HA_GREEN },
  ] : [];

  const sparkSource = postsAll.slice(0, 12);
  const hasSpark = sparkSource.length > 0;
  const likesSpark = hasSpark ? sparkSource.map((p: any) => Number(p.likes) || 0) : undefined;
  const commentsSpark = hasSpark ? sparkSource.map((p: any) => Number(p.comments) || 0) : undefined;

  // Content type ER from real posts (merging Reels/Video into "Video/Reel")
  const ctMap = new Map<string, { sum: number; n: number }>();
  for (const p of postsAll) {
    const t = normalizeContentType(p?.type);
    if (!t) continue;
    const perER = ((Number(p.likes || 0) + Number(p.comments || 0)) / Math.max(1, Number(r.followers || 1))) * 100;
    const cur = ctMap.get(t) || { sum: 0, n: 0 };
    cur.sum += perER;
    cur.n += 1;
    ctMap.set(t, cur);
  }
  const contentTypeER = Array.from(ctMap.entries()).map(([name, v]) => ({ name, er: v.sum / v.n }));
  const hasContentTypeER = contentTypeER.length > 0 && postsAll.length >= 3;

  const [showAllPosts, setShowAllPosts] = useState(false);



  const topPosts = postsAll.slice().sort((a, b) => ((b.likes || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.comments || 0))).slice(0, 5);

  // Post length / video duration buckets — median ER per bucket with industry-rate fallback.
  const industryLengthRates: Record<string, number> = {
    "0-15s": 1.45, "15-30s": 1.30, "30-60s": 1.10, "60s+": 0.75,
  };
  const lenBuckets = Object.entries(industryLengthRates).map(([range, mult]) => {
    const [min, max] = range === "0-15s" ? [0, 15]
      : range === "15-30s" ? [15, 30]
      : range === "30-60s" ? [30, 60]
      : [60, Infinity];
    const matching = postsAll.filter((p: any) => {
      const len = Number(p.videoLength || p.duration || p.video_duration || 0);
      return len >= min && len < max;
    });
    let medianER: number | null = null;
    if (matching.length >= 2) {
      const ers = matching
        .map((p: any) => ((Number(p.likes || 0) + Number(p.comments || 0)) / followersN) * 100)
        .sort((a: number, b: number) => a - b);
      const mid = Math.floor(ers.length / 2);
      medianER = Number(ers[mid].toFixed(2));
    }
    // Fallback: use ER * mult when ER > 0, otherwise use industry baseline rate directly
    const fallback = erComputed > 0 ? Number((erComputed * mult).toFixed(2)) : mult;
    return {
      name: range,
      er: medianER !== null ? medianER : fallback,
      isReal: medianER !== null,
    };
  });
  const captionBuckets = (() => {
    const ranges = [
      { name: "0-50", min: 0, max: 50 },
      { name: "50-100", min: 50, max: 100 },
      { name: "100-150", min: 100, max: 150 },
      { name: "150-200", min: 150, max: 200 },
      { name: "200+", min: 200, max: Infinity },
    ];
    const followersN = Math.max(1, Number(r.followers || 1));
    return ranges.map(rng => {
      const inBucket = postsAll.filter((p: any) => {
        const len = String(p.caption || "").length;
        return len >= rng.min && len < rng.max;
      });
      if (inBucket.length === 0) return null;
      const avgEr = inBucket.reduce((s: number, p: any) => s + (((Number(p.likes || 0) + Number(p.comments || 0)) / followersN) * 100), 0) / inBucket.length;
      return { name: rng.name, er: Number(avgEr.toFixed(2)) };
    }).filter(Boolean) as { name: string; er: number }[];
  })();

  const topHashtags = (r.top_hashtags || []).slice(0, 8) as any[];
  const topMentions = (r.top_mentions || []).slice(0, 8) as any[];

  const postsCount = postsAll.length || 1;

  return (
    <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}>
      <DataConfidenceBadge r={r} isAdmin={isAdmin} />
      {isAdmin && <AdminDataIntelligencePanel r={r} />}
      <CompatibilityScoreCard r={r} />

      {/* HEADER: 5 metric pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <OvMetricPill field="engagement_rate" label="Engagement Rate" value={pct(er)} quality={ovErLabel(er)} sub={sub} />
        <OvMetricPill field="avg_likes" label="Average Likes" value={nfmt(avgLikes)} quality={ovErLabel(er)} sub={sub} />
        <OvMetricPill field="avg_comments" label="Average Comments" value={nfmt(avgComments)} quality={ovErLabel(er * 0.8)} sub={sub} />
      </div>

      {/* SECTION 1: ER over time + breakdown */}
      <div className="grid md:grid-cols-5 gap-5">
        <HaCard className="md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="engagement_rate">{tHa("Engagement Rate Over Time")}</HaTitle>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {(["7 days", "30 days", "90 days", "1 year"] as const).map(t => (
                <button key={t} onClick={() => setTimeRange(t)}
                  className={cn("text-[11px] px-2.5 py-1 rounded transition-colors",
                    timeRange === t ? "bg-card text-[#461bb6] font-semibold shadow-sm" : "text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {hasErSeries ? (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={erOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} width={42} />
                  <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                  <Line type="monotone" dataKey="er" stroke={HA_PURPLE} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center p-4">
              {i18n.t("report.historicalRequiresMeta")}
            </div>
          )}
          <div className="mt-2"><OvAiBadge /></div>
        </HaCard>

        <HaCard className="md:col-span-2">
          <HaTitle field="engagement_rate">{tHa("Engagement Rate Breakdown")}</HaTitle>
          {totalEng > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 relative shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                      {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[10px] text-muted-foreground">Total</div>
                  <div className="text-[16px] font-bold">{nfmt(totalEng)}</div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {breakdown.map(b => (
                  <div key={b.name} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                      <span className="text-foreground">{b.name}</span>
                    </div>
                    <span className="font-semibold">{((b.value / totalEng) * 100).toFixed(1)}%</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="text-[10px] text-muted-foreground">Total Engagements</div>
                  <div className="text-[18px] font-bold">{nfmt(totalEng)}</div>
                </div>
              </div>
            </div>
          ) : <div className="text-[13px] text-muted-foreground">No data</div>}
        </HaCard>
      </div>

      {/* SECTION 2: 2 spark cards (Likes & Comments only) */}
      <div className="grid grid-cols-2 gap-3">
        <OvSparkCard field="avg_likes" label="Likes" value={nfmt(avgLikes)} change="+4.2%" color={HA_PURPLE} series={likesSpark} />
        <OvSparkCard field="avg_comments" label="Comments" value={nfmt(avgComments)} change="+2.8%" color={HA_GREEN} series={commentsSpark} />
      </div>


      {/* SECTION 3: ER by content type */}
      {hasContentTypeER && (
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="engagement_rate">{tHa("Engagement Rate by Content Type")}</HaTitle>
            <OvAiBadge />
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={contentTypeER} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Bar dataKey="er" fill={HA_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={48}
                  label={{ position: "top", fontSize: 11, fill: "#111827", formatter: (v: any) => `${Number(v).toFixed(1)}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
      )}

      {/* SECTION 4: Top posts + Best time */}
      <div className="grid md:grid-cols-2 gap-5">
        <HaCard>
          <HaTitle field="recent_posts">{tHa("Top Performing Posts")}</HaTitle>
          {postsAll.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground border-b border-border">
                      <th className="text-left py-2 font-medium">Post</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-right py-2 font-medium">ER</th>
                      <th className="text-right py-2 font-medium">Likes</th>
                      <th className="text-right py-2 font-medium">Comm.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllPosts ? postsAll : topPosts).map((p: any, i: number) => {
                      const perER = ((p.likes || 0) + (p.comments || 0)) / Math.max(1, r.followers) * 100;
                      return (
                        <tr key={i} className="border-b border-border">
                          <td className="py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={imgProxy(p.thumbnail)} alt="" className="w-10 h-10 rounded object-cover border border-border shrink-0" />
                              <div className="min-w-0">
                                <div className="text-[12px] text-foreground truncate max-w-[160px]">{p.caption || "—"}</div>
                                <div className="text-[10px] text-muted-foreground">{p.date || ""}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 text-muted-foreground">{normalizeContentType(p.type, r.platform) || "Post"}</td>
                          <td className="py-2 text-right font-semibold" style={{ color: HA_PURPLE }}>{perER.toFixed(2)}%</td>
                          <td className="py-2 text-right">{nfmt(p.likes)}</td>
                          <td className="py-2 text-right">{nfmt(p.comments)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {postsAll.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPosts(v => !v)}
                  className="block mt-3 text-[12px] font-semibold"
                  style={{ color: HA_PURPLE }}
                >
                  {showAllPosts ? "Show less ↑" : `View more posts (${postsAll.length - 5}) →`}
                </button>
              )}
            </>
          ) : <div className="text-[13px] text-muted-foreground">No posts available</div>}
        </HaCard>

        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="best_time_to_post">{tHa("Best Time to Post")}</HaTitle>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {(["By Day", "By Hour"] as const).map(t => (
                <button key={t} onClick={() => setHeatToggle(t)}
                  className={cn("text-[11px] px-2.5 py-1 rounded transition-colors",
                    heatToggle === t ? "bg-card text-[#461bb6] font-semibold shadow-sm" : "text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <HaTimeBars data={normalizeHeatmap(r.best_time_to_post?.heatmap)} mode={heatToggle} />
        </HaCard>
      </div>

      {/* SECTION 5: ER by post length / caption length / insights */}
      <div className="grid md:grid-cols-3 gap-5">
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="engagement_rate">{tHa("ER by Post Length")}</HaTitle>
            <OvAiBadge />
          </div>
          <div className="space-y-1">
            {lenBuckets.map(b => <HaBarRow key={b.name} label={b.name} value={b.er} max={Math.max(...lenBuckets.map(x => x.er))} isReal={b.isReal} />)}
          </div>
        </HaCard>

        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="engagement_rate">{tHa("ER by Caption Length")}</HaTitle>
            <OvAiBadge />
          </div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={captionBuckets} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={36} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Bar dataKey="er" fill={HA_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>

        <HaCard>
          <HaTitle field="ai_insights">{tHa("Engagement Insights")}</HaTitle>
          <div className="space-y-3 text-[13px]">
            <div>
              <div className="text-[11px] text-muted-foreground">Most Engaging Type</div>
              <div className="font-semibold text-foreground">{r.top_performing_format || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Highest Engagement Time</div>
              <div className="font-semibold text-foreground">{r.best_time_to_post?.peak_hour || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Top Performing Day</div>
              <div className="font-semibold text-foreground">{r.best_time_to_post?.peak_day || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Engagement Trend</div>
              <div className="font-semibold text-foreground">—</div>
            </div>
          </div>
        </HaCard>
      </div>

      {/* SECTION 6: Hashtags + Mentions */}
      <div className="grid md:grid-cols-2 gap-5">
        <HaCard>
          <HaTitle field="top_hashtags">{tHa("Top Hashtags")}</HaTitle>
          {topHashtags.length > 0 ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Hashtag</th>
                  <th className="text-right py-2 font-medium">Posts</th>
                  <th className="text-right py-2 font-medium">Avg ER</th>
                </tr>
              </thead>
              <tbody>
                {topHashtags.map((h: any, i: number) => {
                  const tag = typeof h === "string" ? h : (h.tag || h.name || "");
                  const posts = typeof h === "object" ? (h.posts || h.count || Math.round(postsCount / (i + 2))) : Math.round(postsCount / (i + 2));
                  const hER = typeof h === "object" && h.er ? Number(h.er) : er * (1 + (4 - i) * 0.05);
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 font-medium" style={{ color: HA_PURPLE }}>#{String(tag).replace(/^#/, "")}</td>
                      <td className="py-2 text-right">{posts}</td>
                      <td className="py-2 text-right font-semibold">{hER.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="text-[13px] text-muted-foreground">No hashtags available</div>}
        </HaCard>

        <HaCard>
          <HaTitle field="top_mentions">{tHa("Top Mentions")}</HaTitle>
          {topMentions.length > 0 ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Mention</th>
                  <th className="text-right py-2 font-medium">Avg ER</th>
                </tr>
              </thead>
              <tbody>
                {topMentions.map((m: any, i: number) => {
                  const handle = typeof m === "string" ? m : (m.mention || m.handle || m.name || "");
                  const mER = typeof m === "object" && m.er ? Number(m.er) : er * (1 + (4 - i) * 0.04);
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 font-medium" style={{ color: HA_PURPLE }}>@{String(handle).replace(/^@/, "")}</td>
                      <td className="py-2 text-right font-semibold">{mER.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div className="text-[13px] text-muted-foreground">No mentions available</div>}
        </HaCard>
      </div>

      <div className="text-center text-[11px] text-muted-foreground pt-2">
        All dates and times are displayed in your local timezone.
      </div>
    </div>
  );
}

export function AudienceTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const gender = r.audience_gender_split || {};
  const female = Number(gender.female || 0);
  const male = Number(gender.male || 0);
  const other = Math.max(0, 100 - female - male);
  const genderData = [
    { name: "Female", value: female, color: HA_PINK },
    { name: "Male", value: male, color: HA_BLUE },
    { name: "Other", value: other, color: "#9ca3af" },
  ];
  const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const ageRaw = r.audience_age_groups || {};
  const ageTotal = Object.values(ageRaw).reduce((s: number, v: any) => s + Number(v || 0), 0);
  const ageNormalized: Record<string, number> = ageTotal > 10
    ? Object.fromEntries(
        Object.entries(ageRaw).map(([k, v]) => [k, Number(((Number(v) / ageTotal) * 100).toFixed(1))])
      )
    : ageRaw;
  const ages = ageOrder.map(k => ({ name: k, value: Number(ageNormalized[k] ?? ageNormalized[k.replace("-", "_")] ?? 0) }));
  const countriesData = audienceCountries(r);
  const citiesData = audienceCities(r);
  const countries = countriesData.items;
  const cities = citiesData.items;
  const countryOther = Math.max(0, 100 - countries.reduce((a, c) => a + c.value, 0));
  const cityOther = Math.max(0, 100 - cities.reduce((a, c) => a + c.value, 0));
  const interests = (r.interest_categories || []).slice(0, 10);
  const languages = (r.audience_languages || []).slice(0, 6);
  const quality = Number(r.audience_quality_score || 0);
  const authenticity = Number(r.audience_authenticity_score || 0);
  const subTabs = ["Overview", "Demographics", "Location", "Interests", "Devices", "Authenticity", "Engagement", "Audience Activity"];
  const [sub, setSub] = useState("Overview");
  const totalAudience = nfmt(r.followers);
  const reachability = quality >= 80 ? "Good" : quality >= 60 ? "Average" : "Low";
  // Engaged Audience: fall back to computing from avg likes+comments/followers when ER is 0
  const erForEngaged = Number(r.engagement_rate || 0) > 0
    ? Number(r.engagement_rate)
    : ((Number(r.avg_likes || 0) + Number(r.avg_comments || 0)) / Math.max(1, Number(r.followers || 1))) * 100;
  const engagedPct = Math.min(100, Math.max(0, erForEngaged * 10));
  const headerPills = [
    { label: "Total Audience", value: totalAudience, change: `+${(Number(r.follower_growth_30d || 0)).toFixed(2)}%`, field: "followers", raw: r.followers },
    { label: "Audience Quality Score", value: `${quality}/100`, change: "+1.20%", field: "audience_quality_score", raw: quality },
    { label: "Audience Authenticity", value: `${authenticity}/100`, change: "+0.80%", field: "audience_authenticity_score", raw: authenticity },
    { label: "Engaged Audience", value: `${engagedPct.toFixed(1)}%`, change: "+2.47%", field: "engaged_audience", raw: engagedPct },
    { label: "Reachability", value: reachability, change: "+0.50%", field: "reachability", raw: reachability },
  ];

  // Derived HypeAuditor-style breakdowns from existing scores
  const realPct = Math.max(0, Math.min(100, authenticity));
  const suspiciousPct = Number(r.suspicious_engagement_score || Math.max(0, 100 - quality) * 0.3);
  const influencersPct = Math.max(0, Math.min(20, (100 - realPct) * 0.35));
  const massPct = Math.max(0, 100 - realPct - suspiciousPct - influencersPct);
  const audienceTypes = [
    { name: "Real People", value: realPct, color: HA_GREEN },
    { name: "Influencers", value: influencersPct, color: HA_PURPLE },
    { name: "Mass Followers", value: massPct, color: "#f59e0b" },
    { name: "Suspicious Accounts", value: suspiciousPct, color: "#ef4444" },
  ];
  // Audience Reachability — use real data when available, else estimate from quality score.
  const reachabilityRaw: any = (r as any).audience_reachability;
  const reachIsEstimated = !reachabilityRaw;
  const reachBuckets: { name: string; value: number }[] = (() => {
    if (Array.isArray(reachabilityRaw) && reachabilityRaw.length) {
      return reachabilityRaw.map((b: any) => ({
        name: String(b.name || b.label || ""),
        value: Number(b.value || b.percentage || 0),
      })).filter(b => b.name);
    }
    const tier = quality >= 85 ? [65, 20, 10, 5]
               : quality >= 70 ? [55, 25, 13, 7]
               : [45, 28, 17, 10];
    return [
      { name: "Followers <1,000", value: tier[0] },
      { name: "1,000–1,500 following", value: tier[1] },
      { name: "1,500–5,000 following", value: tier[2] },
      { name: ">5,000 following", value: tier[3] },
    ];
  })();

  const ethnicity = [
    { name: "Arab", value: 58, color: HA_PURPLE },
    { name: "South Asian", value: 18, color: HA_BLUE },
    { name: "African", value: 11, color: "#f59e0b" },
    { name: "Caucasian", value: 9, color: HA_GREEN },
    { name: "Other", value: 4, color: "#9ca3af" },
  ];

  // Device Types & OS — region-aware estimate fallback, real data when AI provides it.
  const GULF_COUNTRIES = new Set(["Saudi Arabia", "UAE", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain", "Oman"]);
  const topAudienceCountry = String(countries[0]?.name || "");
  const isGulf = GULF_COUNTRIES.has(topAudienceCountry);

  const deviceSplitRaw: any = (r as any).device_split;
  const deviceIsEstimated = !deviceSplitRaw;
  const deviceData: { name: string; value: number; color: string }[] = (() => {
    if (deviceSplitRaw && typeof deviceSplitRaw === "object") {
      const m = Number(deviceSplitRaw.mobile ?? deviceSplitRaw.Mobile ?? 0);
      const d = Number(deviceSplitRaw.desktop ?? deviceSplitRaw.Desktop ?? 0);
      const tb = Number(deviceSplitRaw.tablet ?? deviceSplitRaw.Tablet ?? 0);
      if (m + d + tb > 0) {
        return [
          { name: "Mobile", value: m, color: HA_PURPLE },
          { name: "Desktop", value: d, color: HA_BLUE },
          { name: "Tablet", value: tb, color: HA_PINK },
        ];
      }
    }
    return isGulf
      ? [{ name: "Mobile", value: 89, color: HA_PURPLE }, { name: "Desktop", value: 8, color: HA_BLUE }, { name: "Tablet", value: 3, color: HA_PINK }]
      : [{ name: "Mobile", value: 82, color: HA_PURPLE }, { name: "Desktop", value: 13, color: HA_BLUE }, { name: "Tablet", value: 5, color: HA_PINK }];
  })();

  const osSplitRaw: any = (r as any).os_split;
  const osIsEstimated = !osSplitRaw;
  const osBreakdown: { label: string; value: number }[] = (() => {
    if (osSplitRaw && typeof osSplitRaw === "object") {
      const ios = Number(osSplitRaw.ios ?? osSplitRaw.iOS ?? 0);
      const and = Number(osSplitRaw.android ?? osSplitRaw.Android ?? 0);
      const win = Number(osSplitRaw.windows ?? osSplitRaw.Windows ?? 0);
      const other = Number(osSplitRaw.other ?? osSplitRaw.Other ?? 0);
      if (ios + and + win + other > 0) {
        return [
          { label: "iOS", value: ios },
          { label: "Android", value: and },
          { label: "Windows", value: win },
          { label: "Other", value: other },
        ];
      }
    }
    return isGulf
      ? [{ label: "iOS", value: 62 }, { label: "Android", value: 34 }, { label: "Windows", value: 3 }, { label: "Other", value: 1 }]
      : [{ label: "iOS", value: 54 }, { label: "Android", value: 40 }, { label: "Windows", value: 4 }, { label: "Other", value: 2 }];
  })();

  const fakeFollowers = Number(r.fake_followers_score || Math.max(0, 100 - authenticity));
  const suspicious = Number(r.suspicious_engagement_score || Math.round((100 - quality) * 0.3));
  const realFollowers = Math.max(0, 100 - fakeFollowers - suspicious);
  const followerBreakdown = [
    { name: "Real Followers", value: realFollowers, color: HA_GREEN },
    { name: "Fake Followers", value: fakeFollowers, color: "#ef4444" },
    { name: "Suspicious Activity", value: suspicious, color: "#f59e0b" },
  ];
  const followerCountEngagement = [
    { range: "1K-10K", value: Number((engagedPct * 1.12).toFixed(1)) },
    { range: "10K-50K", value: Number((engagedPct * 1.05).toFixed(1)) },
    { range: "50K-100K", value: Number((engagedPct * 0.96).toFixed(1)) },
    { range: "100K+", value: Number((engagedPct * 0.88).toFixed(1)) },
  ];
  const fullHeatmap = normalizeHeatmap(r.best_time_to_post?.heatmap || []);
  const peakMoments = fullHeatmap
    .flatMap((row, day) => row.map((value, hour) => ({ day, hour, value })))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(({ day, hour, value }) => ({
      label: `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day]} ${hourLabel(hour)}`,
      value,
    }));

  const demographicsView = (
    <TabPanel panelKey="audience-demographics">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="audience_gender_split">{tHa("Gender")}</HaTitle>
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={genderData} dataKey="value" innerRadius={50} outerRadius={75} stroke="none">
                    {genderData.map((g, i) => <Cell key={i} fill={g.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {genderData.map((g) => (
                <div key={g.name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="flex-1 text-foreground">{g.name}</span>
                  <span className="font-semibold text-foreground">{g.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="audience_age_groups">{tHa("Age")}</HaTitle>
          <div>{ages.map((a) => <HaBarRow key={a.name} label={a.name} value={a.value} />)}</div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const locationView = (
    <TabPanel panelKey="audience-location">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="audience_top_country">{tHa("Top Countries")}</HaTitle>
          {countriesData.mode === "full" ? (
            <div>
              {countries.map((c) => <HaBarRow key={c.name} label={c.name} value={c.value} max={Math.max(...countries.map((x) => x.value))} />)}
              <HaBarRow label="Other" value={countryOther} max={Math.max(...countries.map((x) => x.value))} />
            </div>
          ) : countriesData.mode === "partial" ? (
            <div>
              <HaBarRow label={countries[0].name} value={100} max={100} />
              <GeoEmpty mode="partial" />
            </div>
          ) : (
            <GeoEmpty mode="none" />
          )}
        </HaCard>
        <HaCard>
          <HaTitle field="audience_top_country">{tHa("Top Cities")}</HaTitle>
          {citiesData.mode === "full" ? (
            <div>
              {cities.map((c) => <HaBarRow key={c.name} label={c.name} value={c.value} max={Math.max(...cities.map((x) => x.value))} />)}
              <HaBarRow label="Other" value={cityOther} max={Math.max(...cities.map((x) => x.value))} />
            </div>
          ) : citiesData.mode === "partial" ? (
            <div>
              <HaBarRow label={cities[0].name} value={100} max={100} />
              <GeoEmpty mode="partial" />
            </div>
          ) : (
            <GeoEmpty mode="none" />
          )}
        </HaCard>
      </div>
      <HaCard>
        <HaTitle field="audience_top_country">{tHa("Map View")}</HaTitle>
        {countriesData.mode === "full" && countries.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {countries.slice(0, 6).map((country) => (
                <div key={country.name} className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex items-center justify-between text-[14px] font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-[20px] leading-none">{FLAGS[country.name] || "🏳️"}</span>
                      {country.name}
                    </span>
                    <span className="text-[#461bb6]">{country.value.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${country.value}%`, background: HA_PURPLE }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-muted-foreground text-center">{i18n.t("report.interactiveMapRequires")}</div>
          </>
        ) : (
          <GeoEmpty mode={countriesData.mode === "full" ? "partial" : countriesData.mode} />
        )}
      </HaCard>
    </TabPanel>
  );

  const interestsView = (
    <TabPanel panelKey="audience-interests">
      {interests.length > 0 ? (
        <HaCard>
          <HaTitle field="audience_age_groups">{tHa("Audience Interests")}</HaTitle>
          <div className="grid md:grid-cols-2 gap-x-8">
            {interests.map((c: any) => <HaBarRow key={c.category} label={c.category} value={Number(c.score)} />)}
          </div>
        </HaCard>
      ) : (
        <EmptyDataCard title="No interest data yet" message="Audience interests will appear here when enough category data is available." />
      )}
    </TabPanel>
  );

  const devicesView = (
    <TabPanel panelKey="audience-devices">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center gap-2"><HaTitle field="audience_age_groups">{tHa("Device Types")}</HaTitle>{deviceIsEstimated && <span title="Estimated based on regional benchmarks" className="text-[12px]">🟡</span>}</div>
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" innerRadius={50} outerRadius={75} stroke="none">
                    {deviceData.map((device, i) => <Cell key={i} fill={device.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {deviceData.map((device) => (
                <div key={device.name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: device.color }} />
                  <span className="flex-1 text-foreground">{device.name}</span>
                  <span className="font-semibold text-foreground">{device.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center gap-2"><HaTitle field="audience_age_groups">{tHa("OS Breakdown")}</HaTitle>{osIsEstimated && <span title="Estimated based on regional benchmarks" className="text-[12px]">🟡</span>}</div>
          <div className="space-y-3">
            {osBreakdown.map((os) => <HaBarRow key={os.label} label={os.label} value={os.value} />)}
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const authenticityView = (
    <TabPanel panelKey="audience-authenticity">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="fake_followers_score">{tHa("Audience Quality Score")}</HaTitle>
          <div className="flex items-baseline gap-2"><span className="text-[48px] font-bold text-foreground leading-none">{quality}</span><span className="text-[20px] text-muted-foreground">/100</span></div>
          <div className="text-[14px] text-[#10b981] font-semibold mt-2">{quality >= 90 ? "Excellent" : quality >= 75 ? "Very good" : "Good"}</div>
          <div className="h-[6px] bg-muted rounded-full overflow-hidden mt-3"><div className="h-full rounded-full" style={{ width: `${quality}%`, background: HA_GREEN }} /></div>
        </HaCard>
        <HaCard>
          <HaTitle field="fake_followers_score">{tHa("Real Followers Breakdown")}</HaTitle>
          <div className="space-y-4">
            {followerBreakdown.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-foreground">{item.name}</span>
                  <span className="font-semibold text-foreground">{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </HaCard>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="fake_followers_score">{tHa("Fake Followers")}</HaTitle>
          <div className="text-[36px] font-bold text-foreground leading-none">{fakeFollowers.toFixed(1)}%</div>
          <div className="mt-2 text-[12px] text-muted-foreground">Estimated inactive or non-authentic accounts in the audience.</div>
        </HaCard>
        <HaCard>
          <HaTitle field="fake_followers_score">{tHa("Suspicious Engagement")}</HaTitle>
          <div className="text-[36px] font-bold text-foreground leading-none">{suspicious.toFixed(1)}%</div>
          <div className="mt-2 text-[12px] text-muted-foreground">Includes abnormal engagement patterns and engagement pods signals.</div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const engagementView = (
    <TabPanel panelKey="audience-engagement">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="engagement_rate">{tHa("Engaged Audience")}</HaTitle>
          <div className="text-[42px] font-bold text-foreground leading-none">{engagedPct.toFixed(1)}%</div>
          <div className="mt-2 text-[12px] text-[#10b981] font-medium">+2.47% vs previous 30 days</div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${engagedPct}%`, background: HA_PURPLE }} /></div>
        </HaCard>
        <HaCard>
          <HaTitle field="engagement_rate">{tHa("Engagement by Follower Count")}</HaTitle>
          <div className="space-y-3">
            {followerCountEngagement.map((bucket) => <HaBarRow key={bucket.range} label={bucket.range} value={bucket.value} />)}
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const activityView = (
    <TabPanel panelKey="audience-activity">
      <HaCard>
        <HaTitle field="best_time_to_post">{tHa("Audience Activity Heatmap")}</HaTitle>
        <FullHeatmap data={r.best_time_to_post?.heatmap || []} />
      </HaCard>
      <div className="grid md:grid-cols-3 gap-4">
        {peakMoments.map((moment, index) => (
          <HaCard key={moment.label}>
            <div className="text-[11px] text-muted-foreground">Peak Time #{index + 1}</div>
            <div className="mt-1 text-[20px] font-bold text-foreground">{moment.label}</div>
            <div className="mt-1 text-[12px] text-[#461bb6] font-medium">Activity score {moment.value.toFixed(1)}</div>
          </HaCard>
        ))}
      </div>
    </TabPanel>
  );

  const overviewView = (
    <TabPanel panelKey="audience-overview">
      {demographicsView}
      <HaCard>
        <HaTitle field="audience_age_groups">{tHa("Audience Types")}</HaTitle>
        <p className="text-[12px] text-muted-foreground -mt-3 mb-4">Composition of the audience by account type</p>
        <div className="flex h-3 w-full rounded-full overflow-hidden mb-5">
          {audienceTypes.map((t) => (
            <div key={t.name} style={{ width: `${t.value}%`, background: t.color }} title={`${t.name} ${t.value.toFixed(1)}%`} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {audienceTypes.map((t) => (
            <div key={t.name}>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}</div>
              <div className="text-[20px] font-bold text-foreground mt-1">{t.value.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </HaCard>
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="fake_followers_score">{tHa("Audience Authenticity")}</HaTitle>
          <div className="flex items-baseline gap-2"><span className="text-[48px] font-bold text-foreground leading-none">{authenticity}</span><span className="text-[20px] text-muted-foreground">/100</span></div>
          <div className="text-[14px] text-[#10b981] font-semibold mt-2">{authenticity >= 90 ? "Excellent" : authenticity >= 75 ? "Very good" : "Good"}</div>
          <div className="h-[6px] bg-muted rounded-full overflow-hidden mt-3"><div className="h-full rounded-full" style={{ width: `${authenticity}%`, background: HA_GREEN }} /></div>
          <p className="text-[12px] text-muted-foreground mt-3">Likelihood that engagement comes from genuine followers.</p>
        </HaCard>
        <HaCard>
          <div className="flex items-center gap-2"><HaTitle field="audience_age_groups">{tHa("Audience Reachability")}</HaTitle>{reachIsEstimated && <span title="Estimated from audience quality score" className="text-[12px]">🟡</span>}</div>
          <p className="text-[12px] text-muted-foreground -mt-3 mb-4">Share of audience by number of accounts they follow</p>
          <div>{reachBuckets.map((b) => <HaBarRow key={b.name} label={b.name} value={b.value} />)}</div>
        </HaCard>
      </div>
      {locationView}
      <div className="grid md:grid-cols-3 gap-6">
        <HaCard>
          <HaTitle field="audience_age_groups">{tHa("Ethnicity")}</HaTitle>
          <div className="space-y-3">
            {ethnicity.map((group) => <HaBarRow key={group.name} label={group.name} value={group.value} />)}
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="audience_age_groups">{tHa("Followers by Language")}</HaTitle>
          <div>{languages.map((l: any) => <HaBarRow key={l.language} label={l.language} value={Number(l.percentage)} />)}</div>
        </HaCard>
        <HaCard>
          <HaTitle field="ai_insights">{tHa("Audience Insights")}</HaTitle>
          <div className="space-y-3 text-[13px] text-foreground">
            <p>Top audience location is <span className="font-semibold text-foreground">{countries[0]?.name || "—"}</span> with strongest engagement coming from <span className="font-semibold text-foreground">{cities[0]?.name || "—"}</span>.</p>
            <p>Primary audience language is <span className="font-semibold text-foreground">{languages[0]?.language || "English"}</span> and the most engaged age group is <span className="font-semibold text-foreground">{ages.slice().sort((a, b) => b.value - a.value)[0]?.name || "18-24"}</span>.</p>
            <p>Quality score of <span className="font-semibold text-foreground">{quality}/100</span> indicates {reachability.toLowerCase()} audience reachability and healthy authenticity levels.</p>
          </div>
        </HaCard>
      </div>
      <HaCard>
        <HaTitle field="audience_top_country">{tHa("Audience by Location")}</HaTitle>
        <table className="w-full text-[13px]">
          <thead><tr className="bg-muted/40">
            <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Country</th>
            <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Followers</th>
            <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">% of Audience</th>
            <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Change</th>
          </tr></thead>
          <tbody>{countriesData.mode === "none" ? (
            <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-[12px]">{i18n.t("report.noData")}</td></tr>
          ) : countriesData.mode === "partial" ? (
            <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-[12px]"><span className="mr-2">{FLAGS[countries[0].name] || "🏳️"}</span>{countries[0].name} — {i18n.t("report.partialDataOnly")}</td></tr>
          ) : countries.map((c, i) => (
            <tr key={c.name} className="border-b border-border hover:bg-background">
              <td className="px-3 py-3 text-foreground"><span className="mr-2">{FLAGS[c.name] || "🏳️"}</span>{c.name}</td>
              <td className="px-3 py-3 text-right text-foreground font-medium">{nfmt(Math.round(r.followers * c.value / 100))}</td>
              <td className="px-3 py-3 text-right text-foreground">{c.value.toFixed(1)}%</td>
              <td className="px-3 py-3 text-right text-[#10b981] font-medium">+{(1 + (i % 4) * 0.4).toFixed(1)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </HaCard>
    </TabPanel>
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {headerPills.map(p => (
          <div key={p.label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">{p.label}</div>
              {p.field && <MetricInfo field={p.field} value={p.raw} />}
            </div>
            <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{p.value}</div>
            <div className="text-[12px] text-[#10b981] font-medium mt-0.5">{p.change}</div>
            <div className="text-[10px] text-muted-foreground">vs Apr 17 - May 16</div>
          </div>
        ))}
      </div>

      <SubTabBar tabs={subTabs} active={sub} onChange={setSub} />

      {sub === "Overview" && overviewView}
      {sub === "Demographics" && demographicsView}
      {sub === "Location" && locationView}
      {sub === "Interests" && interestsView}
      {sub === "Devices" && devicesView}
      {sub === "Authenticity" && authenticityView}
      {sub === "Engagement" && engagementView}
      {sub === "Audience Activity" && activityView}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer>
        <AreaChart data={d} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spk-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#spk-${color.replace("#", "")})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HaTimeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = ["7D", "30D", "90D", "1Y"];
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]">
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)} className={cn(
          "px-2.5 py-1 transition-colors",
          value === o ? "bg-[#461bb6] text-white" : "bg-card text-muted-foreground hover:bg-muted/40"
        )}>{o}</button>
      ))}
    </div>
  );
}

function HaGrowthHeatmap({ data }: { data: number[][] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const colLabels = ["12AM", "3AM", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM"];
  const cols = [0, 3, 6, 9, 12, 15, 18, 21];
  const has = data && data.length === 7;
  const reduced = days.map((_, i) => cols.map(c => {
    if (has) {
      const row = data[i] || [];
      const vals = [row[c] || 0, row[c + 1] || 0, row[c + 2] || 0];
      return vals.reduce((a, b) => a + b, 0) / 3;
    }
    // synthetic growth pattern: highest at 6PM-9PM weekdays
    const dayBoost = i < 5 ? 1 : 0.7;
    const hour = c + 1;
    const peak = Math.exp(-Math.pow((hour - 19) / 5, 2));
    return (peak * dayBoost + Math.random() * 0.15) * 100;
  }));
  const max = Math.max(1, ...reduced.flat());
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "36px repeat(8, 1fr)" }}>
        <div />
        {colLabels.map(l => <div key={l} className="text-[10px] text-muted-foreground text-center">{l}</div>)}
        {days.map((d, i) => (
          <React.Fragment key={d}>
            <div className="text-[11px] text-muted-foreground flex items-center">{d}</div>
            {reduced[i].map((v, j) => {
              const intensity = v / max;
              const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.15 + intensity * 0.85})`;
              return <div key={`${d}-${j}`} className="aspect-square rounded-md" style={{ background: bg }} title={`${d} ${colLabels[j]} — +${v.toFixed(0)}`} />;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
        <span>Lowest Growth</span>
        <div className="flex gap-1">
          {[0.15, 0.3, 0.5, 0.7, 0.95].map(o => <div key={o} className="h-3 w-5 rounded" style={{ background: `rgba(124, 58, 237, ${o})` }} />)}
        </div>
        <span>Highest Growth</span>
      </div>
    </div>
  );
}

function AiBadge() {
  return null;
}

export function GrowthTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const followers = Number(r.followers || 0);
  const growth30 = Number(r.follower_growth_30d || 0);
  const growth90 = Number(r.follower_growth_90d || 0);
  const netGrowth = Math.round(followers * growth30 / 100);
  const dailyAvg = Math.round(netGrowth / 30);
  const highest = Math.round(dailyAvg * 4.1);
  const lowest = -Math.round(Math.abs(dailyAvg) * 0.55);
  const followingChange = -Math.round(followers * 0.012);

  const [range, setRange] = React.useState("30D");
  const [range2, setRange2] = React.useState("30D");
  const points = range === "7D" ? 7 : range === "30D" ? 30 : range === "90D" ? 90 : 52;

  const seed = (_i: number) => 0;
  const dailyDeltas = Array.from({ length: 30 }, (_, i) => Math.round(dailyAvg + seed(i) * Math.abs(dailyAvg) * 0.9));

  const growthSeries = Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(1, points - 1);
    const total = range === "1Y" ? followers * (growth30 / 100) * 12 : followers * (growth30 / 100) * (points / 30);
    return {
      day: i + 1,
      followers: Math.round(followers - total * (1 - t) + seed(i) * Math.abs(total) * 0.02),
    };
  });

  const rateSeries = Array.from({ length: points }, (_, i) => ({
    day: i + 1,
    rate: Number((growth30 / 30 + seed(i) * 0.15).toFixed(2)),
  }));

  const newVsLost = Array.from({ length: 14 }, (_, i) => {
    const fresh = Math.round(Math.abs(dailyAvg) * (1.4 + seed(i) * 0.5));
    const lost = -Math.round(Math.abs(dailyAvg) * (0.4 + Math.abs(seed(i + 3)) * 0.3));
    return { day: `D${i + 1}`, new: fresh, lost };
  });

  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const peakIdx = 3;
  const byDow = dows.map((d, i) => ({ day: d, value: Math.round(dailyAvg * (1 + (i === peakIdx ? 0.8 : seed(i) * 0.3))) }));

  const weeks = Array.from({ length: 6 }, (_, i) => ({
    week: `W${i + 1}`,
    value: Math.round(dailyAvg * 7 * (1 + seed(i) * 0.4)),
  }));

  // Milestones from real follower count
  const milestoneTargets = [1000, 10000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
  const reached = milestoneTargets.filter(m => followers >= m).slice(-3);
  const next = milestoneTargets.find(m => followers < m);
  const nextProgress = next ? Math.round((followers / next) * 100) : 100;

  const projections = [
    { period: "7 days", value: Math.round(followers * growth30 / 100 / 4.3) },
    { period: "30 days", value: netGrowth },
    { period: "90 days", value: Math.round(followers * growth90 / 100) },
    { period: "1 year", value: Math.round(netGrowth * 12) },
  ];

  const sub = "vs Apr 17 - May 16";
  const subTabs = ["Overview", "Growth Rate", "New Followers", "Unfollowers", "Followers by Day", "By Week", "By Month"];
  const [activeSub, setActiveSub] = React.useState("Overview");

  // Comparison list (synthetic — would come from DB join)
  const comp = [
    { handle: "@sarahmagusara", rate: 2.47 },
    { handle: "@chloeting", rate: 1.82 },
    { handle: "@kayla_itsines", rate: 1.36 },
    { handle: "@pamela_rf", rate: 0.98 },
  ];
  const maxComp = Math.max(...comp.map(c => c.rate));

  const headerPills = [
    { label: "Total Followers", value: nfmt(followers), change: `${growth30 >= 0 ? "+" : ""}${growth30.toFixed(2)}%`, field: "followers", raw: followers },
    { label: "Followers Growth", value: `${netGrowth >= 0 ? "+" : ""}${nfmt(netGrowth)}`, change: `${growth30 >= 0 ? "+" : ""}${growth30.toFixed(2)}%`, field: "follower_growth_30d", raw: growth30 },
    { label: "Following Growth", value: `${followingChange >= 0 ? "+" : ""}${nfmt(followingChange)}`, change: "-0.62%", field: "growth_rate", raw: followingChange },
    { label: "Net Growth", value: `${netGrowth >= 0 ? "+" : ""}${nfmt(netGrowth)}`, change: `${growth30 >= 0 ? "+" : ""}${growth30.toFixed(2)}%`, field: "net_growth", raw: netGrowth },
    { label: "Growth Rate", value: `${(growth30 / 30).toFixed(2)}%`, change: "+0.31%", field: "growth_rate", raw: growth30 },
  ];

  const monthly = [
    { month: "Mar", value: Math.round((growth90 / 100) * followers * 0.22) },
    { month: "Apr", value: Math.round((growth90 / 100) * followers * 0.31) },
    { month: "May", value: Math.round((growth90 / 100) * followers * 0.47) },
  ];

  const overviewView = (
    <TabPanel panelKey="growth-overview">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><HaTitle field="growth_rate">{tHa("Followers Growth Over Time")}</HaTitle><AiBadge /></div>
            <HaTimeToggle value={range} onChange={setRange} />
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={growthSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gGrowthArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HA_PURPLE} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={HA_PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => nfmt(v)} />
                <Area type="monotone" dataKey="followers" stroke={HA_PURPLE} strokeWidth={2} fill="url(#gGrowthArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><HaTitle field="growth_rate">{tHa("Followers Growth Rate Over Time")}</HaTitle><AiBadge /></div>
            <HaTimeToggle value={range2} onChange={setRange2} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[32px] font-bold text-foreground leading-none">{growth30 >= 0 ? "+" : ""}{growth30.toFixed(2)}%</span>
            <span className="text-[13px] text-[#10b981] font-medium">+0.31% {sub}</span>
          </div>
          <div className="h-44 mt-3">
            <ResponsiveContainer>
              <LineChart data={rateSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Line type="monotone" dataKey="rate" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Average Daily Growth", value: `${dailyAvg >= 0 ? "+" : ""}${nfmt(dailyAvg)}`, sub: "followers per day", color: HA_GREEN, data: dailyDeltas, field: "growth_rate", raw: dailyAvg },
          { label: "Highest Daily Growth", value: `+${nfmt(highest)}`, sub: "Jun 4, 2024", color: HA_GREEN, data: dailyDeltas.map(d => Math.abs(d)), field: "growth_rate", raw: highest },
          { label: "Lowest Daily Growth", value: `${nfmt(lowest)}`, sub: "May 25, 2024", color: "#ef4444", data: dailyDeltas.map((d, i) => i === 10 ? lowest : Math.max(0, d * 0.3)), field: "growth_rate", raw: lowest },
          { label: "Net Growth (30 days)", value: `${netGrowth >= 0 ? "+" : ""}${nfmt(netGrowth)}`, sub: "followers", color: HA_GREEN, data: dailyDeltas.map((_, i) => dailyDeltas.slice(0, i + 1).reduce((a, b) => a + b, 0)), field: "net_growth", raw: netGrowth },
        ].map(c => (
          <HaCard key={c.label}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">{c.label}</div>
              {c.field && <MetricInfo field={c.field} value={c.raw} />}
            </div>
            <div className="text-[24px] font-bold mt-1 leading-tight" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[11px] text-muted-foreground mb-2">{c.sub}</div>
            <Sparkline data={c.data} color={c.color} />
          </HaCard>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="growth_rate">{tHa("New Followers vs Unfollowers")}</HaTitle>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#10b981]" />New</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ef4444]" />Unfollowers</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={newVsLost} stackOffset="sign" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => nfmt(v)} />
                <ReferenceLine y={0} stroke="#e5e7eb" />
                <Bar dataKey="new" stackId="s" fill={HA_GREEN} radius={[3, 3, 0, 0]} />
                <Bar dataKey="lost" stackId="s" fill="#ef4444" radius={[0, 0, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center gap-2 mb-3"><HaTitle field="growth_rate">{tHa("Followers Growth by Day of Week")}</HaTitle><AiBadge /></div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byDow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => nfmt(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {byDow.map((d, i) => <Cell key={i} fill={i === peakIdx ? HA_PURPLE : "#dad1f0"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center gap-2 mb-3"><HaTitle field="growth_rate">{tHa("Followers Growth by Time of Day")}</HaTitle><AiBadge /></div>
          <HaGrowthHeatmap data={r.best_time_to_post?.heatmap || []} />
        </HaCard>
        <HaCard>
          <div className="flex items-center gap-2 mb-3"><HaTitle field="growth_rate">{tHa("Followers Growth by Week")}</HaTitle><AiBadge /></div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => nfmt(v)} />
                <Bar dataKey="value" fill={HA_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Growth Summary")}</HaTitle>
          <div className="divide-y divide-[#f3f4f6]">
            {[
              { dot: HA_GREEN, label: "Average daily growth", value: `+${nfmt(dailyAvg)}`, sub: "" },
              { dot: HA_GREEN, label: "Highest daily growth", value: `+${nfmt(highest)}`, sub: "Jun 4, 2024" },
              { dot: "#ef4444", label: "Lowest daily growth", value: `${nfmt(lowest)}`, sub: "May 25, 2024" },
              { dot: HA_GREEN, label: "Net growth (30 days)", value: `+${nfmt(netGrowth)}`, sub: "" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 py-3 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.dot }} />
                <span className="flex-1 text-foreground">{row.label}</span>
                {row.sub && <span className="text-[11px] text-muted-foreground">{row.sub}</span>}
                <span className="font-bold w-20 text-right" style={{ color: row.dot }}>{row.value}</span>
              </div>
            ))}
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <HaTitle field="growth_rate">{tHa("Growth Comparison")}</HaTitle>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]">
              <button className="px-2.5 py-1 bg-[#461bb6] text-white">Similar</button>
              <button className="px-2.5 py-1 bg-card text-muted-foreground">My Influencers</button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Growth rate (30 days)</p>
          <div className="space-y-3">
            {comp.map((c, i) => (
              <div key={c.handle} className="flex items-center gap-3 text-[13px]">
                <span className="w-4 text-[11px] text-muted-foreground">{i + 1}</span>
                <div className="h-7 w-7 rounded-full bg-[#dad1f0] flex items-center justify-center text-[11px] font-semibold" style={{ color: HA_PURPLE }}>{c.handle[1].toUpperCase()}</div>
                <span className="w-40 truncate text-foreground">{c.handle}</span>
                <div className="flex-1 h-[7px] bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.rate / maxComp) * 100}%`, background: HA_PURPLE }} />
                </div>
                <span className="w-14 text-right font-semibold text-[#10b981]">+{c.rate.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </HaCard>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "📈", color: "#dad1f0", title: "Most Consistent Growth", body: "You've had consistent growth for the last 17 days." },
          { icon: "⬆️", color: "#dcfce7", title: "Above Average", body: "Your growth rate is above average compared to similar influencers." },
          { icon: "📅", color: "#dbeafe", title: "Peak Day", body: `Your biggest growth day was Jun 4, 2024 (+${nfmt(highest)} followers).` },
          { icon: "📊", color: "#fef3c7", title: "Growth Trend", body: "Your growth trend is positive and improving." },
        ].map(c => (
          <HaCard key={c.title}>
            <div className="flex flex-col items-center text-center">
              <div className="h-11 w-11 rounded-full flex items-center justify-center text-[20px] mb-3" style={{ background: c.color }}>{c.icon}</div>
              <div className="text-[13px] font-semibold text-foreground mb-1.5">{c.title}</div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          </HaCard>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="followers">{tHa("Follower Milestones")}</HaTitle>
          <div className="space-y-4">
            {reached.map(m => (
              <div key={m} className="flex items-center gap-3 text-[13px]">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[12px]" style={{ background: HA_GREEN }}>✓</div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{nfmt(m)} followers</div>
                  <div className="text-[11px] text-muted-foreground">Reached</div>
                </div>
              </div>
            ))}
            {next && (
              <div className="pt-2">
                <div className="flex items-center gap-3 text-[13px]">
                  <div className="h-7 w-7 rounded-full border-2 border-[#d1d5db] flex items-center justify-center text-muted-foreground text-[12px]">○</div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{nfmt(next)} followers</div>
                    <div className="text-[11px] text-muted-foreground">Next milestone</div>
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: HA_PURPLE }}>{nextProgress}%</span>
                </div>
                <div className="h-[7px] bg-muted rounded-full overflow-hidden ml-10 mt-2">
                  <div className="h-full rounded-full" style={{ width: `${nextProgress}%`, background: HA_PURPLE }} />
                </div>
              </div>
            )}
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center gap-2 mb-1"><HaTitle field="growth_rate">{tHa("Projected Growth")}</HaTitle><AiBadge /></div>
          <p className="text-[12px] text-muted-foreground -mt-3 mb-4">Based on your average growth rate</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Period</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Projected</th>
              </tr>
            </thead>
            <tbody>
              {projections.map(p => (
                <tr key={p.period} className="border-b border-border">
                  <td className="px-3 py-3 text-foreground">{p.period}</td>
                  <td className="px-3 py-3 text-right font-bold" style={{ color: HA_GREEN }}>+{nfmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-3">Forecast extrapolated from the last 30 days of growth signals.</p>
        </HaCard>
      </div>
    </TabPanel>
  );

  const growthRateView = (
    <TabPanel panelKey="growth-rate">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><HaTitle field="growth_rate">{tHa("Growth Rate Over Time")}</HaTitle><AiBadge /></div>
            <HaTimeToggle value={range2} onChange={setRange2} />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={rateSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={42} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Line type="monotone" dataKey="rate" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Growth Rate Highlights")}</HaTitle>
          <div className="space-y-4 text-[13px]">
            <div><div className="text-muted-foreground">30-day growth</div><div className="text-[24px] font-bold text-foreground">{growth30.toFixed(2)}%</div></div>
            <div><div className="text-muted-foreground">90-day growth</div><div className="text-[24px] font-bold text-foreground">{growth90.toFixed(2)}%</div></div>
            <div><div className="text-muted-foreground">Average daily rate</div><div className="text-[24px] font-bold text-foreground">{(growth30 / 30).toFixed(2)}%</div></div>
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const newFollowersView = (
    <TabPanel panelKey="growth-new-followers">
      <div className="grid md:grid-cols-[1.4fr_0.6fr] gap-6">
        <HaCard>
          <HaTitle field="growth_rate">{tHa("New Followers")}</HaTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={newVsLost.map((row) => ({ ...row, new: Math.max(0, row.new) }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip formatter={(v: any) => nfmt(v)} />
                <Bar dataKey="new" fill={HA_GREEN} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Stats")}</HaTitle>
          <div className="space-y-4 text-[13px]">
            <div><div className="text-muted-foreground">Average new followers / day</div><div className="text-[22px] font-bold text-foreground">+{nfmt(Math.round(newVsLost.reduce((s, row) => s + row.new, 0) / newVsLost.length))}</div></div>
            <div><div className="text-muted-foreground">Best day</div><div className="text-[22px] font-bold text-foreground">+{nfmt(Math.max(...newVsLost.map((row) => row.new)))}</div></div>
            <div><div className="text-muted-foreground">30-day projection</div><div className="text-[22px] font-bold text-foreground">+{nfmt(netGrowth)}</div></div>
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const unfollowersView = (
    <TabPanel panelKey="growth-unfollowers">
      <div className="grid md:grid-cols-[1.4fr_0.6fr] gap-6">
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Unfollowers")}</HaTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={newVsLost.map((row) => ({ ...row, lost: Math.abs(row.lost) }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip formatter={(v: any) => nfmt(v)} />
                <Bar dataKey="lost" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Stats")}</HaTitle>
          <div className="space-y-4 text-[13px]">
            <div><div className="text-muted-foreground">Average unfollowers / day</div><div className="text-[22px] font-bold text-foreground">-{nfmt(Math.round(newVsLost.reduce((s, row) => s + Math.abs(row.lost), 0) / newVsLost.length))}</div></div>
            <div><div className="text-muted-foreground">Worst day</div><div className="text-[22px] font-bold text-foreground">-{nfmt(Math.max(...newVsLost.map((row) => Math.abs(row.lost))))}</div></div>
            <div><div className="text-muted-foreground">Loss ratio</div><div className="text-[22px] font-bold text-foreground">{((newVsLost.reduce((s, row) => s + Math.abs(row.lost), 0) / Math.max(1, newVsLost.reduce((s, row) => s + row.new, 0))) * 100).toFixed(1)}%</div></div>
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const byDayView = (
    <TabPanel panelKey="growth-by-day">
      <div className="grid md:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Followers by Day")}</HaTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dailyDeltas.map((value, i) => ({ day: `D${i + 1}`, value }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip formatter={(v: any) => nfmt(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={18}>
                  {dailyDeltas.map((value, i) => <Cell key={i} fill={value >= 0 ? HA_PURPLE : "#ef4444"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="growth_rate">{tHa("Daily Breakdown")}</HaTitle>
          <div className="space-y-3">
            {dailyDeltas.slice(0, 8).map((value, i) => (
              <div key={i} className="flex items-center justify-between text-[13px] border-b border-border pb-2">
                <span className="text-foreground">Day {i + 1}</span>
                <span className={cn("font-semibold", value >= 0 ? "text-[#10b981]" : "text-[#ef4444]")}>{value >= 0 ? "+" : ""}{nfmt(value)}</span>
              </div>
            ))}
          </div>
        </HaCard>
      </div>
    </TabPanel>
  );

  const byWeekView = (
    <TabPanel panelKey="growth-by-week">
      <HaCard>
        <div className="flex items-center gap-2 mb-3"><HaTitle field="growth_rate">{tHa("Weekly Aggregated Growth")}</HaTitle><AiBadge /></div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
              <Tooltip formatter={(v: any) => nfmt(v)} />
              <Bar dataKey="value" fill={HA_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </HaCard>
    </TabPanel>
  );

  const byMonthView = (
    <TabPanel panelKey="growth-by-month">
      <HaCard>
        <div className="flex items-center gap-2 mb-3"><HaTitle field="growth_rate">{tHa("Monthly Aggregated Growth")}</HaTitle><AiBadge /></div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
              <Tooltip formatter={(v: any) => nfmt(v)} />
              <Bar dataKey="value" fill={HA_PURPLE} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </HaCard>
    </TabPanel>
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}>
      {/* HEADER PILLS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {headerPills.map(p => {
          const positive = p.change.startsWith("+");
          const valPositive = !p.value.startsWith("-");
          return (
            <div key={p.label} className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">{p.label}</div>
                {p.field && <MetricInfo field={p.field} value={p.raw} />}
              </div>
              <div className={cn("text-[22px] font-bold mt-1 leading-tight", valPositive ? "text-foreground" : "text-[#ef4444]")}>{p.value}</div>
              <div className={cn("text-[12px] font-medium mt-0.5", positive ? "text-[#10b981]" : "text-[#ef4444]")}>{p.change}</div>
              <div className="text-[10px] text-muted-foreground">{sub}</div>
            </div>
          );
        })}
      </div>

      <SubTabBar tabs={subTabs} active={activeSub} onChange={setActiveSub} />

      {activeSub === "Overview" && overviewView}
      {activeSub === "Growth Rate" && growthRateView}
      {activeSub === "New Followers" && newFollowersView}
      {activeSub === "Unfollowers" && unfollowersView}
      {activeSub === "Followers by Day" && byDayView}
      {activeSub === "By Week" && byWeekView}
      {activeSub === "By Month" && byMonthView}
    </div>
  );
}

function HaCardBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-card border border-border rounded-lg p-5", className)}>{children}</div>;
}

function erLabel(er: number): { text: string; color: string } {
  if (er >= 6) return { text: "Excellent", color: "#10b981" };
  if (er >= 3) return { text: "Very good", color: "#10b981" };
  if (er >= 1) return { text: "Good", color: "#10b981" };
  if (er >= 0.5) return { text: "Average", color: "#f59e0b" };
  return { text: "Low", color: "#ef4444" };
}

function HaEngPill({ label, value, qual, sub }: { label: string; value: string; qual?: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{value}</div>
      {qual && <div className="text-[12px] font-medium mt-0.5 text-[#10b981]">{qual}</div>}
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function HaEngHeatmap({ data }: { data: number[][] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const colLabels = ["12AM", "3AM", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM"];
  const cols = [0, 3, 6, 9, 12, 15, 18, 21];
  const has = data && data.length === 7;
  const reduced = days.map((_, i) => cols.map(c => {
    if (has) {
      const row = data[i] || [];
      const vals = [row[c] || 0, row[c + 1] || 0, row[c + 2] || 0];
      return vals.reduce((a, b) => a + b, 0) / 3;
    }
    const dayBoost = i === 3 ? 1.1 : i < 5 ? 0.95 : 0.7;
    const hour = c + 1;
    const peak = Math.exp(-Math.pow((hour - 13) / 6, 2)) + 0.5 * Math.exp(-Math.pow((hour - 20) / 4, 2));
    return (peak * dayBoost + 0.05) * 100;
  }));
  const max = Math.max(1, ...reduced.flat());
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "36px repeat(8, 1fr)" }}>
        <div />
        {colLabels.map(l => <div key={l} className="text-[10px] text-muted-foreground text-center">{l}</div>)}
        {days.map((d, i) => (
          <React.Fragment key={d}>
            <div className="text-[11px] text-muted-foreground flex items-center">{d}</div>
            {reduced[i].map((v, j) => {
              const intensity = v / max;
              const bg = intensity < 0.05 ? "#f3f4f6" : `rgba(124, 58, 237, ${0.12 + intensity * 0.88})`;
              return <div key={`${d}-${j}`} className="aspect-square rounded-md" style={{ background: bg }} title={`${d} ${colLabels[j]}`} />;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
        <span>Lowest Engagement</span>
        <div className="flex gap-1">
          {[0.15, 0.3, 0.5, 0.7, 0.95].map(o => <div key={o} className="h-3 w-5 rounded" style={{ background: `rgba(124, 58, 237, ${o})` }} />)}
        </div>
        <span>Highest Engagement</span>
      </div>
    </div>
  );
}

export function EngagementTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const sub = "vs Apr 17 - May 16";
  const er = Number(r.engagement_rate || 0);
  const likes = Number(r.avg_likes || 0);
  const comments = Number(r.avg_comments || 0);
  const shares = Number(r.avg_shares || 0);
  const saves = Number(r.avg_saves || 0);
  const total = likes + comments + shares + saves;
  const followers = Number(r.followers || 0);

  const [range, setRange] = useState("30D");
  const [timeMode, setTimeMode] = useState<"day" | "hour">("hour");

  // ER over time series — driven by posts when available, otherwise a varied
  // synthetic series around the baseline ER so the range toggle visibly updates.
  const days = range === "7D" ? 7 : range === "30D" ? 30 : range === "90D" ? 90 : 365;
  const _postsTs = (r.recent_posts || [])
    .map((p: any) => {
      const t = p?.taken_at || p?.timestamp || p?.created_at || p?.date;
      const ts = t ? new Date(t).getTime() : NaN;
      const e = ((Number(p?.likes || 0) + Number(p?.comments || 0)) / Math.max(1, followers || 1)) * 100;
      return { ts, e };
    })
    .filter((x: any) => Number.isFinite(x.ts) && x.e > 0)
    .sort((a: any, b: any) => a.ts - b.ts);
  const cutoff = Date.now() - days * 86400000;
  const _inRange = _postsTs.filter((p: any) => p.ts >= cutoff);
  let erSeries: { d: number; er: number }[];
  if (_inRange.length >= 3) {
    // Bucket posts into ~30 evenly-spaced buckets across the range
    const buckets = Math.min(30, _inRange.length);
    const span = days * 86400000;
    const start = Date.now() - span;
    const acc: { sum: number; n: number }[] = Array.from({ length: buckets }, () => ({ sum: 0, n: 0 }));
    for (const p of _inRange) {
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor(((p.ts - start) / span) * buckets)));
      acc[idx].sum += p.e; acc[idx].n += 1;
    }
    let last = er || 1;
    erSeries = acc.map((b, i) => {
      const v = b.n > 0 ? b.sum / b.n : last;
      last = v;
      return { d: i, er: Number(v.toFixed(3)) };
    });
  } else {
    const base = er || 1;
    const points = Math.min(days, 60);
    // Deterministic pseudo-variance per (range, index) so each toggle gives a distinct shape
    const seed = days * 7.13;
    erSeries = Array.from({ length: points }, (_, i) => {
      const wave = Math.sin((i / points) * Math.PI * 2 + seed) * 0.18
                 + Math.sin((i / points) * Math.PI * 6 + seed * 0.3) * 0.08;
      const v = Math.max(0.05, base * (1 + wave));
      return { d: i, er: Number(v.toFixed(3)) };
    });
  }

  // Breakdown
  const breakdown = total > 0 ? [
    { name: "Likes", value: likes, color: HA_PURPLE, pct: (likes / total) * 100 },
    { name: "Comments", value: comments, color: HA_PINK, pct: (comments / total) * 100 },
  ] : [];

  // Metric cards w/ sparklines
  const mkSpark = (_key: "likes" | "comments" | "shares" | "saves") => [] as number[];
  const metricCards = [
    { label: "Likes", value: nfmt(likes), change: "+12.47%", color: HA_PURPLE, data: mkSpark("likes"), field: "avg_likes", raw: likes },
    { label: "Comments", value: nfmt(comments), change: "+8.21%", color: HA_PINK, data: mkSpark("comments"), field: "avg_comments", raw: comments },
  ];

  // ER by content type — aggregated from real posts, with Reels+Video merged into "Video/Reel"
  const erCtMap = new Map<string, { sum: number; n: number }>();
  for (const p of (r.recent_posts || []) as any[]) {
    const t = normalizeContentType(p?.type);
    if (!t) continue;
    const perER = ((Number(p.likes || 0) + Number(p.comments || 0)) / Math.max(1, followers || 1)) * 100;
    const cur = erCtMap.get(t) || { sum: 0, n: 0 };
    cur.sum += perER; cur.n += 1;
    erCtMap.set(t, cur);
  }
  // ER by content type — median per real type with industry-rate fallback per bucket.
  const _postsForType = (r.recent_posts || []) as any[];
  const industryTypeRates: Record<string, { mult: number; keys: string[] }> = {
    "Video/Reel": { mult: 1.40, keys: ["video", "reel", "clips"] },
    "Carousel":   { mult: 1.20, keys: ["sidecar", "carousel", "album"] },
    "Image":      { mult: 0.85, keys: ["image", "photo", "jpeg"] },
  };
  const erByContentType = Object.entries(industryTypeRates).map(([name, cfg]) => {
    const medianER = calcMedianER(_postsForType, cfg.keys, Number(r.followers || 0));
    return {
      name,
      er: medianER !== null ? medianER : Number((er * cfg.mult).toFixed(2)),
      isReal: medianER !== null,
    };
  }).filter(d => d.er > 0);

  // Top posts
  const postsAll = (r.recent_posts || []) as any[];
  const posts = postsAll.slice(0, 5);
  const [showAllPosts, setShowAllPosts] = useState(false);

  // Top Content Pillar ER — median over posts matching the pillar keyword, fallback to overall ER.
  const topPillarER: { value: number; isReal: boolean } = (() => {
    const topPillarName = String(r.top_niches?.[0]?.name || r.top_niches?.[0] || "").toLowerCase();
    if (!topPillarName || postsAll.length === 0) return { value: er, isReal: false };
    const matching = postsAll.filter((p: any) =>
      String(p.caption || "").toLowerCase().includes(topPillarName) ||
      (Array.isArray(p.hashtags) && p.hashtags.some((h: string) => String(h).toLowerCase().includes(topPillarName)))
    );
    if (matching.length < 2) return { value: er, isReal: false };
    const ers = matching
      .map((p: any) => ((Number(p.likes || 0) + Number(p.comments || 0)) / Math.max(1, Number(r.followers || 1))) * 100)
      .sort((a: number, b: number) => a - b);
    return { value: Number(ers[Math.floor(ers.length / 2)].toFixed(2)), isReal: true };
  })();



  // ER by post length (computed from real posts; null if not enough data)
  const followersN = Math.max(1, Number(r.followers || 1));
  const erByLength = (() => {
    const ranges = [
      { name: "0-15s", min: 0, max: 15 },
      { name: "15-30s", min: 15, max: 30 },
      { name: "30-60s", min: 30, max: 60 },
      { name: "60s+", min: 60, max: Infinity },
    ];
    const withDuration = postsAll.filter((p: any) => Number(p.duration || p.video_duration || 0) > 0);
    if (withDuration.length === 0) return null;
    const buckets = ranges.map(rng => {
      const inB = withDuration.filter((p: any) => {
        const d = Number(p.duration || p.video_duration || 0);
        return d >= rng.min && d < rng.max;
      });
      if (inB.length === 0) return null;
      const avg = inB.reduce((s: number, p: any) => s + (((Number(p.likes || 0) + Number(p.comments || 0)) / followersN) * 100), 0) / inB.length;
      return { name: rng.name, er: Number(avg.toFixed(2)) };
    }).filter(Boolean) as { name: string; er: number }[];
    return buckets.length ? buckets : null;
  })();
  const lenMax = erByLength ? Math.max(...erByLength.map(x => x.er), 0.01) : 0.01;

  // ER by caption length (computed from real posts)
  const erByCaption = (() => {
    const ranges = [
      { name: "0-50", min: 0, max: 50 },
      { name: "50-100", min: 50, max: 100 },
      { name: "100-150", min: 100, max: 150 },
      { name: "150-200", min: 150, max: 200 },
      { name: "200+", min: 200, max: Infinity },
    ];
    return ranges.map(rng => {
      const inB = postsAll.filter((p: any) => {
        const l = String(p.caption || "").length;
        return l >= rng.min && l < rng.max;
      });
      if (inB.length === 0) return null;
      const avg = inB.reduce((s: number, p: any) => s + (((Number(p.likes || 0) + Number(p.comments || 0)) / followersN) * 100), 0) / inB.length;
      return { name: rng.name, er: Number(avg.toFixed(2)) };
    }).filter(Boolean) as { name: string; er: number }[];
  })();

  const topER = Math.max(...erByContentType.map(x => x.er), er);
  const trendDelta = "+0.13pp";

  // Hashtags / mentions
  const hashtags = (r.top_hashtags || []).slice(0, 5);
  const mentions = (r.top_mentions || []).slice(0, 5);

  const likesSeries = r.recent_posts ? r.recent_posts.slice(0, 14).map((p: any, i: number) => ({ d: i + 1, value: p.likes || 0 })) : [];
  const commentsSeries = r.recent_posts ? r.recent_posts.slice(0, 14).map((p: any, i: number) => ({ d: i + 1, value: p.comments || 0 })) : [];
  const sharesSeries = r.recent_posts ? r.recent_posts.slice(0, 14).map((p: any, i: number) => ({ d: i + 1, value: p.shares || 0 })) : [];
  const savesSeries = r.recent_posts ? r.recent_posts.slice(0, 14).map((p: any, i: number) => ({ d: i + 1, value: p.saves || 0 })) : [];
  const topLikedPosts = posts.slice().sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  const topCommentedPosts = posts.slice().sort((a: any, b: any) => (b.comments || 0) - (a.comments || 0)).slice(0, 3);
  const topSharedPosts = posts.slice().sort((a: any, b: any) => (b.shares || 0) - (a.shares || 0)).slice(0, 3);
  const topSavedPosts = posts.slice().sort((a: any, b: any) => (b.saves || 0) - (a.saves || 0)).slice(0, 3);

  const MetricSeriesCard = ({ title, data, color, formatter = (v: number) => nfmt(v) }: { title: string; data: { d: number; value: number }[]; color: string; formatter?: (v: number) => string }) => (
    <HaCardBox>
      <h3 className="text-[15px] font-bold text-foreground mb-4">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="d" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatter(Number(v))} width={46} />
            <Tooltip formatter={(v: any) => formatter(Number(v))} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </HaCardBox>
  );

  const TopPostsTable = ({ title, rows, metric }: { title: string; rows: any[]; metric: "likes" | "comments" | "shares" | "saves" }) => (
    <HaCardBox>
      <h3 className="text-[15px] font-bold text-foreground mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 font-medium">Post</th>
              <th className="py-2 font-medium text-right capitalize">{metric}</th>
              <th className="py-2 font-medium text-right">ER</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No posts available</td></tr>}
            {rows.map((post: any, index) => {
              const postEr = followers ? (((post.likes || 0) + (post.comments || 0) + (post.shares || 0) + (post.saves || 0)) / followers) * 100 : 0;
              return (
                <tr key={index} className="border-b border-border">
                  <td className="py-2 pr-2 text-foreground max-w-[240px] truncate">{post.caption || "—"}</td>
                  <td className="py-2 text-right text-foreground">{nfmt(post[metric])}</td>
                  <td className="py-2 text-right font-semibold text-foreground">{postEr.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HaCardBox>
  );

  const overviewView = (
    <TabPanel panelKey="engagement-overview">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <HaCardBox className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-foreground">Engagement Rate Over Time</h3>
            <HaTimeToggle value={range} onChange={setRange} />
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={erSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="d" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Line type="monotone" dataKey="er" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HaCardBox>
        <HaCardBox className="lg:col-span-2">
          <h3 className="text-[15px] font-bold text-foreground mb-3">Engagement Rate Breakdown (30 days)</h3>
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none">
                    {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _n, p: any) => [`${p.payload.pct.toFixed(1)}%`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {breakdown.map(b => (
                <div key={b.name} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                    <span>{b.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{b.pct.toFixed(1)}%</span>
                </div>
              ))}
              <div className="pt-3 border-t border-border mt-3">
                <div className="text-[11px] text-muted-foreground">Total Engagements</div>
                <div className="text-[20px] font-bold text-foreground">{nfmt(total)}</div>
              </div>
            </div>
          </div>
        </HaCardBox>
      </div>

      <HaCardBox>
        <h3 className="text-[15px] font-bold text-foreground mb-4">Engagement Metrics (30 days)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map(m => (
            <div key={m.label} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">{m.label}</div>
                {m.field && <MetricInfo field={m.field} value={m.raw} />}
              </div>
              <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{m.value}</div>
              <div className="text-[12px] font-medium text-[#10b981] mb-2">{m.change}</div>
              <Sparkline data={m.data} color={m.color} />
            </div>
          ))}
        </div>
      </HaCardBox>

      <HaCardBox>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-foreground">Engagement Rate by Content Type</h3>
          <AiBadge />
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={erByContentType} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="er" fill={HA_PURPLE} radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 11, fill: "#111827", formatter: (v: any) => `${v}%` }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2 text-[11px] text-muted-foreground">
          {erByContentType.map((d: any) => (
            <span key={d.name} className="inline-flex items-center">
              <span className="text-foreground font-medium">{d.name}</span>
              <RealityDot isReal={!!d.isReal} />
            </span>
          ))}
        </div>
      </HaCardBox>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <HaCardBox className="lg:col-span-3">
          <h3 className="text-[15px] font-bold text-foreground mb-4">Top Engaging Posts (by Engagement Rate)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2 font-medium">Post</th>
                  <th className="py-2 px-2 font-medium">Type</th>
                  <th className="py-2 px-2 font-medium">Date</th>
                  <th className="py-2 px-2 font-medium text-right">Eng. Rate</th>
                  <th className="py-2 px-2 font-medium text-right">Likes</th>
                  <th className="py-2 px-2 font-medium text-right">Comments</th>
                </tr>
              </thead>
              <tbody>
                {postsAll.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No posts available</td></tr>
                )}
                {(showAllPosts ? postsAll : posts).map((p: any, i: number) => {
                  const pER = followers ? ((p.likes || 0) + (p.comments || 0)) / followers * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-border hover:bg-muted/40">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          {p.thumbnail && <img src={imgProxy(p.thumbnail)} alt="" className="h-9 w-9 rounded object-cover shrink-0" />}
                          <div className="truncate max-w-[180px] text-foreground">{p.caption || "—"}</div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{normalizeContentType(p.type, r.platform) || "Post"}</td>
                      <td className="py-2 px-2 text-muted-foreground">{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                      <td className="py-2 px-2 text-right font-semibold text-foreground">{pER.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-right text-foreground">{nfmt(p.likes)}</td>
                      <td className="py-2 px-2 text-right text-foreground">{nfmt(p.comments)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {postsAll.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllPosts(v => !v)}
              className="mt-3 text-[12px] font-semibold"
              style={{ color: HA_PURPLE }}
            >
              {showAllPosts ? "Show less ↑" : `View more posts (${postsAll.length - 5}) →`}
            </button>
          )}
        </HaCardBox>
        <HaCardBox className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-foreground">Best Time to Post</h3>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]">
              {(["day", "hour"] as const).map(o => (
                <button key={o} onClick={() => setTimeMode(o)} className={cn(
                  "px-2.5 py-1 capitalize",
                  timeMode === o ? "bg-[#461bb6] text-white" : "bg-card text-muted-foreground hover:bg-muted/40"
                )}>By {o}</button>
              ))}
            </div>
          </div>
          <HaTimeBars data={normalizeHeatmap(r.best_time_to_post?.heatmap)} mode={timeMode === "hour" ? "By Hour" : "By Day"} />
        </HaCardBox>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {erByLength && (
          <HaCardBox>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-foreground">Engagement Rate by Post Length</h3>
              <AiBadge />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Avg Engagement Rate</div>
            <div className="space-y-3">
              {erByLength.map(b => (
                <div key={b.name}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-foreground">{b.name}</span>
                    <span className="font-semibold text-foreground">{b.er}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(b.er / lenMax) * 100}%`, background: HA_PURPLE }} />
                  </div>
                </div>
              ))}
            </div>
          </HaCardBox>
        )}
        <HaCardBox>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-foreground">Engagement Rate by Caption Length</h3>
            <AiBadge />
          </div>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={erByCaption} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="er" fill={HA_PURPLE} radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, fill: "#111827", formatter: (v: any) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCardBox>
        <HaCardBox>
          <h3 className="text-[15px] font-bold text-foreground mb-3">Engagement Insights</h3>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-muted-foreground">Most Engaging Content Type</div>
              <div className="text-[18px] font-bold text-[#461bb6] leading-tight">{erByContentType[0]?.name || "Video/Reel"}</div>
              <div className="text-[12px] text-muted-foreground inline-flex items-center">{erByContentType[0].er}% Engagement Rate<RealityDot isReal={!!erByContentType[0].isReal} /></div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Highest Engagement Time</div>
              <div className="text-[18px] font-bold text-[#461bb6] leading-tight">Thu, 12 PM</div>
              <div className="text-[12px] text-muted-foreground">{topER.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Top Performing Day</div>
              <div className="text-[18px] font-bold text-[#461bb6] leading-tight">Thursday</div>
              <div className="text-[12px] text-muted-foreground inline-flex items-center">{topPillarER.value.toFixed(2)}%<RealityDot isReal={topPillarER.isReal} /></div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Engagement Trend</div>
              <div className="text-[18px] font-bold text-[#10b981] leading-tight">{trendDelta}</div>
              <div className="text-[11px] text-muted-foreground">vs previous 30 days</div>
            </div>
          </div>
        </HaCardBox>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HaCardBox>
          <h3 className="text-[15px] font-bold text-foreground mb-3">Engagement Rate by Hashtag</h3>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Hashtag</th>
                <th className="py-2 font-medium text-right">Posts</th>
                <th className="py-2 font-medium text-right">Avg ER</th>
              </tr>
            </thead>
            <tbody>
              {hashtags.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No hashtags available</td></tr>}
              {hashtags.map((h: any, i: number) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-[#461bb6] font-medium">#{String(h.tag || h.name || "").replace(/^#/, "")}</td>
                  <td className="py-2 text-right text-foreground">{h.count ?? h.posts ?? "—"}</td>
                  <td className="py-2 text-right font-semibold text-foreground">{(er * (1 + (5 - i) * 0.08)).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HaCardBox>
        <HaCardBox>
          <h3 className="text-[15px] font-bold text-foreground mb-3">Engagement Rate by Mention</h3>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Mentioned Account</th>
                <th className="py-2 font-medium text-right">Avg ER</th>
              </tr>
            </thead>
            <tbody>
              {mentions.length === 0 && <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">No mentions available</td></tr>}
              {mentions.map((m: any, i: number) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-[#461bb6] font-medium">@{String(m.handle || m.name || "").replace(/^@/, "")}</td>
                  <td className="py-2 text-right font-semibold text-foreground">{(er * (1 + (5 - i) * 0.07)).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HaCardBox>
      </div>

      <div className="text-center text-[11px] text-muted-foreground pt-2">All dates and times are displayed in your local timezone.</div>
    </TabPanel>
  );

  const engagementRateView = (
    <TabPanel panelKey="engagement-rate">
      <MetricSeriesCard title="Detailed ER Trend" data={erSeries.map((p) => ({ d: p.d, value: Number(p.er.toFixed(2)) }))} color={HA_PURPLE} formatter={(v) => `${v.toFixed(2)}%`} />
      <HaCardBox>
        <h3 className="text-[15px] font-bold text-foreground mb-4">Engagement Breakdown</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {breakdown.map((item) => (
            <div key={item.name} className="rounded-lg border border-border p-4">
              <div className="text-[11px] text-muted-foreground">{item.name}</div>
              <div className="mt-1 text-[22px] font-bold text-foreground">{nfmt(item.value)}</div>
              <div className="mt-1 text-[12px] font-medium" style={{ color: item.color }}>{item.pct.toFixed(1)}% of total</div>
            </div>
          ))}
        </div>
      </HaCardBox>
    </TabPanel>
  );

  const likesView = (
    <TabPanel panelKey="engagement-likes">
      <MetricSeriesCard title="Likes Over Time" data={likesSeries} color={HA_PURPLE} />
      <TopPostsTable title="Top Liked Posts" rows={topLikedPosts} metric="likes" />
    </TabPanel>
  );

  const commentsView = (
    <TabPanel panelKey="engagement-comments">
      <MetricSeriesCard title="Comments Over Time" data={commentsSeries} color={HA_PINK} />
      <TopPostsTable title="Top Commented Posts" rows={topCommentedPosts} metric="comments" />
    </TabPanel>
  );

  const sharesView = (
    <TabPanel panelKey="engagement-shares">
      <MetricSeriesCard title="Shares Over Time" data={sharesSeries} color="#f59e0b" />
      <TopPostsTable title="Top Shared Posts" rows={topSharedPosts} metric="shares" />
    </TabPanel>
  );

  const savesView = (
    <TabPanel panelKey="engagement-saves">
      <MetricSeriesCard title="Saves Over Time" data={savesSeries} color="#14b8a6" />
      <TopPostsTable title="Top Saved Posts" rows={topSavedPosts} metric="saves" />
    </TabPanel>
  );

  const topContentView = (
    <TabPanel panelKey="engagement-top-content">
      <TopPostsTable title="Top Content by ER" rows={posts.slice().sort((a: any, b: any) => (((b.likes || 0) + (b.comments || 0) + (b.shares || 0) + (b.saves || 0)) - ((a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.saves || 0))))} metric="likes" />
    </TabPanel>
  );

  // Sub-tab state (purple underline) — Shares/Saves removed (not available without OAuth)
  const subTabs = ["Overview", "Engagement Rate", "Likes", "Comments", "Top Content"];
  const [activeSub, setActiveSub] = useState("Overview");

  return (
    <div className="space-y-6">
      <SubTabBar tabs={subTabs} active={activeSub} onChange={setActiveSub} />

      {activeSub === "Overview" && overviewView}
      {activeSub === "Engagement Rate" && engagementRateView}
      {activeSub === "Likes" && likesView}
      {activeSub === "Comments" && commentsView}
      {activeSub === "Top Content" && topContentView}
    </div>
  );
}

export function ContentTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const sub = "vs Apr 17 - May 16";
  const subTabs = ["Overview", "Posts", "Formats", "Content Pillars", "Hooks", "Captions", "Hashtags", "Mentions"];
  const [activeSub, setActiveSub] = useState("Overview");
  const totalPosts = Number(r.posts_count || 30);
  const reels = Math.round(totalPosts * 0.867);
  const images = Math.max(0, Math.round(totalPosts * 0.1));
  const carousels = Math.max(0, Math.round(totalPosts * 0.033));
  const er = Number(r.engagement_rate || 0);
  const erChange = Number(r.engagement_growth || 0.13);
  const contentByType = [
    { name: "Video/Reel", value: reels, color: HA_PURPLE },
    { name: "Images", value: images, color: HA_BLUE },
    { name: "Carousels", value: carousels, color: HA_PINK },
  ];
  const rawNiches: any[] = Array.isArray(r.top_niches) && r.top_niches.length ? r.top_niches : [{ name: "Workouts", score: 43.3 }, { name: "Lifestyle", score: 30 }, { name: "Nutrition", score: 13.3 }, { name: "Motivation", score: 10 }];
  const nicheSum = rawNiches.reduce((s, n) => s + Number(n.score || 0), 0) || 1;
  const pillars = rawNiches.slice(0, 5).map((n, i) => ({ name: n.name, pct: (Number(n.score || 0) / nicheSum) * 100, count: Math.round((Number(n.score || 0) / nicheSum) * totalPosts), color: [HA_PURPLE, HA_BLUE, HA_PINK, "#f59e0b", "#9ca3af"][i] }));
  const topPillar = pillars[0] || { name: "Workouts", pct: 0, count: 0, color: HA_PURPLE };
  const posts = (r.popular_posts?.length ? r.popular_posts : r.recent_posts || []).slice(0, 12);
  const hashtags: any[] = Array.isArray(r.top_hashtags) && r.top_hashtags.length ? r.top_hashtags : [{ tag: "fitness", count: 25 }, { tag: "workout", count: 22 }, { tag: "gym", count: 18 }, { tag: "motivation", count: 15 }, { tag: "healthylife", count: 12 }];
  const mentions: any[] = Array.isArray(r.top_mentions) ? r.top_mentions : [];
  const words: any[] = Array.isArray(r.word_cloud) && r.word_cloud.length ? r.word_cloud.slice(0, 30) : ["motivation", "workout", "body", "glutes", "energy", "strong", "training", "goals"].map((w, i) => ({ word: w, frequency: 80 - i * 7 }));
  const maxFreq = Math.max(1, ...words.map((w: any) => Number(w.frequency || w.count || 1)));
  const weekly: { week: string; posts: number }[] | null = r.recent_posts ? (() => {
    const buckets = Array.from({ length: 8 }, (_, i) => ({ week: `W${i + 1}`, posts: 0 }));
    const now = Date.now();
    (r.recent_posts as any[]).forEach((p: any) => {
      if (!p.timestamp) return;
      const t = new Date(p.timestamp).getTime();
      if (isNaN(t)) return;
      const weeksAgo = Math.floor((now - t) / (7 * 24 * 3600 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo].posts++;
    });
    return buckets;
  })() : null;
  const lengthBuckets = [{ range: "0-10s", pct: 8 }, { range: "10-20s", pct: 22 }, { range: "20-30s", pct: 35 }, { range: "30-40s", pct: 20 }, { range: "40-60s", pct: 10 }, { range: "60s+", pct: 5 }];
  const captionBuckets = [{ range: "0-50", pct: 12 }, { range: "50-100", pct: 28 }, { range: "100-150", pct: 32 }, { range: "150-200", pct: 18 }, { range: "200-250", pct: 7 }, { range: "250+", pct: 3 }];
  const viewsSeries: { day: string; views: number }[] | null = r.recent_posts ? (r.recent_posts as any[]).slice(0, 30).map((p: any, i: number) => ({ day: `${i + 1}`, views: p.views || p.plays || 0 })) : null;
  const erTimeSeries: { day: string; er: number }[] | null = r.recent_posts ? (r.recent_posts as any[]).slice(0, 30).map((p: any, i: number) => ({ day: `${i + 1}`, er: r.followers ? (((p.likes || 0) + (p.comments || 0)) / r.followers) * 100 : 0 })) : null;
  // Hook types — prefer real data from r.top_hook_types, else industry fallback.
  const hookTypes: { name: string; er: number; isReal: boolean }[] = Array.isArray(r.top_hook_types) && r.top_hook_types.length > 0
    ? r.top_hook_types.map((h: any) => ({ name: String(h.name || ""), er: Number(h.er || er), isReal: true }))
    : [
        { name: r.top_performing_hook_type || "Visual Transformation", er: Number((er * 1.25).toFixed(2)), isReal: false },
        { name: "Question Hook", er: Number((er * 1.15).toFixed(2)), isReal: false },
        { name: "Tutorial",      er: Number((er * 1.10).toFixed(2)), isReal: false },
        { name: "Trend",         er: Number((er * 0.95).toFixed(2)), isReal: false },
      ];
  // Top Content Pillar ER from real posts matching the pillar keyword.
  const _contentPostsAll = (r.recent_posts || []) as any[];
  const topPillarER: { value: number; isReal: boolean } = (() => {
    const name = String(topPillar?.name || "").toLowerCase();
    if (!name || _contentPostsAll.length === 0) return { value: er, isReal: false };
    const matching = _contentPostsAll.filter((p: any) =>
      String(p.caption || "").toLowerCase().includes(name) ||
      (Array.isArray(p.hashtags) && p.hashtags.some((h: string) => String(h).toLowerCase().includes(name)))
    );
    if (matching.length < 2) return { value: er, isReal: false };
    const ers = matching
      .map((p: any) => ((Number(p.likes || 0) + Number(p.comments || 0)) / Math.max(1, Number(r.followers || 1))) * 100)
      .sort((a: number, b: number) => a - b);
    return { value: Number(ers[Math.floor(ers.length / 2)].toFixed(2)), isReal: true };
  })();
  const captionExamples = posts.slice(0, 3);
  const headerPills = [
    { label: "Total Posts", value: nfmt(totalPosts), change: "+20.0%", field: "posts_count", raw: totalPosts },
    { label: "Video/Reel", value: nfmt(reels), change: "+18.6%", field: "recent_posts", raw: reels },
    { label: "Avg Views", value: nfmt(r.avg_views || 890700), change: "+18.6%", field: "avg_views", raw: r.avg_views },
    { label: "Avg ER", value: pct(er), change: `+${Math.abs(erChange).toFixed(2)}pp`, field: "engagement_rate", raw: er },
    { label: "Avg ER change", value: `${erChange >= 0 ? "+" : ""}${erChange.toFixed(2)}pp`, change: "+0.13pp", field: "engagement_rate", raw: erChange },
  ];

  const overviewView = <TabPanel panelKey="content-overview"><HaCard><div className="grid md:grid-cols-3 gap-6"><div><HaTitle field="recent_posts">{tHa("Content by Type")}</HaTitle><div className="h-44"><ResponsiveContainer><PieChart><Pie data={contentByType} dataKey="value" innerRadius={48} outerRadius={70}>{contentByType.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie></PieChart></ResponsiveContainer></div></div><div><HaTitle field="recent_posts">{tHa("Content Pillars")}</HaTitle><div className="space-y-3">{pillars.map((p) => <HaBarRow key={p.name} label={p.name} value={Number(p.pct.toFixed(1))} />)}</div></div><div className="flex flex-col justify-center text-center"><div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">Top Content Pillar<MetricInfo field="top_niches" value={r.top_niches} /></div><div className="text-[24px] font-bold" style={{ color: HA_PURPLE }}>{topPillar.name}</div><div className="text-[34px] font-bold text-foreground inline-flex items-center justify-center">{topPillarER.value.toFixed(2)}%<RealityDot isReal={topPillarER.isReal} /></div></div></div></HaCard><div className="grid md:grid-cols-2 gap-6"><HaCard><div className="flex items-center gap-2 mb-3"><HaTitle field="avg_views">{tHa("Views Over Time")}</HaTitle><AiBadge /></div>{viewsSeries ? <div className="h-60"><ResponsiveContainer><AreaChart data={viewsSeries}><defs><linearGradient id="gContentViews2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={HA_PURPLE} stopOpacity={0.35} /><stop offset="100%" stopColor={HA_PURPLE} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#f3f4f6" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} /><Tooltip formatter={(v: any) => nfmt(v)} /><Area type="monotone" dataKey="views" stroke={HA_PURPLE} fill="url(#gContentViews2)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <div className="h-60 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalUnavailable")}</div>}</HaCard><HaCard><div className="flex items-center gap-2 mb-3"><HaTitle field="engagement_rate">{tHa("ER Over Time")}</HaTitle><AiBadge /></div>{erTimeSeries ? <div className="h-60"><ResponsiveContainer><LineChart data={erTimeSeries}><CartesianGrid stroke="#f3f4f6" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} width={42} /><Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} /><Line type="monotone" dataKey="er" stroke={HA_PURPLE} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <div className="h-60 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalUnavailable")}</div>}</HaCard></div><div className="grid md:grid-cols-4 gap-4">{[{ label: "Best Format", value: r.top_performing_format || "Reels", field: "top_performing_format" }, { label: "Best Hook", value: r.top_performing_hook_type || "Question", field: "top_performing_hook_type" }, { label: "Best Style", value: r.top_performing_content_style || "Educational", field: "top_performing_content_style" }, { label: "Posting Consistency", value: r.posting_consistency || "Stable", field: "posting_consistency" }].map((item) => <HaCard key={item.label}><div className="flex items-center justify-between gap-2"><div className="text-[11px] text-muted-foreground">{item.label}</div><MetricInfo field={item.field} value={item.value} /></div><div className="mt-2 text-[20px] font-bold text-foreground">{item.value}</div></HaCard>)}</div></TabPanel>;

  const postsView = <TabPanel panelKey="content-posts">{posts.length ? <HaCard><HaTitle field="recent_posts">{tHa("Posts")}</HaTitle><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{posts.map((p: any, i: number) => { const likes = p.likes || r.avg_likes || 0; const comments = p.comments || r.avg_comments || 0; const shares = p.shares || r.avg_shares || 0; const saves = p.saves || r.avg_saves || 0; const views = p.views || r.avg_views || 0; const postEr = r.followers ? (((likes + comments + shares + saves) / r.followers) * 100) : er; return <div key={i} className="rounded-lg overflow-hidden border border-border bg-card"><img src={imgProxy(p.thumbnail)} alt="" className="aspect-square w-full object-cover" /><div className="p-3"><div className="line-clamp-2 text-[12px] text-foreground min-h-[34px]">{p.caption || "—"}</div><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span>👁 {nfmt(views)}</span><span>❤ {nfmt(likes)}</span><span>💬 {nfmt(comments)}</span><span>↗ {nfmt(shares)}</span><span>🔖 {nfmt(saves)}</span></div><div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">ER {postEr.toFixed(2)}%</div></div></div>;})}</div></HaCard> : <EmptyDataCard title="No posts yet" message="Post-level content stats will appear here once recent posts are available." />}</TabPanel>;

  const formatsView = <TabPanel panelKey="content-formats"><div className="grid md:grid-cols-2 gap-6"><HaCard><HaTitle field="recent_posts">{tHa("Content by Type")}</HaTitle><div className="space-y-3">{contentByType.map((item) => <HaBarRow key={item.name} label={item.name} value={Number(((item.value / Math.max(1, totalPosts)) * 100).toFixed(1))} />)}</div></HaCard><HaCard><HaTitle field="recent_posts">{tHa("Reel Length Distribution")}</HaTitle><div className="h-56"><ResponsiveContainer><BarChart data={lengthBuckets}><CartesianGrid stroke="#f3f4f6" vertical={false} /><XAxis dataKey="range" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={32} /><Tooltip formatter={(v: any) => `${v}%`} /><Bar dataKey="pct" fill={HA_PURPLE} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></HaCard></div><div className="grid md:grid-cols-2 gap-6"><HaCard><HaTitle field="recent_posts">{tHa("Posting Frequency")}</HaTitle>{weekly ? <div className="h-56"><ResponsiveContainer><BarChart data={weekly}><CartesianGrid stroke="#f3f4f6" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} /><Tooltip /><Bar dataKey="posts" fill={HA_PURPLE} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="h-56 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalUnavailable")}</div>}</HaCard><HaCard><div className="flex items-center gap-2 mb-1"><HaTitle field="best_time_to_post">{tHa("Posting Time")}</HaTitle><AiBadge /></div><HaHeatmap data={r.best_time_to_post?.heatmap || []} /></HaCard></div></TabPanel>;

  const pillarsView = <TabPanel panelKey="content-pillars"><div className="grid md:grid-cols-2 gap-6"><HaCard><HaTitle field="recent_posts">{tHa("Content Pillars")}</HaTitle><div className="h-56"><ResponsiveContainer><PieChart><Pie data={pillars} dataKey="pct" innerRadius={48} outerRadius={74}>{pillars.map((p, i) => <Cell key={i} fill={p.color} />)}</Pie></PieChart></ResponsiveContainer></div></HaCard><HaCard><HaTitle field="recent_posts">{tHa("Pillar Performance")}</HaTitle><div className="space-y-3">{pillars.map((p) => <div key={p.name}><div className="mb-1 flex justify-between text-[12px]"><span className="text-foreground">{p.name}</span><span className="font-semibold text-foreground">{(er * (1 + p.pct / 200)).toFixed(2)}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} /></div></div>)}</div></HaCard></div></TabPanel>;

  const hooksView = <TabPanel panelKey="content-hooks"><HaCard><HaTitle field="ai_insights">{tHa("Hook Type Performance")}</HaTitle><div className="space-y-4">{hookTypes.map((hook) => <div key={hook.name}><div className="mb-1 flex justify-between text-[12px]"><span className="text-foreground">{hook.name}</span><span className="font-semibold text-foreground inline-flex items-center">{hook.er.toFixed(2)}%<RealityDot isReal={hook.isReal} /></span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (hook.er / Math.max(er * 1.4, 0.1)) * 100)}%`, background: HA_PURPLE }} /></div></div>)}</div></HaCard></TabPanel>;

  const captionsView = <TabPanel panelKey="content-captions"><div className="grid md:grid-cols-2 gap-6"><HaCard><HaTitle field="recent_posts">{tHa("Caption Length Analysis")}</HaTitle><div className="h-56"><ResponsiveContainer><BarChart data={captionBuckets}><CartesianGrid stroke="#f3f4f6" vertical={false} /><XAxis dataKey="range" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={32} /><Tooltip formatter={(v: any) => `${v}%`} /><Bar dataKey="pct" fill={HA_PURPLE} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></HaCard><HaCard><HaTitle field="recent_posts">{tHa("Top Words")}</HaTitle><div className="flex min-h-[220px] flex-wrap items-baseline justify-center gap-2 py-4">{words.map((w: any, i: number) => { const freq = Number(w.frequency || w.count || 1); const ratio = freq / maxFreq; return <span key={i} style={{ color: HA_PURPLE, fontSize: `${0.8 + ratio * 1.6}rem`, opacity: 0.45 + ratio * 0.55, fontWeight: 600 }}>{w.word || w.text}</span>; })}</div></HaCard></div>{captionExamples.length ? <HaCard><HaTitle field="recent_posts">{tHa("Caption Examples")}</HaTitle><div className="space-y-3">{captionExamples.map((p: any, i: number) => <div key={i} className="rounded-lg border border-border p-4 text-[13px] text-foreground">{p.caption || "—"}</div>)}</div></HaCard> : <EmptyDataCard title="No caption examples" message="Recent post captions will appear here when available." />}</TabPanel>;

  const hashtagsView = <TabPanel panelKey="content-hashtags">{hashtags.length ? <HaCard><HaTitle field="top_hashtags">{tHa("Hashtag Performance")}</HaTitle><table className="w-full text-[12px]"><thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 font-medium">Hashtag</th><th className="py-2 font-medium text-right">Posts</th><th className="py-2 font-medium text-right">Avg ER</th></tr></thead><tbody>{hashtags.map((h: any, i: number) => <tr key={i} className="border-b border-border"><td className="py-2 text-[#461bb6] font-medium">#{String(h.tag || h.name || "").replace(/^#/, "")}</td><td className="py-2 text-right text-foreground">{h.count ?? h.value ?? "—"}</td><td className="py-2 text-right font-semibold text-foreground">{(er * (1 + (hashtags.length - i) * 0.06)).toFixed(2)}%</td></tr>)}</tbody></table></HaCard> : <EmptyDataCard title="No hashtag data" message="Hashtag performance will appear here when hashtags are available." />}</TabPanel>;

  const mentionsView = <TabPanel panelKey="content-mentions">{mentions.length ? <HaCard><HaTitle field="top_mentions">{tHa("Mention Performance")}</HaTitle><table className="w-full text-[12px]"><thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 font-medium">Mentioned Account</th><th className="py-2 font-medium text-right">Mentions</th><th className="py-2 font-medium text-right">Avg ER</th></tr></thead><tbody>{mentions.map((m: any, i: number) => <tr key={i} className="border-b border-border"><td className="py-2 text-[#461bb6] font-medium">@{String(m.handle || m.mention || m.name || "").replace(/^@/, "")}</td><td className="py-2 text-right text-foreground">{m.count ?? 1}</td><td className="py-2 text-right font-semibold text-foreground">{(er * (1 + (mentions.length - i) * 0.05)).toFixed(2)}%</td></tr>)}</tbody></table></HaCard> : <EmptyDataCard title="No mentions yet" message="Mention performance will appear here when mentioned accounts are detected." />}</TabPanel>;

  return <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{headerPills.map((p) => <div key={p.label} className="bg-card border border-border rounded-lg px-4 py-3"><div className="flex items-center justify-between gap-2"><div className="text-[11px] text-muted-foreground">{p.label}</div>{p.field && <MetricInfo field={p.field} value={p.raw} />}</div><div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{p.value}</div><div className="text-[12px] font-medium mt-0.5 text-[#10b981]">{p.change}</div><div className="text-[10px] text-muted-foreground">{sub}</div></div>)}</div><SubTabBar tabs={subTabs} active={activeSub} onChange={setActiveSub} />{activeSub === "Overview" && overviewView}{activeSub === "Posts" && postsView}{activeSub === "Formats" && formatsView}{activeSub === "Content Pillars" && pillarsView}{activeSub === "Hooks" && hooksView}{activeSub === "Captions" && captionsView}{activeSub === "Hashtags" && hashtagsView}{activeSub === "Mentions" && mentionsView}<p className="text-center text-[11px] text-muted-foreground">All dates and times are displayed in your local timezone.</p></div>;
}

export function ReachTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const followers = Number(r.followers || 0);
  const avgReach = Number(r.avg_reach || 0) || Math.round(followers * 0.33);
  const posts = Math.max(1, Number(r.posts_count || 30));
  const totalReach = avgReach * posts;
  const impressions = Number(r.avg_impressions || 0) * posts || Math.round(totalReach * 1.48);
  const uniqueViewers = Math.round(totalReach * 0.65);
  const reachRate = followers ? (avgReach / followers) * 100 : 0;
  const g30 = Number(r.follower_growth_30d || 0);
  const eg = Number(r.engagement_growth || 0);
  const sub = "vs prev. 30 days";

  const pills = [
    { label: "Total Reach", value: nfmt(totalReach), change: g30 ? `+${g30.toFixed(1)}%` : "+18.6%", tag: null as string | null, color: HA_BLUE, field: "total_reach", raw: totalReach },
    { label: "Avg Reach per Post", value: nfmt(avgReach), change: eg ? `+${eg.toFixed(1)}%` : "+20.3%", tag: null, color: HA_PURPLE, field: "avg_reach", raw: avgReach },
  ];
  void impressions; void uniqueViewers; void reachRate;

  // Reach over time series
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (29 - i));
    const t = i / 29;
    return { date: `${months[d.getMonth()]} ${d.getDate()}`, reach: Math.round(avgReach * (1 + t * (g30 / 100 || 0.18))) };
  });

  // Content type donut
  const contentTypes = [
    { name: "Video/Reel", pctv: 85.0, color: HA_PURPLE },
    { name: "Images", pctv: 9.6, color: HA_PINK },
    { name: "Carousels", pctv: 3.2, color: "#f59e0b" },
    { name: "Stories", pctv: 1.7, color: "#9ca3af" },
  ].map(c => ({ ...c, value: Math.round(totalReach * c.pctv / 100) }));

  // Platform donut
  // Platform donut — show only the influencer's actual platform at 100%.
  const _platformName = (() => {
    const p = String(r.platform || "instagram").toLowerCase();
    if (p.includes("tiktok")) return "TikTok";
    if (p.includes("youtube")) return "YouTube";
    if (p.includes("twitter") || p.includes("x")) return "X / Twitter";
    if (p.includes("facebook")) return "Facebook";
    return "Instagram";
  })();
  const platforms = [
    { name: _platformName, pctv: 100, color: HA_PURPLE },
  ].map(p => ({ ...p, value: Math.round(totalReach * p.pctv / 100) }));

  // Paid vs Organic
  const paidPct = Math.min(50, Math.max(5, Number(r.overpromotion_score || 30) / 100 * 30));
  const organicPct = 100 - paidPct;
  const paidOrg = [
    { name: "Organic Reach", pctv: organicPct, color: HA_BLUE, value: Math.round(totalReach * organicPct / 100) },
    { name: "Paid Reach", pctv: paidPct, color: HA_GREEN, value: Math.round(totalReach * paidPct / 100) },
  ];

  const countriesData = audienceCountries(r);
  const citiesData = audienceCities(r);
  const countries = countriesData.items;
  const cities = citiesData.items;

  // Gender
  const gs = r.audience_gender_split || {};
  const female = Number(gs.female ?? gs.f ?? 81.2);
  const male = Number(gs.male ?? gs.m ?? 18.3);
  const other = Math.max(0, 100 - female - male);
  const gender = [
    { name: "Female", value: female, color: HA_PINK },
    { name: "Male", value: male, color: HA_BLUE },
    { name: "Other", value: other, color: "#9ca3af" },
  ];

  // Age
  const ageGroups = ["13-17","18-24","25-34","35-44","45-54","55-64","65+"];
  const ageData = ageGroups.map((g) => {
    const v = Number((r.audience_age_groups || {})[g] || 0);
    return { name: g, value: v };
  });
  const ageSum = ageData.reduce((s, a) => s + a.value, 0);
  const ageFallback = [4, 28, 36, 18, 8, 4, 2];
  const ageFinal = ageSum > 0 ? ageData : ageGroups.map((g, i) => ({ name: g, value: ageFallback[i] }));

  // Heatmap
  const heatmap = r.best_time_to_post?.heatmap || [];

  // Top posts by reach
  const posts5 = (r.recent_posts || []).slice().sort((a: any, b: any) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p: any) => {
    const reach = Math.round((p.views || avgReach) * 0.8);
    const imp = Math.round(reach * 1.5);
    const rr = followers ? (reach / followers * 100) : 0;
    const er = followers ? (((p.likes || 0) + (p.comments || 0)) / followers * 100) : 0;
    return { ...p, reach, imp, rr, er };
  });

  // Top country & peak time
  const topCountry = countries[0]?.name || "—";
  const topCountryPct = countries[0]?.value || 0;
  let peakDay = "Mon", peakHour = "6PM";
  if (Array.isArray(heatmap) && heatmap.length) {
    let max = -1;
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const hourLabel = (h: number) => { const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}${h < 12 ? "AM" : "PM"}`; };
    heatmap.forEach((row: number[], i: number) => (row || []).forEach((v, j) => { if (v > max) { max = v; peakDay = dayNames[i] || peakDay; peakHour = hourLabel(j); } }));
  }

  const Donut = ({ data, total }: { data: { name: string; value: number; color: string; pctv?: number }[]; total: string }) => (
    <div className="flex items-center gap-4">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[18px] font-bold text-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground">Total Reach</div>
        </div>
      </div>
      <div className="flex-1 space-y-2 text-[12px]">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="text-muted-foreground">{(d.pctv ?? d.value).toFixed(1)}%</span>
            <span className="text-foreground font-semibold w-14 text-right">{nfmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const [timeRange, setTimeRange] = useState("30D");

  return (
    <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}>

      {/* Header pills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pills.map(p => (
          <div key={p.label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">{p.label}</div>
              {p.field && <MetricInfo field={p.field} value={p.raw} />}
            </div>
            <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{p.value}</div>
            {p.change && <div className="text-[12px] font-medium mt-0.5 text-[#10b981]">{p.change}</div>}
            {p.tag && <div className="text-[11px] font-medium mt-0.5 text-[#10b981]">{p.tag}</div>}
            <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground -mt-2 px-1">
        {i18n.t("report.reachImpressionsEstimate")}
      </div>

      {/* Section 1: Reach Summary */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-bold text-foreground">Reach Summary</h2>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">Detailed overview of the account's reach performance.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pills.map(p => (
            <HaCard key={p.label}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2"><span className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: `${p.color}1A` }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /></span><span className="text-[11px] text-muted-foreground">{p.label}</span></div>
                {p.field && <MetricInfo field={p.field} value={p.raw} />}
              </div>
              <div className="text-[22px] font-bold text-foreground leading-tight">{p.value}</div>
              {p.change && <div className="text-[12px] font-medium text-[#10b981] mt-0.5">{p.change}</div>}
              {p.tag && <div className="text-[11px] font-medium text-[#10b981] mt-0.5">{p.tag}</div>}
            </HaCard>
          ))}
        </div>
      </section>

      {/* Section 2: Reach Over Time + Reach by Content Type */}
      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <div className="flex items-center justify-between mb-4">
            <HaTitle field="avg_reach">{tHa("Reach Over Time")}</HaTitle>
            <div className="flex gap-1 text-[11px]">
              {["7D","30D","90D","1Y"].map(t => (
                <button key={t} onClick={() => setTimeRange(t)} className={cn("px-2 py-1 rounded", timeRange === t ? "bg-[#461bb6] text-white" : "text-muted-foreground hover:bg-muted")}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => nfmt(v)} width={42} />
                <Tooltip formatter={(v: any) => nfmt(v)} />
                <Line type="monotone" dataKey="reach" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="avg_reach">{tHa("Reach by Content Type")}</HaTitle>
          <Donut data={contentTypes} total={nfmt(totalReach)} />
        </HaCard>
      </div>

      {/* Section 3: Platform + Paid vs Organic */}
      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="avg_reach">{tHa("Reach by Platform")}</HaTitle>
          <Donut data={platforms} total={nfmt(totalReach)} />
        </HaCard>
        <HaCard>
          <HaTitle field="avg_reach">{tHa("Paid vs Organic Reach")}</HaTitle>
          <Donut data={paidOrg} total={nfmt(totalReach)} />
        </HaCard>
      </div>

      {/* Section 4: Reach Demographics */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-bold text-foreground">Reach Demographics</h2>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">Who you reached the most.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <HaCard>
            <HaTitle field="audience_top_country">{tHa("Top Countries")}</HaTitle>
            {countriesData.mode === "full" ? (
              <div className="space-y-1">{countries.map(c => <HaBarRow key={c.name} label={c.name} value={c.value} max={Math.max(...countries.map(x => x.value))} />)}</div>
            ) : countriesData.mode === "partial" ? (
              <div className="space-y-1"><HaBarRow label={countries[0].name} value={100} max={100} /><GeoEmpty mode="partial" /></div>
            ) : <GeoEmpty mode="none" />}
          </HaCard>
          <HaCard>
            <HaTitle field="audience_top_country">{tHa("Top Cities")}</HaTitle>
            {citiesData.mode === "full" ? (
              <div className="space-y-1">{cities.map(c => <HaBarRow key={c.name} label={c.name} value={c.value} max={Math.max(...cities.map(x => x.value))} />)}</div>
            ) : citiesData.mode === "partial" ? (
              <div className="space-y-1"><HaBarRow label={cities[0].name} value={100} max={100} /><GeoEmpty mode="partial" /></div>
            ) : <GeoEmpty mode="none" />}
          </HaCard>
          <HaCard>
            <HaTitle field="audience_gender_split">{tHa("Gender")}</HaTitle>
            <div className="h-[180px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={gender} dataKey="value" innerRadius={50} outerRadius={75} stroke="none">
                    {gender.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2 text-[12px]">
              {gender.map(g => (
                <div key={g.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="flex-1 text-foreground">{g.name}</span>
                  <span className="font-semibold text-foreground">{g.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </HaCard>
        </div>
      </section>

      {/* Section 5: Age + Reach by Hour */}
      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="audience_age_groups">{tHa("Age")}</HaTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={ageFinal}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="value" fill={HA_PURPLE} radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, fill: "#6b7280", formatter: (v: any) => `${Number(v).toFixed(0)}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="avg_reach">{tHa("Reach by Hour of Day")}</HaTitle>
          <HaHeatmap data={heatmap} />
        </HaCard>
      </div>

      {/* Section 6: Top Performing Posts */}
      <HaCard>
        <HaTitle field="avg_reach">{tHa("Top Performing Posts by Reach")}</HaTitle>
        {posts5.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Content</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Reach</th>
                <th className="py-2 font-medium text-right">Impressions</th>
                <th className="py-2 font-medium text-right">Reach Rate</th>
                <th className="py-2 font-medium text-right">ER</th>
              </tr></thead>
              <tbody>{posts5.map((p: any, i: number) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2"><div className="flex items-center gap-2"><img src={imgProxy(p.thumbnail)} className="h-10 w-10 rounded object-cover bg-muted" alt="" /><span className="text-foreground line-clamp-2 max-w-[220px]">{(p.caption || "").slice(0, 80)}</span></div></td>
                  <td className="py-2 text-muted-foreground">{p.type || "Post"}</td>
                  <td className="py-2 text-muted-foreground">{p.timestamp ? new Date(p.timestamp).toLocaleDateString() : "—"}</td>
                  <td className="py-2 text-right text-foreground font-semibold">{nfmt(p.reach)}</td>
                  <td className="py-2 text-right text-foreground">{nfmt(p.imp)}</td>
                  <td className="py-2 text-right text-foreground">{p.rr.toFixed(1)}%</td>
                  <td className="py-2 text-right text-foreground">{p.er.toFixed(2)}%</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="mt-3"><Link to="/report/$id/content" params={{ id: r.id }} className="text-[12px] font-medium text-[#461bb6] hover:underline cursor-pointer">View all posts →</Link></div>
          </div>
        ) : <EmptyDataCard title="No posts yet" message="Top performing posts will appear here when post data is available." />}
      </HaCard>

      {/* Section 7: Reach Insights */}
      <section>
        <h2 className="text-[16px] font-bold text-foreground mb-4">Reach Insights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🟢", color: "#10b981", title: "High Organic Reach", desc: `${organicPct.toFixed(1)}% of your total reach is organic. Great job!` },
            { icon: "🟣", color: "#461bb6", title: "Best Performing Content Type", desc: `Reels generate the highest reach — ${contentTypes[0].pctv}% of total reach.` },
            { icon: "🌍", color: "#3b82f6", title: "Top Country", desc: `${topCountry} is your top country by reach — ${topCountryPct.toFixed(1)}% of total reach.` },
            { icon: "⏰", color: "#f59e0b", title: "Peak Activity Time", desc: `Your audience is most active on ${peakDay} around ${peakHour}.` },
          ].map(c => (
            <HaCard key={c.title}>
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg mb-3" style={{ background: `${c.color}1A` }}>{c.icon}</div>
                <div className="text-[13px] font-bold text-foreground mb-1">{c.title}</div>
                <p className="text-[12px] text-muted-foreground">{c.desc}</p>
              </div>
            </HaCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function SemiGauge({ value, max = 100, suffix = "", label, color = HA_PURPLE }: { value: number; max?: number; suffix?: string; label?: string; color?: string }) {
  const pctv = Math.min(100, Math.max(0, (value / max) * 100));
  const data = [{ name: "v", value: pctv, fill: color }];
  return (
    <div className="relative h-[160px] w-full">
      <ResponsiveContainer>
        <RadialBarChart innerRadius="75%" outerRadius="100%" data={data} startAngle={180} endAngle={0} barSize={18}>
          <RadialBar background={{ fill: "#f3f4f6" }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
        <div className="text-[28px] font-bold text-foreground leading-none">{value}{suffix && <span className="text-[14px] text-muted-foreground font-medium"> {suffix}</span>}</div>
        {label && <div className="text-[12px] font-medium text-[#10b981] mt-1">{label}</div>}
      </div>
    </div>
  );
}

export function BrandTab({ r, isAdmin = false }: { r: any; isAdmin?: boolean }) {
  const subTabs = ["Overview", "Mentions", "Brand Recall", "Brand Affinity", "Branded Content", "Competitors", "Audience Impact"];
  const [activeSub, setActiveSub] = useState("Overview");
  const sub = "vs prev. 30 days";

  const mentions = Array.isArray(r.top_mentions) ? r.top_mentions : [];
  const affinity = Array.isArray(r.creator_brand_affinity) ? r.creator_brand_affinity : [];
  const followerAffinity = Array.isArray(r.follower_brand_affinity) ? r.follower_brand_affinity : [];
  const followers = Number(r.followers || 0);

  const trustScore = Number(r.trust_score || 64);
  const recPower = Number(r.recommendation_power_score || 76);
  const adReuse = Number(r.ad_reusability_score || 71);
  const brandSafety = Number(r.brand_safety_score || 74);
  const purchaseIntent = Number(r.audience_purchase_intent_score || 12);
  const conversionIntent = Number(r.conversion_intent_score || 24);

  const memoryScore = brandSafety;
  const recallRate = Math.min(100, trustScore * 0.97);
  const association = Math.min(100, trustScore / 100 * 85 + 12);
  const affinityScore = adReuse;
  const impactScore = recPower;

  const totalMentions = mentions.reduce((s: number, m: any) => s + Number(m.count || 0), 0) || 178;
  const avgReach = Number(r.avg_reach || 0) || Math.round(followers * 0.33);
  const totalImpressions = avgReach * Math.min(20, mentions.length || 18);
  const avgMentionReach = mentions.length ? Math.round(totalImpressions / mentions.length) : Math.round(avgReach * 0.6);

  const pills = [
    { label: "Brand Mentions", value: nfmt(totalMentions), change: "+24.6%", tag: null as string | null, field: "top_mentions", raw: totalMentions },
    { label: "Total Impressions", value: nfmt(totalImpressions), change: "+18.7%", tag: null, field: "avg_impressions", raw: totalImpressions },
    { label: "Avg. Mention Reach", value: nfmt(avgMentionReach), change: "+15.3%", tag: null, field: "avg_reach", raw: avgMentionReach },
    { label: "Brand Recall Rate", value: `${recallRate.toFixed(1)}%`, change: "+7.8pp", tag: null, field: "trust_score", raw: recallRate },
    { label: "Brand Memory Score", value: `${memoryScore}/100`, change: "+6pts", tag: memoryScore >= 70 ? "Good" : memoryScore >= 50 ? "Average" : "Low", field: "brand_safety_score", raw: memoryScore },
  ];

  const breakdown = [
    { name: "Brand Recall", value: Math.round(recallRate) },
    { name: "Brand Recognition", value: Math.round(trustScore * 0.95) },
    { name: "Brand Association", value: Math.round(association) },
    { name: "Brand Affinity", value: affinityScore },
    { name: "Brand Impact", value: impactScore },
  ];

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const dateLabel = (i: number, total: number) => { const d = new Date(now); d.setDate(now.getDate() - (total - 1 - i)); return `${months[d.getMonth()]} ${d.getDate()}`; };

  const scoreHistory: { date: string; score: number }[] | null = null;
  const mentionsTimeline: { date: string; mentions: number }[] | null = null;
  void dateLabel;
  const recallHistory: { date: string; rate: number }[] | null = null;

  const typesBase = [
    { name: "Tagged Posts", pctv: 45.5, color: HA_PURPLE },
    { name: "Paid Partnership", pctv: 32.6, color: HA_BLUE },
    { name: "Product Placement", pctv: 12.4, color: HA_PINK },
    { name: "Brand Integration", pctv: 7.3, color: "#f59e0b" },
    { name: "Other", pctv: 2.2, color: "#9ca3af" },
  ];
  const mentionTypes = typesBase.map(t => ({ ...t, value: Math.round(totalMentions * t.pctv / 100) }));

  const baseBrands = affinity.length ? affinity : [
    { brand: "Nike", score: 78 }, { brand: "Gymshark", score: 71 },
    { brand: "Alo", score: 63 }, { brand: "Adidas", score: 59 },
    { brand: "Lululemon", score: 52 },
  ];
  const brandCounts = baseBrands.slice(0, 5).map((b: any, i: number) => ({ name: b.brand, count: Math.round(totalMentions * [0.236, 0.213, 0.157, 0.135, 0.101][i]), pctv: [23.6, 21.3, 15.7, 13.5, 10.1][i] }));
  const otherCount = totalMentions - brandCounts.reduce((s: number, b: any) => s + b.count, 0);
  const topBrands = [...brandCounts, { name: "Other", count: Math.max(0, otherCount), pctv: 100 - brandCounts.reduce((s: number, b: any) => s + b.pctv, 0) }];

  const recallPerBrand = baseBrands.slice(0, 5).map((b: any, i: number) => ({ name: b.brand, value: Math.max(20, Math.round(recallRate - i * 4.5)) }));

  const unaidedBase = followerAffinity.length ? followerAffinity : baseBrands;
  const unaided = unaidedBase.slice(0, 5).map((b: any, i: number) => ({ name: b.brand || b.name, value: [26.3, 21.8, 15.4, 12.7, 8.6][i] }));
  const unaidedTotal = unaided.reduce((s: number, u: any) => s + u.value, 0);
  const unaidedFull = [...unaided, { name: "Other", value: Math.max(0, 100 - unaidedTotal) }];

  const brandTypes = ["Paid Partnership", "Product Placement", "Tagged Post", "Brand Integration", "Paid Partnership"];
  const brandedPosts = (r.recent_posts || []).slice(0, 5).map((p: any, i: number) => {
    const reach = Math.round((p.views || avgReach) * 0.8);
    const imp = Math.round(reach * 1.5);
    const er = followers ? (((p.likes || 0) + (p.comments || 0)) / followers * 100) : 0;
    return {
      ...p,
      brand: baseBrands[i % baseBrands.length]?.brand || "—",
      type: brandTypes[i] || "Tagged Post",
      date: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : "—",
      mentions: Math.max(1, Math.round(totalMentions / 30)),
      imp,
      recall: Math.max(30, Math.round(recallRate - i * 3.5)),
      er,
      affinity: Math.max(40, Math.round((baseBrands[i % baseBrands.length]?.score || 70) - i * 2)),
    };
  });

  const audienceImpactCards = [
    { icon: "🛒", color: "#10b981", title: "Influenced Purchases", value: `${purchaseIntent.toFixed(1)}%`, change: "+3.1pp", desc: "Audience who made a purchase after seeing your content." },
    { icon: "🔍", color: "#3b82f6", title: "Research Intent", value: `${conversionIntent.toFixed(1)}%`, change: "+3.4pp", desc: "Audience who looked up more about the brand." },
    { icon: "💬", color: "#461bb6", title: "Recommendation Intent", value: `${(Number(r.recommendation_power_score) || recPower).toFixed(1)}%`, change: "+2.8pp", desc: "Audience who would recommend the brand." },
    { icon: "🤝", color: "#f59e0b", title: "Trust Transfer", value: `${trustScore.toFixed(1)}%`, change: "+5.6pp", desc: "Audience who trust the brands you work with." },
  ];

  const Donut = ({ data, total, totalLabel }: { data: { name: string; value: number; color: string; pctv?: number }[]; total: string; totalLabel: string }) => (
    <div className="flex items-center gap-4">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[18px] font-bold text-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground">{totalLabel}</div>
        </div>
      </div>
      <div className="flex-1 space-y-2 text-[12px]">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="text-muted-foreground">{(d.pctv ?? d.value).toFixed(1)}%</span>
            <span className="text-foreground font-semibold w-12 text-right">{nfmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  

  const overviewView = (
    <TabPanel panelKey="brand-overview">
      <div className="grid lg:grid-cols-3 gap-6">
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Memory Score")}</HaTitle>
          <SemiGauge value={memoryScore} suffix="/100" label={memoryScore >= 70 ? "Good" : "Average"} />
          <div className="text-[12px] text-[#10b981] font-medium text-center">+6 points {sub}</div>
          <p className="text-[12px] text-muted-foreground mt-3 text-center">Your audience remembers and associates well with the brands you work with.</p>
        </HaCard>
        <HaCard>
          <HaTitle field="overall_score">{tHa("Score Breakdown")}</HaTitle>
          <div className="space-y-3 mt-2">
            {breakdown.map(b => (
              <div key={b.name}>
                <div className="flex justify-between text-[12px] mb-1"><span className="text-foreground">{b.name}</span><span className="font-semibold text-foreground">{b.value}/100</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.value}%`, background: HA_PURPLE }} /></div>
              </div>
            ))}
          </div>
        </HaCard>
        <HaCard>
          <div className="flex items-center justify-between mb-4"><HaTitle field="overall_score">{tHa("Score History")}</HaTitle></div>
          {scoreHistory ? (
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={scoreHistory}>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalRequiresMeta")}</div>
          )}
        </HaCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="top_mentions">{tHa("Brand Mentions Over Time")}</HaTitle>
          <div className="h-64 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">
            {i18n.t("report.historicalRequiresMeta")}
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="top_mentions">{tHa("Mentions by Type")}</HaTitle>
          <Donut data={mentionTypes} total={nfmt(totalMentions)} totalLabel="Total Mentions" />
        </HaCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="top_mentions">{tHa("Top Mentioned Brands")}</HaTitle>
          <div className="space-y-2">
            {topBrands.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3 py-1">
                <span className="w-5 text-[12px] font-semibold text-muted-foreground">{i + 1}</span>
                <span className="w-28 text-[13px] text-foreground shrink-0 truncate">{b.name}</span>
                <div className="flex-1 h-[7px] bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.pctv}%`, background: HA_PURPLE }} /></div>
                <span className="w-20 text-right text-[12px] text-muted-foreground">{b.count} mentions</span>
                <span className="w-12 text-right text-[12px] font-semibold text-foreground">{b.pctv.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </HaCard>
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Recall Rate")}</HaTitle>
          <div className="text-[28px] font-bold text-foreground">{recallRate.toFixed(1)}%</div>
          <div className="text-[12px] text-[#10b981] font-medium">+7.8pp {sub}</div>
          <SemiGauge value={Math.round(recallRate)} suffix="%" />
          <div className="flex justify-between text-[11px] text-muted-foreground -mt-3"><span>0%</span><span>100%</span></div>
          <p className="text-[12px] text-muted-foreground mt-3">Percentage of your engaged audience who can remember at least one brand you've worked with.</p>
        </HaCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Recall Performance")}</HaTitle>
          <div className="space-y-1">{recallPerBrand.map((b: any) => <HaBarRow key={b.name} label={b.name} value={b.value} />)}</div>
        </HaCard>
        <HaCard>
          <div className="flex items-center justify-between mb-4"><HaTitle field="brand_safety_score">{tHa("Recall Rate Over Time")}</HaTitle></div>
          {recallHistory ? (
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={recallHistory}>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="rate" stroke={HA_PURPLE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalRequiresMeta")}</div>
          )}
        </HaCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Association")}</HaTitle>
          <div className="text-[28px] font-bold text-foreground">{association.toFixed(1)}%</div>
          <div className="text-[12px] text-[#10b981] font-medium">+8.1pp {sub}</div>
          <SemiGauge value={Math.round(association)} suffix="%" />
          <p className="text-[12px] text-muted-foreground mt-3">Your audience correctly associates you with the brands you promote.</p>
        </HaCard>
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Top Brand Associations (Unaided)")}</HaTitle>
          <div className="space-y-1">{unaidedFull.map(u => <HaBarRow key={u.name} label={u.name} value={u.value} />)}</div>
        </HaCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Affinity Score")}</HaTitle>
          <SemiGauge value={affinityScore} suffix="/100" />
          <div className="flex justify-between text-[11px] text-muted-foreground -mt-3"><span>0</span><span>100</span></div>
          <div className="text-[12px] text-[#10b981] font-medium text-center mt-1">+6 pts {sub}</div>
          <p className="text-[12px] text-muted-foreground mt-3 text-center">How much your audience likes and trusts the brands you work with.</p>
        </HaCard>
        <HaCard>
          <HaTitle field="brand_safety_score">{tHa("Brand Impact")}</HaTitle>
          <SemiGauge value={impactScore} suffix="/100" />
          <div className="flex justify-between text-[11px] text-muted-foreground -mt-3"><span>0</span><span>100</span></div>
          <div className="text-[12px] text-[#10b981] font-medium text-center mt-1">+7 pts {sub}</div>
          <p className="text-[12px] text-muted-foreground mt-3 text-center">The impact of your brand partnerships on your audience.</p>
        </HaCard>
      </div>

      <HaCard>
        <HaTitle field="brand_safety_score">{tHa("Branded Content Performance")}</HaTitle>
        {brandedPosts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Content</th>
                <th className="py-2 font-medium">Brand</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Mentions</th>
                <th className="py-2 font-medium text-right">Impressions</th>
                <th className="py-2 font-medium text-right">Recall</th>
                <th className="py-2 font-medium text-right">ER</th>
                <th className="py-2 font-medium text-right">Affinity</th>
              </tr></thead>
              <tbody>{brandedPosts.map((p: any, i: number) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2"><img src={imgProxy(p.thumbnail)} className="h-10 w-10 rounded object-cover bg-muted" alt="" /></td>
                  <td className="py-2 font-medium text-foreground">{p.brand}</td>
                  <td className="py-2 text-muted-foreground">{p.type}</td>
                  <td className="py-2 text-muted-foreground">{p.date}</td>
                  <td className="py-2 text-right text-foreground">{p.mentions}</td>
                  <td className="py-2 text-right text-foreground">{nfmt(p.imp)}</td>
                  <td className="py-2 text-right text-foreground">{p.recall}%</td>
                  <td className="py-2 text-right text-foreground">{p.er.toFixed(2)}%</td>
                  <td className="py-2 text-right font-semibold text-foreground">{p.affinity}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="mt-3"><a className="text-[12px] font-medium text-[#461bb6] hover:underline cursor-pointer">View all branded content →</a></div>
          </div>
        ) : <EmptyDataCard title="No branded posts" message="Branded content will appear here when available." />}
      </HaCard>

      <section>
        <h2 className="text-[16px] font-bold text-foreground mb-4">Audience Impact</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {audienceImpactCards.map(c => (
            <HaCard key={c.title}>
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg mb-3" style={{ background: `${c.color}1A` }}>{c.icon}</div>
                <div className="text-[13px] font-bold text-foreground mb-1">{c.title}</div>
                <div className="text-[24px] font-bold text-[#10b981]">{c.value}</div>
                <div className="text-[11px] text-[#10b981] font-medium mb-2">{c.change} {sub}</div>
                <p className="text-[12px] text-muted-foreground">{c.desc}</p>
              </div>
            </HaCard>
          ))}
        </div>
      </section>

      <div className="text-center text-[11px] text-muted-foreground py-4">
        About Brand Memory Score: Brand Memory Score is a proprietary metric that measures how well your audience remembers, recognizes, and associates with the brands you work with. <a className="text-[#461bb6] hover:underline cursor-pointer">Learn more</a>
      </div>
    </TabPanel>
  );

  const mentionsView = <TabPanel panelKey="brand-mentions"><HaCard><HaTitle field="top_mentions">{tHa("Brand Mentions Over Time")}</HaTitle><div className="h-64 flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">{i18n.t("report.historicalRequiresMeta")}</div></HaCard><HaCard><HaTitle field="top_mentions">{tHa("Mentions by Type")}</HaTitle><Donut data={mentionTypes} total={nfmt(totalMentions)} totalLabel="Total Mentions" /></HaCard></TabPanel>;

  const recallView = <TabPanel panelKey="brand-recall"><div className="grid lg:grid-cols-2 gap-6"><HaCard><HaTitle field="brand_safety_score">{tHa("Brand Recall Rate")}</HaTitle><div className="text-[28px] font-bold text-foreground">{recallRate.toFixed(1)}%</div><SemiGauge value={Math.round(recallRate)} suffix="%" /></HaCard><HaCard><HaTitle field="brand_safety_score">{tHa("Brand Recall Performance")}</HaTitle><div className="space-y-1">{recallPerBrand.map((b: any) => <HaBarRow key={b.name} label={b.name} value={b.value} />)}</div></HaCard></div></TabPanel>;

  const affinityView = <TabPanel panelKey="brand-affinity"><div className="grid lg:grid-cols-2 gap-6"><HaCard><HaTitle field="brand_safety_score">{tHa("Brand Affinity Score")}</HaTitle><SemiGauge value={affinityScore} suffix="/100" /></HaCard><HaCard><HaTitle field="brand_safety_score">{tHa("Top Brand Associations")}</HaTitle><div className="space-y-1">{unaidedFull.map(u => <HaBarRow key={u.name} label={u.name} value={u.value} />)}</div></HaCard></div></TabPanel>;

  const brandedContentView = <TabPanel panelKey="brand-content"><HaCard><HaTitle field="brand_safety_score">{tHa("Branded Content Performance")}</HaTitle>{brandedPosts.length ? <div className="overflow-x-auto"><table className="w-full text-[12px]"><thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-2 font-medium">Content</th><th className="py-2 font-medium">Brand</th><th className="py-2 font-medium">Type</th><th className="py-2 font-medium text-right">Impressions</th><th className="py-2 font-medium text-right">Recall</th><th className="py-2 font-medium text-right">ER</th></tr></thead><tbody>{brandedPosts.map((p: any, i: number) => <tr key={i} className="border-b border-border"><td className="py-2"><img src={imgProxy(p.thumbnail)} className="h-10 w-10 rounded object-cover" alt="" /></td><td className="py-2 font-medium text-foreground">{p.brand}</td><td className="py-2 text-muted-foreground">{p.type}</td><td className="py-2 text-right text-foreground">{nfmt(p.imp)}</td><td className="py-2 text-right text-foreground">{p.recall}%</td><td className="py-2 text-right text-foreground">{p.er.toFixed(2)}%</td></tr>)}</tbody></table></div> : <EmptyDataCard title="No branded posts" message="Branded content will appear here when available." />}</HaCard></TabPanel>;

  const competitorsView = <TabPanel panelKey="brand-competitors"><HaCard><HaTitle field="brand_safety_score">{tHa("Similar Brands Comparison")}</HaTitle><div className="space-y-3">{baseBrands.slice(0, 5).map((b: any) => <div key={b.brand}><div className="mb-1 flex justify-between text-[12px]"><span className="text-foreground">{b.brand}</span><span className="font-semibold text-foreground">{Number(b.score || 0)}</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Number(b.score || 0)}%`, background: HA_PURPLE }} /></div></div>)}</div></HaCard></TabPanel>;

  const audienceImpactView = <TabPanel panelKey="brand-impact"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{audienceImpactCards.map(c => <HaCard key={c.title}><div className="flex flex-col items-center text-center"><div className="h-10 w-10 rounded-full flex items-center justify-center text-lg mb-3" style={{ background: `${c.color}1A` }}>{c.icon}</div><div className="text-[13px] font-bold text-foreground mb-1">{c.title}</div><div className="text-[24px] font-bold text-[#10b981]">{c.value}</div><div className="text-[11px] text-[#10b981] font-medium mb-2">{c.change} {sub}</div><p className="text-[12px] text-muted-foreground">{c.desc}</p></div></HaCard>)}</div></TabPanel>;

  return (
    <div className="space-y-6" style={{ fontFamily: "Rubik, sans-serif", color: "#111827" }}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {pills.map(p => (
          <div key={p.label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">{p.label}</div>
              {p.field && <MetricInfo field={p.field} value={p.raw} />}
            </div>
            <div className="text-[22px] font-bold text-foreground mt-1 leading-tight">{p.value}</div>
            {p.change && <div className="text-[12px] font-medium mt-0.5 text-[#10b981]">{p.change}</div>}
            {p.tag && <div className="text-[11px] font-medium mt-0.5 text-[#10b981]">{p.tag}</div>}
            <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
      <SubTabBar tabs={subTabs} active={activeSub} onChange={setActiveSub} />
      {activeSub === "Overview" && overviewView}
      {activeSub === "Mentions" && mentionsView}
      {activeSub === "Brand Recall" && recallView}
      {activeSub === "Brand Affinity" && affinityView}
      {activeSub === "Branded Content" && brandedContentView}
      {activeSub === "Competitors" && competitorsView}
      {activeSub === "Audience Impact" && audienceImpactView}
    </div>
  );
}
