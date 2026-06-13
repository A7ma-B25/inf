import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Plus, Check, X, Loader2, Sparkles, KeyRound, Users, FileText, Database, Shield, Activity, Settings as SettingsIcon, Wrench, ExternalLink, RefreshCw } from "lucide-react";
import { PROVIDERS, getProvider, maskKey, type ProviderId } from "@/lib/ai-providers";
import { testProviderConnection } from "@/lib/ai-providers.functions";
import { cn } from "@/lib/utils";
import { getRole, resetAnalysisCount, getAnalysisCount, getAnalysisLimit, adminResetUserCount, adminSetUserLimit, adminSetFullAccess, refreshUserUsage } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

const TAB_ITEMS = [
  { id: "overview", label: "نظرة عامة", icon: SettingsIcon },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "reports", label: "التقارير", icon: FileText },
  { id: "ai", label: "مزودي AI", icon: Sparkles },
  { id: "tools", label: "الأدوات والمفاتيح", icon: Wrench },
  { id: "permissions", label: "الصلاحيات", icon: Shield },
  { id: "activity", label: "النشاط", icon: Activity },
  { id: "storage", label: "التخزين", icon: Database },
] as const;

function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [apifyKey, setApifyKey] = useState("");
  const [gemKey, setGemKey] = useState("");
  const [showApify, setShowApify] = useState(false);
  const [showGem, setShowGem] = useState(false);
  const [newTool, setNewTool] = useState({ actor_id: "", label: "", platform: "instagram" });
  const [addOpen, setAddOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      return data as any;
    },
  });
  const { data: tools = [] } = useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data } = await supabase.from("apify_tools").select("*").order("created_at");
      return data || [];
    },
  });
  const { data: providers = [] } = useQuery({
    queryKey: ["ai_providers"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_providers" as any).select("*").order("created_at");
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (settings) { setApifyKey(settings.apify_api_key || ""); setGemKey(settings.gemini_api_key || ""); }
  }, [settings]);

  const saveKeys = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      const { error } = await supabase.from("settings").update({ apify_api_key: apifyKey, gemini_api_key: gemKey, updated_at: new Date().toISOString() }).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("API keys saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addTool = useMutation({
    mutationFn: async () => {
      if (!newTool.actor_id || !newTool.label) throw new Error("Fill all fields");
      const { error } = await supabase.from("apify_tools").insert(newTool);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tool added"); setNewTool({ actor_id: "", label: "", platform: "instagram" }); qc.invalidateQueries({ queryKey: ["tools"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleTool = async (id: string, val: boolean) => {
    await supabase.from("apify_tools").update({ is_enabled: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tools"] });
  };
  const delTool = async (id: string) => {
    await supabase.from("apify_tools").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tools"] });
    toast.success("Tool removed");
  };

  const setActiveProvider = async (id: string) => {
    if (!settings) return;
    // mark all is_active=false, then mark this one true, and store on settings
    await supabase.from("ai_providers" as any).update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("ai_providers" as any).update({ is_active: true }).eq("id", id);
    await supabase.from("settings").update({ active_ai_provider_id: id, updated_at: new Date().toISOString() } as any).eq("id", settings.id);
    qc.invalidateQueries({ queryKey: ["ai_providers"] });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Active provider updated");
  };

  const toggleProviderEnabled = async (id: string, val: boolean) => {
    await supabase.from("ai_providers" as any).update({ is_enabled: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai_providers"] });
  };

  const delProvider = async (id: string) => {
    await supabase.from("ai_providers" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai_providers"] });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Provider removed");
  };

  const activeProvider = providers.find(p => p.id === settings?.active_ai_provider_id) || providers.find(p => p.is_active);
  const activeMeta = activeProvider ? getProvider(activeProvider.provider) : null;

  const role = typeof window !== "undefined" ? getRole() : null;
  const [resetTick, setResetTick] = useState(0);

  if (role === "user") {
    return <UserSettings />;
  }


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        {activeProvider && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-sm">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">المزود النشط:</span>
            <span className="font-medium text-foreground">{activeMeta?.name || activeProvider.provider}</span>
            <span className="text-[#461bb6] font-mono text-xs">{activeProvider.model}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 data-[state=active]:bg-card data-[state=active]:text-[#461bb6]">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">معلومات الحساب</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Team</div>
                <div className="mt-1 text-sm font-medium text-foreground">{settings?.team_name || "Boom Teams"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Version</div>
                <div className="mt-1 text-sm font-medium text-foreground">v1.0.0</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Boom Stats · Influencer Intelligence Platform
            </p>
          </section>

          <section className="bg-card border border-border rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">عداد التحليلات الخاص بك</h2>
            <p className="text-sm text-muted-foreground">العدد الحالي: <span className="font-mono font-semibold">{getAnalysisCount()}</span> / {getAnalysisLimit()}</p>
            <button
              onClick={async () => {
                await resetAnalysisCount();
                await refreshUserUsage();
                setResetTick(t => t + 1);
                toast.success("تم تصفير عداد التحليلات");
              }}
              className="px-4 py-2 rounded-md bg-[#461bb6] text-white font-medium hover:bg-[#3a16a0]"
            >
              إعادة تعيين العدّاد
            </button>
          </section>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="mt-0">
          <AdminUserManagement />
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-0">
          <AdminReports />
        </TabsContent>

        {/* AI PROVIDERS */}
        <TabsContent value="ai" className="space-y-6 mt-0">
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#461bb6]" /> AI Providers</h2>
                <p className="text-sm text-muted-foreground mt-0.5">إدارة نماذج الذكاء الاصطناعي للتحليل</p>
              </div>
              <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90">
                <Plus className="h-4 w-4" /> إضافة مزود
              </button>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                لا توجد مزودات بعد. أضف واحداً لتشغيل التحليلات.
              </div>
            ) : (
              <div className="space-y-2">
                {providers.map(p => {
                  const meta = getProvider(p.provider);
                  const isActive = settings?.active_ai_provider_id === p.id;
                  return (
                    <div key={p.id} className={cn(
                      "flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                      isActive ? "border-[#461bb6] ring-1 ring-[#dad1f0]" : "border-border hover:border-[#dad1f0]"
                    )}>
                      <div className="h-10 w-10 rounded-md flex items-center justify-center text-lg" style={{ background: `${meta?.color}1a`, color: meta?.color }}>
                        {meta?.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground truncate">{p.name}</div>
                          {isActive && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46] text-xs font-medium"><Check className="h-3 w-3" /> Active</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{meta?.name} · <span className="font-mono">{p.model}</span> · {maskKey(p.api_key)}</div>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={!!p.is_enabled} onChange={e => toggleProviderEnabled(p.id, e.target.checked)} className="sr-only peer" />
                        <div className="relative w-10 h-5 bg-muted peer-checked:bg-[#461bb6] rounded-full transition-colors">
                          <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-card rounded-full transition-transform peer-checked:translate-x-5" />
                        </div>
                      </label>
                      {!isActive && (
                        <button onClick={() => setActiveProvider(p.id)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 hover:border-[#461bb6] hover:text-[#461bb6] transition-colors font-medium">
                          تعيين كنشط
                        </button>
                      )}
                      <button onClick={() => delProvider(p.id)} className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

        {/* TOOLS & KEYS */}
        <TabsContent value="tools" className="space-y-6 mt-0">
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#461bb6]" /> مفاتيح API</h2>
              <p className="text-sm text-muted-foreground mt-0.5">مفتاح Apify للاستخراج، ومفتاح Gemini الاحتياطي.</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Apify API Key</label>
              <div className="flex gap-2">
                <input type={showApify ? "text" : "password"} value={apifyKey} onChange={e => setApifyKey(e.target.value)} className="flex-1 px-3 py-2 rounded-md border border-input bg-background" />
                <button onClick={() => setShowApify(s => !s)} className="px-3 py-2 rounded-md border border-input">
                  {showApify ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Gemini API Key</label>
              <div className="flex gap-2">
                <input type={showGem ? "text" : "password"} value={gemKey} onChange={e => setGemKey(e.target.value)} className="flex-1 px-3 py-2 rounded-md border border-input bg-background" />
                <button onClick={() => setShowGem(s => !s)} className="px-3 py-2 rounded-md border border-input">
                  {showGem ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button onClick={() => saveKeys.mutate()} disabled={saveKeys.isPending} className="px-4 py-2 rounded-md bg-[#461bb6] text-white font-medium hover:opacity-90 disabled:opacity-60">
              {saveKeys.isPending ? "جارٍ الحفظ…" : "حفظ المفاتيح"}
            </button>
          </section>

          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">أدوات Apify</h2>
            <div className="space-y-2">
              {tools.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.actor_id} · {t.platform}</div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={!!t.is_enabled} onChange={e => toggleTool(t.id, e.target.checked)} className="sr-only peer" />
                    <div className="relative w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors">
                      <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-card rounded-full transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                  <button onClick={() => delTool(t.id)} className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-semibold">إضافة أداة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input placeholder="actor_id" value={newTool.actor_id} onChange={e => setNewTool({...newTool, actor_id: e.target.value})} className="px-3 py-2 rounded-md border border-input bg-background text-sm md:col-span-2" />
                <input placeholder="Label" value={newTool.label} onChange={e => setNewTool({...newTool, label: e.target.value})} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
                <select value={newTool.platform} onChange={e => setNewTool({...newTool, platform: e.target.value})} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <button onClick={() => addTool.mutate()} className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90">
                <Plus className="h-3 w-3" /> إضافة الأداة
              </button>
            </div>
          </section>
        </TabsContent>

        {/* PERMISSIONS */}
        <TabsContent value="permissions" className="mt-0">
          <AdminPermissions />
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-0">
          <AdminLoginLeads />
        </TabsContent>

        {/* STORAGE */}
        <TabsContent value="storage" className="mt-0">
          <AdminStorage />
        </TabsContent>
      </Tabs>

      {addOpen && <AddProviderModal onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ["ai_providers"] }); }} />}
    </div>
  );
}


// ============================================================
// Add Provider Modal — 3 steps: provider → model → key
// ============================================================
function AddProviderModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [name, setName] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const testFn = useServerFn(testProviderConnection);

  const meta = provider ? getProvider(provider) : null;

  const pickProvider = (id: ProviderId) => {
    setProvider(id);
    const m = getProvider(id);
    setModel(m?.models[0]?.id || "");
    setStep(2);
  };

  const runTest = async () => {
    if (!provider || !model || !apiKey) return;
    setTesting(true); setTestResult(null);
    try {
      const r = await testFn({ data: { provider, model, api_key: apiKey } });
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || "Failed" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!provider || !model || !apiKey) return toast.error("Fill all fields");
    setSaving(true);
    try {
      const { error } = await supabase.from("ai_providers" as any).insert({
        provider,
        model,
        api_key: apiKey,
        name: name.trim() || `My ${meta?.name} Key`,
        is_enabled: true,
        is_active: false,
      });
      if (error) throw error;
      toast.success("Provider added");
      onAdded();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header + step indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold">Add AI Provider</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 pt-4 flex items-center gap-2">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                step >= s ? "bg-[#461bb6] text-white" : "bg-muted text-muted-foreground"
              )}>{s}</div>
              {s < 3 && <div className={cn("flex-1 h-0.5 mx-2", step > s ? "bg-[#461bb6]" : "bg-[#e5e7eb]")} />}
            </div>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <div className="text-sm font-medium text-foreground">Select Provider</div>
                <p className="text-xs text-muted-foreground mt-0.5">Choose which AI service to use</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => pickProvider(p.id)} className="border border-border rounded-lg p-4 text-center hover:border-[#461bb6] hover:bg-[#faf5ff] transition-colors">
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="font-medium text-sm mt-1.5">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && meta && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.emoji}</span>
                <div>
                  <div className="text-sm font-medium">Select Model — {meta.name}</div>
                  <p className="text-xs text-muted-foreground">Pick a model from the catalog</p>
                </div>
              </div>
              <div className="space-y-2">
                {meta.models.map(m => (
                  <label key={m.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    model === m.id ? "border-[#461bb6] bg-[#faf5ff]" : "border-border hover:border-[#dad1f0]"
                  )}>
                    <input type="radio" name="model" checked={model === m.id} onChange={() => setModel(m.id)} className="accent-[#461bb6]" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm">{m.label}</div>
                      {m.tag && <div className="text-xs text-muted-foreground">{m.tag}</div>}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
                <button onClick={() => setStep(3)} disabled={!model} className="px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">Next →</button>
              </div>
            </>
          )}

          {step === 3 && meta && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.emoji}</span>
                <div>
                  <div className="text-sm font-medium">Enter API Key — {meta.name}</div>
                  <p className="text-xs text-muted-foreground">Stored securely in your backend</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">{meta.name} API Key</label>
                <div className="flex gap-2">
                  <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => { setApiKey(e.target.value); setTestResult(null); }} placeholder={meta.id === "anthropic" ? "sk-ant-…" : meta.id === "openai" ? "sk-…" : "…"} className="flex-1 px-3 py-2 rounded-md border border-input bg-background font-mono text-sm" />
                  <button onClick={() => setShowKey(s => !s)} className="px-3 rounded-md border border-input hover:bg-accent">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={runTest} disabled={!apiKey || testing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40 disabled:opacity-50">
                  {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Test Connection
                </button>
                {testResult && (
                  testResult.ok
                    ? <span className="inline-flex items-center gap-1 text-sm text-[#065f46]"><Check className="h-4 w-4" /> Valid</span>
                    : <span className="inline-flex items-center gap-1 text-sm text-[#991b1b]" title={testResult.error}><X className="h-4 w-4" /> Invalid</span>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Custom name <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={`My ${meta.name} Key`} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
                <button onClick={save} disabled={saving || !apiKey} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Provider
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// User Settings — profile info only (read/edit), no API keys
// ============================================================
function UserSettings() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<{
    first_name: string; last_name: string; email: string;
    phone?: string; job_title?: string; created_at?: string;
  }>({ first_name: "", last_name: "", email: "" });
  const [editing, setEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState("");
  const [draftLast, setDraftLast] = useState("");

  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const email = user.email || "";
    const [{ data: prof }, { data: lead }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, email, created_at").eq("id", user.id).maybeSingle(),
      supabase.from("leads").select("phone, job_title").eq("company_email", email).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const meta = (user.user_metadata || {}) as any;
    const merged = {
      first_name: prof?.first_name || meta.first_name || "",
      last_name: prof?.last_name || meta.last_name || "",
      email: prof?.email || email,
      phone: (lead as any)?.phone || meta.phone || "",
      job_title: (lead as any)?.job_title || meta.job_title || "",
      created_at: prof?.created_at || user.created_at,
    };
    setProfile(merged);
    setDraftFirst(merged.first_name);
    setDraftLast(merged.last_name);
    try {
      const existing = JSON.parse(localStorage.getItem("boom_user") || "null") || {};
      localStorage.setItem("boom_user", JSON.stringify({ ...existing, ...merged }));
    } catch {}
  };

  useEffect(() => { loadProfile(); }, []);

  const saveNames = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ first_name: draftFirst.trim(), last_name: draftLast.trim() }).eq("id", user.id);
    if (error) return toast.error(error.message);
    await supabase.auth.updateUser({ data: { first_name: draftFirst.trim(), last_name: draftLast.trim() } });
    setProfile(p => ({ ...p, first_name: draftFirst.trim(), last_name: draftLast.trim() }));
    setEditing(false);
    toast.success(t("common.saved") || "تم الحفظ");
  };

  const changePassword = async () => {
    if (!oldPw || newPw.length < 6) return toast.error("كلمة المرور الجديدة 6 أحرف على الأقل");
    if (newPw !== newPw2) return toast.error("كلمتا المرور غير متطابقتين");
    setPwSaving(true);
    // verify old password
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: oldPw });
    if (signErr) { setPwSaving(false); return toast.error("كلمة المرور القديمة غير صحيحة"); }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (updErr) return toast.error(updErr.message);
    toast.success("تم تحديث كلمة المرور");
    setOldPw(""); setNewPw(""); setNewPw2(""); setPwOpen(false);
  };

  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "U";
  const joined = profile.created_at ? new Date(profile.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">معلومات حسابك الشخصي</p>
      </div>

      <section className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#461bb6] text-white flex items-center justify-center text-xl font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold">{profile.first_name} {profile.last_name}</div>
            <div className="text-sm text-muted-foreground">{profile.email}</div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted/40">
              تعديل الاسم
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">الاسم الأول</label>
            {editing ? (
              <input value={draftFirst} onChange={e => setDraftFirst(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#d2dbea] bg-background text-sm" />
            ) : (
              <div className="mt-1 text-sm font-medium">{profile.first_name || "—"}</div>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">اسم العائلة</label>
            {editing ? (
              <input value={draftLast} onChange={e => setDraftLast(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#d2dbea] bg-background text-sm" />
            ) : (
              <div className="mt-1 text-sm font-medium">{profile.last_name || "—"}</div>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">البريد الإلكتروني</label>
            <div className="mt-1 text-sm font-medium">{profile.email || "—"}</div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">رقم الهاتف</label>
            <div className="mt-1 text-sm font-medium" dir="ltr">{profile.phone || "—"}</div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">المسمى الوظيفي</label>
            <div className="mt-1 text-sm font-medium">{profile.job_title || "—"}</div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">تاريخ التسجيل</label>
            <div className="mt-1 text-sm font-medium">{joined}</div>
          </div>
        </div>

        {editing && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={saveNames} className="px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90">
              حفظ التغييرات
            </button>
            <button onClick={() => { setEditing(false); setDraftFirst(profile.first_name); setDraftLast(profile.last_name); }}
              className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted/40">
              إلغاء
            </button>
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">كلمة المرور</h2>
            <p className="text-sm text-muted-foreground">قم بتغيير كلمة المرور بعد إدخال كلمة المرور القديمة للتأكيد.</p>
          </div>
          {!pwOpen && (
            <button onClick={() => setPwOpen(true)} className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted/40">
              تغيير كلمة المرور
            </button>
          )}
        </div>
        {pwOpen && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">كلمة المرور القديمة</label>
              <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#d2dbea] bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">كلمة المرور الجديدة</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={6}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#d2dbea] bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">تأكيد كلمة المرور الجديدة</label>
              <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} minLength={6}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#d2dbea] bg-background text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={changePassword} disabled={pwSaving}
                className="px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {pwSaving ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
              </button>
              <button onClick={() => { setPwOpen(false); setOldPw(""); setNewPw(""); setNewPw2(""); }}
                className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted/40">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

// ============================================================
// Admin — User Management (manage registered users from signup)
// ============================================================
type ManagedUser = {
  first_name: string; last_name: string; email: string;
  role: "admin" | "user"; active: boolean; created_at?: string;
};

type DbProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  analysis_count: number;
  analysis_limit: number;
  report_ids: string[] | null;
  created_at: string;
  full_access?: boolean | null;
};

function AdminUserManagement() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, analysis_count, analysis_limit, report_ids, created_at, full_access")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DbProfile[];
    },
  });

  const renew = async (u: DbProfile) => {
    await adminResetUserCount(u.id);
    toast.success(`تم تجديد محاولات ${u.email}`);
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  const setLimit = async (u: DbProfile) => {
    const raw = prompt(`الحدّ الأقصى للتحليلات لـ ${u.email}`, String(u.analysis_limit ?? 2));
    if (raw == null) return;
    const n = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isFinite(n)) return toast.error("رقم غير صالح");
    await adminSetUserLimit(u.id, n);
    toast.success(`تم تحديث الحدّ إلى ${n}`);
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  const toggleFullAccess = async (u: DbProfile) => {
    const next = !u.full_access;
    await adminSetFullAccess(u.id, next);
    toast.success(next ? `تم منح ${u.email} صلاحيات الوصول الكامل` : `تم سحب الصلاحيات الكاملة من ${u.email}`);
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">إدارة المستخدمين</h2>
        <p className="text-sm text-muted-foreground mt-0.5">عدد الحسابات: {users.length}</p>
      </div>
      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">جاري التحميل…</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون.</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const count = u.analysis_count ?? 0;
            const limit = u.analysis_limit ?? 2;
            const reports = (u.report_ids?.length ?? 0);
            const exhausted = count >= limit;
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="h-10 w-10 rounded-full bg-[#eef2ff] text-[#461bb6] flex items-center justify-center text-sm font-semibold">
                  {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-foreground truncate">{u.first_name || ""} {u.last_name || ""}</div>
                    {exhausted && <span className="px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#991b1b] text-xs font-medium">انتهت المحاولات</span>}
                    {u.full_access && <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium">صلاحيات كاملة</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    التحليلات: <span className="font-mono">{count}/{limit}</span> · التقارير: <span className="font-mono">{reports}</span>
                  </div>
                </div>
                <button onClick={() => renew(u)} className="text-xs px-3 py-1.5 rounded-md bg-[#461bb6] text-white font-medium hover:bg-[#3a16a0]">
                  تجديد المحاولات
                </button>
                <button onClick={() => setLimit(u)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/40 font-medium">
                  ضبط الحدّ
                </button>
                <button
                  onClick={() => toggleFullAccess(u)}
                  title="يمنح هذا المستخدم صلاحية مشاهدة جميع الأقسام والأقسام المخفية"
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-md font-medium border",
                    u.full_access
                      ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a] hover:bg-[#fde68a]"
                      : "bg-card text-foreground border-border hover:bg-muted/40"
                  )}
                >
                  {u.full_access ? "إلغاء الصلاحيات الكاملة" : "منح صلاحيات كاملة"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Admin — Permissions matrix (feature toggles per role)
// ============================================================
const PERMISSION_FEATURES: { key: string; label: string }[] = [
  { key: "analyze", label: "تحليل المؤثرين" },
  { key: "reports", label: "عرض التقارير" },
  { key: "export_pdf", label: "تصدير PDF" },
  { key: "export_excel", label: "تصدير Excel" },
  { key: "campaigns", label: "إدارة الحملات" },
  { key: "tracking", label: "تتبع المؤثرين" },
  { key: "compare", label: "مقارنة المؤثرين" },
  { key: "top_lists", label: "قوائم التوب" },
];

type PermMap = Record<string, boolean>;
const DEFAULT_PERMS: PermMap = {
  analyze: true, reports: true, export_pdf: true, export_excel: true,
  campaigns: false, tracking: true, compare: true, top_lists: true,
};

function AdminPermissions() {
  const [perms, setPerms] = useState<PermMap>(DEFAULT_PERMS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("boom_user_permissions");
      if (raw) setPerms({ ...DEFAULT_PERMS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const save = (next: PermMap) => {
    setPerms(next);
    localStorage.setItem("boom_user_permissions", JSON.stringify(next));
  };

  const toggle = (k: string) => save({ ...perms, [k]: !perms[k] });

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">الصلاحيات (للمستخدمين العاديين)</h2>
        <p className="text-sm text-muted-foreground mt-0.5">حدّد المزايا المتاحة لحسابات المستخدم العادي.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSION_FEATURES.map(f => (
          <label key={f.key} className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:border-[#dad1f0]">
            <span className="text-sm font-medium">{f.label}</span>
            <span className="inline-flex items-center">
              <input type="checkbox" checked={!!perms[f.key]} onChange={() => toggle(f.key)} className="sr-only peer" />
              <span className="relative w-10 h-5 bg-muted peer-checked:bg-[#461bb6] rounded-full transition-colors block">
                <span className="absolute top-0.5 left-0.5 h-4 w-4 bg-card rounded-full transition-transform peer-checked:translate-x-5" />
              </span>
            </span>
          </label>
        ))}
      </div>
      <button onClick={() => save(DEFAULT_PERMS)} className="text-xs text-muted-foreground hover:text-foreground underline">
        إعادة الضبط إلى الافتراضي
      </button>
    </section>
  );
}

// ============================================================
// Admin — Login Leads (all sign-in events, downloadable as CSV)
// ============================================================
type LoginEvent = {
  email: string; role: "admin" | "user"; at: string;
  first_name?: string; last_name?: string; source?: string;
};

function AdminLoginLeads() {
  const [events, setEvents] = useState<LoginEvent[]>([]);

  const reload = () => {
    try { setEvents(JSON.parse(localStorage.getItem("boom_login_events") || "[]")); }
    catch { setEvents([]); }
  };
  useEffect(() => { reload(); }, []);

  const clearAll = () => {
    if (!confirm("مسح كل سجلات تسجيل الدخول؟")) return;
    localStorage.removeItem("boom_login_events");
    setEvents([]);
    toast.success("تم المسح");
  };

  const downloadCSV = () => {
    const headers = ["email", "first_name", "last_name", "role", "source", "at"];
    const rows = events.map(e => [
      e.email, e.first_name || "", e.last_name || "", e.role, e.source || "login", e.at,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boom-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Unique leads (by email) for summary
  const uniqueEmails = new Set(events.map(e => e.email)).size;

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">سجل الدخول و العملاء المحتملون</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            إجمالي العمليات: {events.length} · عملاء فريدون: {uniqueEmails}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#461bb6] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            تحميل CSV
          </button>
          <button onClick={clearAll} disabled={events.length === 0}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40 disabled:opacity-50">
            مسح
          </button>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد عمليات تسجيل دخول بعد.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-start py-2 px-2">البريد الإلكتروني</th>
                <th className="text-start py-2 px-2">الاسم</th>
                <th className="text-start py-2 px-2">النوع</th>
                <th className="text-start py-2 px-2">المصدر</th>
                <th className="text-start py-2 px-2">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().slice(0, 100).map((e, i) => (
                <tr key={i} className="border-b border-[#f1f5f9] last:border-0">
                  <td className="py-2 px-2 font-medium text-foreground">{e.email}</td>
                  <td className="py-2 px-2">{[e.first_name, e.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="py-2 px-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                      e.role === "admin" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#eef2ff] text-[#461bb6]")}>
                      {e.role === "admin" ? "أدمن" : "مستخدم"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{e.source || "login"}</td>
                  <td className="py-2 px-2 text-muted-foreground">{new Date(e.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length > 100 && (
            <p className="text-xs text-muted-foreground mt-2">عرض آخر 100 — حمّل CSV للحصول على الكل.</p>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Admin — Reports: all influencers analyzed + who analyzed them
// ============================================================
function AdminReports() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"all" | "instagram" | "tiktok">("all");

  const { data: influencers = [], isLoading } = useQuery({
    queryKey: ["admin-influencers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencers")
        .select("id, username, influencer_name, platform, followers, engagement_rate, niche, country, created_at, profile_pic_url")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-for-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name, email, report_ids");
      return (data || []) as any[];
    },
  });

  // Build reportId -> users[] map
  const reportToUsers = useMemo(() => {
    const m = new Map<string, { email: string; name: string }[]>();
    for (const p of profiles) {
      const ids: string[] = p.report_ids || [];
      for (const id of ids) {
        const arr = m.get(id) || [];
        arr.push({ email: p.email || "", name: `${p.first_name || ""} ${p.last_name || ""}`.trim() });
        m.set(id, arr);
      }
    }
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    return influencers.filter((i: any) => {
      if (platform !== "all" && i.platform !== platform) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (i.username || "").toLowerCase().includes(q) ||
             (i.influencer_name || "").toLowerCase().includes(q) ||
             (i.niche || "").toLowerCase().includes(q);
    });
  }, [influencers, search, platform]);

  const deleteReport = async (id: string, label: string) => {
    if (!confirm(`حذف تقرير ${label} نهائياً؟`)) return;
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-influencers"] });
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">التقارير التي تم البحث عنها</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            إجمالي التقارير: {influencers.length} · يظهر آخر 500
          </p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["admin-influencers"] })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="بحث بالاسم أو اليوزرنيم أو النيتش…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
        <select value={platform} onChange={e => setPlatform(e.target.value as any)} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
          <option value="all">كل المنصات</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">جاري التحميل…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد تقارير.</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((i: any) => {
            const users = reportToUsers.get(i.id) || [];
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-[#dad1f0] transition-colors">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-sm font-semibold text-[#461bb6]">
                  {i.profile_pic_url ? (
                    <img src={i.profile_pic_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (i.username?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-foreground truncate">{i.influencer_name || i.username}</div>
                    <span className="text-xs text-muted-foreground">@{i.username}</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium capitalize">{i.platform}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    <span>{(i.followers || 0).toLocaleString()} متابع</span>
                    <span>ER: {Number(i.engagement_rate || 0).toFixed(2)}%</span>
                    {i.niche && <span>· {i.niche}</span>}
                    {i.country && <span>· {i.country}</span>}
                  </div>
                  {users.length > 0 && (
                    <div className="text-[11px] text-[#461bb6] mt-1">
                      بحث عنه: {users.map(u => u.name || u.email).join("، ")}
                    </div>
                  )}
                </div>
                <Link to="/report/$id" params={{ id: i.id }} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted/40 font-medium">
                  <ExternalLink className="h-3 w-3" /> عرض
                </Link>
                <button onClick={() => deleteReport(i.id, i.username)} className="p-1.5 rounded text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Admin — Storage: stats + cleanup actions
// ============================================================
function AdminStorage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-storage-stats"],
    queryFn: async () => {
      const [inf, prof, jobs, leads, tracked, snaps] = await Promise.all([
        supabase.from("influencers").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("analysis_jobs").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("tracked_influencers").select("id", { count: "exact", head: true }),
        supabase.from("tracked_snapshots").select("id", { count: "exact", head: true }),
      ]);
      // failed/old jobs
      const { count: failedJobs } = await supabase
        .from("analysis_jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "error"]);
      // orphan influencers (not referenced in any profiles.report_ids)
      const { data: allProfiles } = await supabase.from("profiles").select("report_ids");
      const referenced = new Set<string>();
      (allProfiles || []).forEach((p: any) => (p.report_ids || []).forEach((id: string) => referenced.add(id)));
      const { data: allInf } = await supabase.from("influencers").select("id");
      const orphans = (allInf || []).filter((i: any) => !referenced.has(i.id)).map((i: any) => i.id);

      return {
        influencers: inf.count ?? 0,
        profiles: prof.count ?? 0,
        jobs: jobs.count ?? 0,
        leads: leads.count ?? 0,
        tracked: tracked.count ?? 0,
        snapshots: snaps.count ?? 0,
        failedJobs: failedJobs ?? 0,
        orphans,
      };
    },
  });

  const cleanFailedJobs = async () => {
    if (!confirm(`حذف ${stats?.failedJobs ?? 0} مهمة فاشلة؟`)) return;
    setBusy("jobs");
    const { error } = await supabase.from("analysis_jobs").delete().in("status", ["failed", "error"]);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("تم حذف المهام الفاشلة");
    qc.invalidateQueries({ queryKey: ["admin-storage-stats"] });
  };

  const cleanOrphans = async () => {
    const ids = stats?.orphans || [];
    if (ids.length === 0) return toast.info("لا توجد تقارير يتيمة");
    if (!confirm(`حذف ${ids.length} تقرير يتيم (غير مرتبط بأي مستخدم)؟`)) return;
    setBusy("orphans");
    const { error } = await supabase.from("influencers").delete().in("id", ids);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`تم حذف ${ids.length} تقرير`);
    qc.invalidateQueries({ queryKey: ["admin-storage-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-influencers"] });
  };

  const cleanOldSnapshots = async () => {
    if (!confirm("حذف لقطات التتبع الأقدم من 90 يوماً؟")) return;
    setBusy("snaps");
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("tracked_snapshots").delete().lt("created_at", cutoff);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("تم تنظيف اللقطات القديمة");
    qc.invalidateQueries({ queryKey: ["admin-storage-stats"] });
  };

  const cards: { key: string; label: string; value: number | string; hint?: string }[] = stats ? [
    { key: "inf", label: "التقارير (Influencers)", value: stats.influencers },
    { key: "prof", label: "المستخدمون", value: stats.profiles },
    { key: "jobs", label: "مهام التحليل", value: stats.jobs, hint: `${stats.failedJobs} فاشلة` },
    { key: "leads", label: "Leads", value: stats.leads },
    { key: "tracked", label: "مؤثرون متتبَّعون", value: stats.tracked },
    { key: "snaps", label: "لقطات تتبع", value: stats.snapshots },
  ] : [];

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="h-5 w-5 text-[#461bb6]" /> إحصائيات التخزين</h2>
          <p className="text-sm text-muted-foreground mt-0.5">نظرة على حجم البيانات في قاعدة البيانات.</p>
        </div>
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">جاري التحميل…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cards.map(c => (
              <div key={c.key} className="rounded-lg border border-border p-4 bg-background">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold text-foreground mt-1">{c.value.toLocaleString()}</div>
                {c.hint && <div className="text-[11px] text-amber-600 mt-1">{c.hint}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">تحسين التخزين</h2>
          <p className="text-sm text-muted-foreground mt-0.5">إجراءات تنظيف لتقليل حجم قاعدة البيانات.</p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">حذف مهام التحليل الفاشلة</div>
              <div className="text-xs text-muted-foreground">{stats?.failedJobs ?? 0} مهمة بحالة failed/error</div>
            </div>
            <button onClick={cleanFailedJobs} disabled={busy === "jobs" || !stats?.failedJobs}
              className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {busy === "jobs" ? "…" : "تنظيف"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">حذف التقارير اليتيمة</div>
              <div className="text-xs text-muted-foreground">{stats?.orphans.length ?? 0} تقرير غير مرتبط بأي مستخدم</div>
            </div>
            <button onClick={cleanOrphans} disabled={busy === "orphans" || !stats?.orphans.length}
              className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {busy === "orphans" ? "…" : "تنظيف"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-background">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">حذف لقطات التتبع القديمة</div>
              <div className="text-xs text-muted-foreground">لقطات أقدم من 90 يوماً</div>
            </div>
            <button onClick={cleanOldSnapshots} disabled={busy === "snaps"}
              className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {busy === "snaps" ? "…" : "تنظيف"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
          ⚠️ عمليات الحذف نهائية ولا يمكن التراجع عنها.
        </div>
      </section>
    </div>
  );
}
