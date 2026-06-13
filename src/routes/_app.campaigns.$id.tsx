import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Plus, X, Trash2, Search, Download, FileText, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nfmt, pct, platformBadgeClass, imgProxy } from "@/lib/format";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { statusBadge } from "./_app.campaigns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_app/campaigns/$id")({ component: CampaignDetailPage });

const HA_PURPLE = "#461bb6";
const CI_STATUSES = ["pending", "confirmed", "in_progress", "delivered", "paid"];
const CONTENT_TYPES = ["Post", "Reel", "Story", "Video", "Carousel", "Live"];

function ciStatusBadge(s: string) {
  switch (s) {
    case "confirmed": return "bg-blue-100 text-blue-700";
    case "in_progress": return "bg-yellow-100 text-yellow-700";
    case "delivered": return "bg-green-100 text-green-700";
    case "paid": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-200 text-foreground";
  }
}

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
      return data as any;
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["campaign-influencers", id],
    queryFn: async () => {
      const { data: ci } = await supabase.from("campaign_influencers").select("*").eq("campaign_id", id).order("added_at", { ascending: true });
      if (!ci || ci.length === 0) return [];
      const ids = ci.map((c: any) => c.influencer_id);
      const { data: infs } = await supabase.from("influencers").select("*").in("id", ids);
      const byId = new Map((infs || []).map((i: any) => [i.id, i]));
      return ci.map((c: any) => ({ ...c, influencer: byId.get(c.influencer_id) }));
    },
  });

  useEffect(() => {
    if (campaign && !notesLoaded) {
      setNotes(campaign.notes || "");
      setNotesLoaded(true);
    }
  }, [campaign, notesLoaded]);

  const saveNotes = async () => {
    if (!campaign) return;
    if (notes === (campaign.notes || "")) return;
    const { error } = await supabase.from("campaigns").update({ notes }).eq("id", id);
    if (error) toast.error("Failed to save notes");
    else { toast.success("Notes saved"); qc.invalidateQueries({ queryKey: ["campaign", id] }); }
  };

  // Aggregates
  const totalReach = rows.reduce((s: number, r: any) => s + (r.influencer?.avg_reach || 0), 0);
  const avgER = rows.length ? rows.reduce((s: number, r: any) => s + Number(r.influencer?.engagement_rate || 0), 0) / rows.length : 0;
  const totalCost = rows.reduce((s: number, r: any) => s + (r.agreed_price || 0), 0);
  const estImpressions = rows.reduce((s: number, r: any) => s + (r.influencer?.avg_impressions || 0), 0);

  const radarData = useMemo(() => {
    const axes = [
      { key: "ER", get: (i: any) => Math.min(100, Number(i.engagement_rate || 0) * 10) },
      { key: "Quality", get: (i: any) => i.audience_quality_score || 0 },
      { key: "Trust", get: (i: any) => i.trust_score || 0 },
      { key: "Growth", get: (i: any) => Math.min(100, Math.max(0, Number(i.follower_growth_30d || 0) * 5 + 50)) },
      { key: "Brand Safety", get: (i: any) => i.brand_safety_score || 0 },
      { key: "Conversion", get: (i: any) => i.conversion_intent_score || 0 },
    ];
    return axes.map(a => {
      const out: any = { axis: a.key };
      rows.forEach((r: any, idx: number) => { if (r.influencer) out[`inf${idx}`] = a.get(r.influencer); });
      return out;
    });
  }, [rows]);

  const radarColors = ["#461bb6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#06b6d4", "#8b5cf6"];

  // Best value per row (price/score)
  const bestInfluencerIdx = useMemo(() => {
    let bestIdx = -1; let bestVal = -Infinity;
    rows.forEach((r: any, idx: number) => {
      const score = r.influencer?.overall_score || 0;
      const price = r.agreed_price || 1;
      const value = score / price;
      if (value > bestVal && score > 0) { bestVal = value; bestIdx = idx; }
    });
    return bestIdx;
  }, [rows]);

  const removeInfluencer = async (rowId: string) => {
    qc.setQueryData(["campaign-influencers", id], (old: any) => (old || []).filter((r: any) => r.id !== rowId));
    qc.invalidateQueries({ queryKey: ["campaign-influencer-counts"] });
    const { error } = await supabase.from("campaign_influencers").delete().eq("id", rowId);
    if (error) { toast.error("Failed to remove"); qc.invalidateQueries({ queryKey: ["campaign-influencers", id] }); }
    else toast.success("Removed from campaign");
  };

  const updateRow = async (rowId: string, patch: any) => {
    qc.setQueryData(["campaign-influencers", id], (old: any) => (old || []).map((r: any) => r.id === rowId ? { ...r, ...patch } : r));
    const { error } = await supabase.from("campaign_influencers").update(patch).eq("id", rowId);
    if (error) toast.error("Failed to update");
  };

  const exportExcel = () => {
    if (!campaign) return;
    const data = rows.map((r: any) => ({
      Name: r.influencer?.influencer_name || "—",
      Username: r.influencer?.username || "",
      Platform: r.influencer?.platform || "",
      Followers: r.influencer?.followers || 0,
      ER: Number(r.influencer?.engagement_rate || 0),
      "Avg Reach": r.influencer?.avg_reach || 0,
      "Content Type": r.content_type || "",
      "Agreed Price": r.agreed_price || 0,
      Status: r.status,
      Score: r.influencer?.overall_score || 0,
      Notes: r.notes || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Field: "Name", Value: campaign.name },
      { Field: "Goal", Value: campaign.goal },
      { Field: "Platform", Value: campaign.platform },
      { Field: "Start", Value: campaign.start_date },
      { Field: "End", Value: campaign.end_date },
      { Field: "Budget", Value: campaign.budget },
      { Field: "Status", Value: campaign.status },
      { Field: "Total Cost", Value: totalCost },
      { Field: "Total Reach", Value: totalReach },
      { Field: "Avg ER", Value: avgER },
    ]), "Campaign");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Influencers");
    XLSX.writeFile(wb, `${campaign.name.replace(/\s+/g, "_")}_report.xlsx`);
    toast.success("Excel exported");
  };

  const exportPDF = () => {
    if (!campaign) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(campaign.name, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Status: ${campaign.status}`, 14, 28);
    doc.text(`Goal: ${campaign.goal || "—"}  |  Platform: ${campaign.platform || "—"}`, 14, 35);
    doc.text(`Budget: $${Number(campaign.budget || 0).toLocaleString()}  |  Spent: $${totalCost.toLocaleString()}`, 14, 42);
    doc.text(`Dates: ${campaign.start_date || "—"} → ${campaign.end_date || "—"}`, 14, 49);
    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.text("Performance Summary", 14, 62);
    doc.setFontSize(10);
    doc.text(`Total Reach: ${nfmt(totalReach)}`, 14, 70);
    doc.text(`Avg ER: ${pct(avgER)}`, 14, 76);
    doc.text(`Est. Impressions: ${nfmt(estImpressions)}`, 14, 82);
    doc.text(`Total Cost: $${totalCost.toLocaleString()}`, 14, 88);
    doc.setFontSize(13);
    doc.text("Influencers", 14, 102);
    doc.setFontSize(9);
    let y = 110;
    rows.forEach((r: any) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const inf = r.influencer || {};
      doc.text(`${inf.influencer_name || "—"} @${inf.username || ""}  |  ${inf.platform || ""}  |  $${r.agreed_price || 0}  |  ${r.status}  |  Score ${inf.overall_score || 0}`, 14, y);
      y += 6;
    });
    doc.save(`${campaign.name.replace(/\s+/g, "_")}_report.pdf`);
    toast.success("PDF exported");
  };

  if (!campaign) {
    return <div className="text-center py-20 text-muted-foreground">Loading campaign…</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" style={{ fontFamily: "Rubik, sans-serif" }}>
      <Link to="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", statusBadge(campaign.status))}>{campaign.status}</span>
            </div>
            {campaign.description && <p className="text-sm text-muted-foreground mt-2">{campaign.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
              {campaign.goal && <span>🎯 {campaign.goal}</span>}
              {campaign.platform && <span>📱 {campaign.platform}</span>}
              {campaign.start_date && campaign.end_date && <span>📅 {new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}</span>}
              <span>💰 Budget: <strong className="text-foreground">${Number(campaign.budget || 0).toLocaleString()}</strong></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportPDF} className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-[#e5e7eb]">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={() => navigate({ to: "/campaigns" })} className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-[#461bb6] text-white text-xs font-medium hover:bg-[#3a16a0]">
              <Download className="h-3.5 w-3.5" /> Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {(campaign.status === "active" || campaign.status === "completed") && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Reach" value={nfmt(totalReach)} />
          <MetricCard label="Avg ER" value={pct(avgER)} />
          <MetricCard label="Total Cost" value={`$${totalCost.toLocaleString()}`} />
          <MetricCard label="Est. Impressions" value={nfmt(estImpressions)} />
        </div>
      )}

      {/* Influencers Table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Influencers ({rows.length})</h2>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#461bb6] text-white text-xs font-medium hover:bg-[#3a16a0]">
            <Plus className="h-3 w-3" /> Add Influencer
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No influencers yet. Click "Add Influencer" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b border-border text-xs">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Influencer</th>
                  <th className="text-left font-medium px-3 py-3">Platform</th>
                  <th className="text-left font-medium px-3 py-3">Content Type</th>
                  <th className="text-right font-medium px-3 py-3">Agreed Price</th>
                  <th className="text-left font-medium px-3 py-3">Status</th>
                  <th className="text-right font-medium px-3 py-3">Score</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, idx: number) => {
                  const inf = r.influencer || {};
                  return (
                    <tr key={r.id} className="border-b border-border hover:bg-background">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={imgProxy(inf.profile_pic_url) || "https://i.pravatar.cc/40"} className="h-8 w-8 rounded-full object-cover" alt="" />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate flex items-center gap-1">
                              {inf.influencer_name || "—"}
                              {idx === bestInfluencerIdx && <Trophy className="h-3 w-3 text-yellow-500" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">@{inf.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px]", platformBadgeClass(inf.platform))}>{inf.platform || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <select value={r.content_type || ""} onChange={e => updateRow(r.id, { content_type: e.target.value })} className="text-xs px-2 py-1 border border-border rounded bg-card">
                          <option value="">—</option>
                          {CONTENT_TYPES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" value={r.agreed_price || 0} onChange={e => updateRow(r.id, { agreed_price: Number(e.target.value) })} className="w-24 text-xs px-2 py-1 border border-border rounded text-right" />
                      </td>
                      <td className="px-3 py-3">
                        <select value={r.status} onChange={e => updateRow(r.id, { status: e.target.value })} className={cn("text-[10px] px-2 py-1 rounded border-0 font-medium uppercase", ciStatusBadge(r.status))}>
                          {CI_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-foreground">{inf.overall_score || 0}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to="/report/$id" params={{ id: inf.id }} className="px-2 py-1 text-[10px] text-[#461bb6] hover:bg-[#f3e8ff] rounded">View</Link>
                          <button onClick={() => removeInfluencer(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Radar Comparison */}
      {rows.length >= 2 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-semibold text-foreground mb-3">Influencer Comparison</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                {rows.map((r: any, idx: number) => (
                  <Radar key={r.id} name={r.influencer?.influencer_name || `#${idx + 1}`} dataKey={`inf${idx}`} stroke={radarColors[idx % radarColors.length]} fill={radarColors[idx % radarColors.length]} fillOpacity={0.15} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {rows.map((r: any, idx: number) => (
              <div key={r.id} className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: radarColors[idx % radarColors.length] }} />
                <span className="text-foreground">{r.influencer?.influencer_name || `#${idx + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-foreground mb-3">Notes</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={5}
          placeholder="Add campaign notes, strategy, or feedback…"
          className="w-full px-3 py-2 border border-border rounded-md text-sm resize-y"
        />
        <div className="text-[10px] text-muted-foreground mt-1">Auto-saves on blur</div>
      </div>

      {addOpen && <AddInfluencerModal campaignId={id} existingIds={new Set(rows.map((r: any) => r.influencer_id))} onClose={() => setAddOpen(false)} onAdded={() => { qc.invalidateQueries({ queryKey: ["campaign-influencers", id] }); qc.invalidateQueries({ queryKey: ["campaign-influencer-counts"] }); setAddOpen(false); }} />}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[20px] font-bold text-foreground mt-1">{value}</div>
    </div>
  );
}

function AddInfluencerModal({ campaignId, existingIds, onClose, onAdded }: { campaignId: string; existingIds: Set<string>; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [saving, setSaving] = useState(false);

  const { data: influencers = [] } = useQuery({
    queryKey: ["all-influencers-for-campaign"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers").select("id, influencer_name, username, profile_pic_url, platform, followers, overall_score").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => influencers.filter((i: any) => {
    if (existingIds.has(i.id)) return false;
    if (search && !`${i.influencer_name} ${i.username}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [influencers, search, existingIds]);

  const add = async () => {
    if (!selectedId) { toast.error("Select an influencer"); return; }
    setSaving(true);
    const { error } = await supabase.from("campaign_influencers").insert({
      campaign_id: campaignId,
      influencer_id: selectedId,
      agreed_price: Number(price || 0),
      content_type: contentType,
      status: "pending",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Influencer added");
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-foreground">Add Influencer to Campaign</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search influencers…" className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No influencers found. <Link to="/analyze" className="text-[#461bb6]">Analyze one</Link>.</div>
          ) : filtered.map((i: any) => (
            <button key={i.id} onClick={() => setSelectedId(i.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors", selectedId === i.id ? "bg-[#f3e8ff] ring-1 ring-[#461bb6]" : "hover:bg-muted/40")}>
              <img src={imgProxy(i.profile_pic_url) || "https://i.pravatar.cc/40"} className="h-9 w-9 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{i.influencer_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">@{i.username} · {nfmt(i.followers)} followers</div>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-[10px]", platformBadgeClass(i.platform))}>{i.platform}</span>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border grid grid-cols-2 gap-3">
          <label>
            <div className="text-[11px] font-medium text-muted-foreground mb-1">Content Type</div>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-sm bg-card">
              {CONTENT_TYPES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <div className="text-[11px] font-medium text-muted-foreground mb-1">Agreed Price ($)</div>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-sm" placeholder="500" />
          </label>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
          <button onClick={add} disabled={saving || !selectedId} className="px-4 py-2 rounded-md text-sm font-medium bg-[#461bb6] text-white hover:bg-[#3a16a0] disabled:opacity-60">
            {saving ? "Adding…" : "Add to Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
