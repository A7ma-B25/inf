import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Megaphone, Plus, X, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/campaigns")({ component: CampaignsPage });

const HA_PURPLE = "#461bb6";
const GOALS = ["Brand Awareness", "Product Launch", "Sales", "Engagement", "Content Creation"];
const PLATFORMS = ["Instagram", "TikTok", "Both"];
const STATUSES = ["planning", "active", "paused", "completed"];

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  status: string;
  goal: string | null;
  platform: string | null;
  notes: string | null;
  created_at: string;
};

export function statusBadge(s: string) {
  switch (s) {
    case "active": return "bg-green-100 text-green-700";
    case "completed": return "bg-blue-100 text-blue-700";
    case "paused": return "bg-orange-100 text-orange-700";
    default: return "bg-gray-200 text-foreground";
  }
}

function CampaignsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async (): Promise<Campaign[]> => {
      const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      return (data as any) || [];
    },
  });

  const { data: ciCounts = {} } = useQuery({
    queryKey: ["campaign-influencer-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data } = await supabase.from("campaign_influencers").select("campaign_id");
      const m: Record<string, number> = {};
      (data || []).forEach((r: any) => { m[r.campaign_id] = (m[r.campaign_id] || 0) + 1; });
      return m;
    },
  });

  const totalCampaigns = campaigns.length;
  const activeCount = campaigns.filter(c => c.status === "active").length;
  const totalBudget = campaigns.reduce((s, c) => s + Number(c.budget || 0), 0);
  const avgScore = campaigns.length ? Math.round(campaigns.reduce((s, c) => {
    const status = c.status === "completed" ? 90 : c.status === "active" ? 75 : c.status === "paused" ? 50 : 40;
    return s + status;
  }, 0) / campaigns.length) : 0;

  const stats = [
    { label: "Total Campaigns", value: String(totalCampaigns) },
    { label: "Active", value: String(activeCount) },
    { label: "Total Budget", value: `$${totalBudget.toLocaleString()}` },
    { label: "Avg Campaign Score", value: `${avgScore}/100` },
  ];

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    qc.setQueryData<Campaign[]>(["campaigns"], (old) => (old || []).filter(x => x.id !== c.id));
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) { toast.error("Failed to delete"); qc.invalidateQueries({ queryKey: ["campaigns"] }); }
    else toast.success("Campaign deleted");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" style={{ fontFamily: "Rubik, sans-serif" }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("campaigns.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("campaigns.title")}</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0] transition-colors">
          <Plus className="h-4 w-4" /> {t("campaigns.create")}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className="text-[20px] font-bold text-foreground mt-1 leading-tight truncate">{s.value}</div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-[#f3e8ff] flex items-center justify-center mb-4">
            <Megaphone className="h-7 w-7 text-[#461bb6]" />
          </div>
          <div className="text-base font-semibold text-foreground">No campaigns yet</div>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Plan and track your influencer campaigns</p>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:bg-[#3a16a0]">
            <Plus className="h-4 w-4" /> Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const count = ciCounts[c.id] || 0;
            const start = c.start_date ? new Date(c.start_date) : null;
            const end = c.end_date ? new Date(c.end_date) : null;
            let progress = 0;
            if (start && end) {
              const total = end.getTime() - start.getTime();
              const elapsed = Date.now() - start.getTime();
              progress = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
            }
            return (
              <div key={c.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground text-lg">{c.name}</h3>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", statusBadge(c.status))}>{c.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {c.goal && <span>🎯 {c.goal}</span>}
                      {c.platform && <span>📱 {c.platform}</span>}
                      {start && end && <span>📅 {start.toLocaleDateString()} – {end.toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Budget</div>
                    <div className="text-lg font-bold text-foreground">${Number(c.budget || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{count} influencer{count === 1 ? "" : "s"}</div>
                  </div>
                </div>

                {start && end && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#461bb6] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{progress.toFixed(0)}% elapsed</div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                  <Link to="/campaigns/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#461bb6] text-white text-xs font-medium hover:bg-[#3a16a0]">
                    <Eye className="h-3 w-3" /> View
                  </Link>
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-[#e5e7eb]">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => remove(c)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <CampaignModal editing={editing} onClose={() => setModalOpen(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setModalOpen(false); }} />}
    </div>
  );
}

function CampaignModal({ editing, onClose, onSaved }: { editing: Campaign | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    description: editing?.description || "",
    goal: editing?.goal || GOALS[0],
    platform: editing?.platform || PLATFORMS[0],
    start_date: editing?.start_date || "",
    end_date: editing?.end_date || "",
    budget: editing?.budget?.toString() || "",
    status: editing?.status || "planning",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Campaign name required"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      description: form.description || null,
      goal: form.goal,
      platform: form.platform,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: Number(form.budget || 0),
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from("campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("campaigns").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Campaign updated" : "Campaign created");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-foreground">{editing ? "Edit Campaign" : "New Campaign"}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Campaign Name *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm" placeholder="Summer Drop 2026" />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Goal">
              <select value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm bg-card">
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm bg-card">
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm" />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm" />
            </Field>
            <Field label="Budget ($)">
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm" placeholder="10000" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm bg-card capitalize">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium bg-[#461bb6] text-white hover:bg-[#3a16a0] disabled:opacity-60">
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
