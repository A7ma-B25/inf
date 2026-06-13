import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Link2, RefreshCw, Trash2, Loader2 } from "lucide-react";

function shortToken(len = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function uniqueToken(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const t = shortToken();
    const { data } = await supabase.from("influencers").select("id").eq("share_token", t).maybeSingle();
    if (!data) return t;
  }
  // Extremely unlikely; fall back to 10 chars
  return shortToken(10);
}


export function ShareReportModal({
  open,
  onOpenChange,
  influencer,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  influencer: any;
  onUpdated: (patch: { is_public: boolean; share_token: string | null; shared_at?: string | null }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isPublic = !!influencer?.is_public;
  const token = influencer?.share_token as string | null;
  const shareUrl = token ? `https://boom-spark-stats.lovable.app/share/${token}` : "";

  const update = async (patch: any) => {
    const { data, error } = await supabase.from("influencers").update(patch).eq("id", influencer.id).select("is_public, share_token, shared_at").maybeSingle();
    if (error) throw error;
    return data;
  };

  const handleToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const newToken = token || (await uniqueToken());
        const d = await update({ is_public: true, share_token: newToken, shared_at: new Date().toISOString() });
        onUpdated(d as any);
        toast.success("Public link enabled");
      } else {
        const d = await update({ is_public: false });
        onUpdated(d as any);
        toast.success("Public link disabled");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const newToken = await uniqueToken();
      const d = await update({ share_token: newToken, is_public: true, shared_at: new Date().toISOString() });
      onUpdated(d as any);
      toast.success("New link generated");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share Report</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
          <div>
            <div className="text-sm font-medium text-foreground">Enable Public Link</div>
            <div className="text-xs text-muted-foreground">Anyone with the link can view this report</div>
          </div>
          <Switch
            checked={isPublic}
            disabled={busy}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-[#461bb6]"
          />
        </div>

        {isPublic && token && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Shareable URL</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 rounded-md bg-muted border border-border text-xs font-mono text-foreground"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-white text-sm font-medium hover:opacity-90"
                  style={{ background: "#461bb6" }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleRegenerate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Regenerate Link
              </button>
              <button
                onClick={() => handleToggle(false)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#ef4444] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Disable Link
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
          <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Anyone with this link can view this report without logging in.
        </p>
      </DialogContent>
    </Dialog>
  );
}
