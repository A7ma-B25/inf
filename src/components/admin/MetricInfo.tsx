import { Info, Database, Sparkles, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getFieldMeta, reliabilityLabel, reliabilityColor } from "@/lib/data-sources";
import { createContext, useContext } from "react";

const AdminCtx = createContext<boolean>(false);
export function AdminProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
export function useIsAdmin() {
  return useContext(AdminCtx);
}

function isDistribution(v: any): v is Record<string, number> {
  return !!v && typeof v === "object" && !Array.isArray(v)
    && Object.values(v).every((x) => typeof x === "number");
}

function DistributionBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <div className="w-20 shrink-0 text-[11px] text-foreground truncate" title={k}>{k}</div>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(v / max) * 100}%`,
                background: "linear-gradient(90deg,#7c3aed,#a78bfa)",
              }}
            />
          </div>
          <div className="w-10 text-right text-[11px] font-bold tabular-nums text-foreground">
            {v.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricInfo({ field, value }: { field: string; value?: any }) {
  const admin = useIsAdmin();
  if (!admin) return null;
  const meta = getFieldMeta(field);
  if (!meta) return null;

  const dist = isDistribution(value) ? value : null;
  const relColor = reliabilityColor(meta.reliability);
  const sourceIsAi = /AI|Gemini|Lovable/i.test(meta.source);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`How is ${meta.label} computed?`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full text-white bg-gradient-to-br from-[#7c3aed] to-[#461bb6] hover:scale-110 hover:shadow-lg hover:shadow-[#7c3aed]/30 transition-all duration-200 ring-1 ring-white/20"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[380px] p-0 overflow-hidden border-2 border-[#7c3aed]/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#7c3aed] to-[#461bb6] px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {sourceIsAi ? <Sparkles className="h-4 w-4 shrink-0" /> : <Database className="h-4 w-4 shrink-0" />}
              <div className="min-w-0">
                <div className="text-[13px] font-bold truncate">{meta.label}</div>
                <code className="text-[10px] opacity-80 font-mono">{meta.field}</code>
              </div>
            </div>
            <div
              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              {meta.reliability}/5 · {reliabilityLabel(meta.reliability)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 text-[12px] bg-background max-h-[420px] overflow-y-auto">
          {/* Value */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
              القيمة المستخرجة
            </div>
            {dist ? (
              <DistributionBars data={dist} />
            ) : (
              <div className="text-[13px] font-bold text-foreground break-all bg-muted/50 rounded-md px-2.5 py-1.5">
                {value === undefined || value === null || value === ""
                  ? "—"
                  : typeof value === "object"
                    ? JSON.stringify(value).slice(0, 200)
                    : String(value)}
              </div>
            )}
          </div>

          {/* Formula */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              المعادلة
            </div>
            <div className="text-foreground leading-relaxed">{meta.formula}</div>
          </div>

          {/* Source */}
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            {sourceIsAi
              ? <Sparkles className="h-3.5 w-3.5 text-[#7c3aed] mt-0.5 shrink-0" />
              : <Database className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />}
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                المصدر
              </div>
              <div className="text-foreground text-[11.5px]">{meta.source}</div>
            </div>
          </div>

          {/* Reliability bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                مستوى الموثوقية
              </span>
              <span className="text-[11px] font-bold" style={{ color: relColor }}>
                {reliabilityLabel(meta.reliability)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(meta.reliability / 5) * 100}%`, background: relColor }}
              />
            </div>
          </div>

          {/* Note */}
          {meta.note && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                {meta.note}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
