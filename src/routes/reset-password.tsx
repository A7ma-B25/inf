import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait for Supabase to process the recovery token from the URL hash
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error(t("reset.tooShort")); return; }
    if (password !== confirm) { toast.error(t("reset.mismatch")); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("reset.success"));
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm glass-card rounded-xl p-8 shadow-lg">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <h1 className="text-2xl font-bold text-center">{t("reset.title")}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2 mb-6">{t("reset.description")}</p>
        {!ready ? (
          <p className="text-sm text-center text-muted-foreground">{t("reset.waiting")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <PasswordInput required minLength={6} placeholder={t("reset.newPh")}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordInput required minLength={6} placeholder={t("reset.confirmPh")}
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full bg-[#461bb6] hover:bg-[#3a16a0] text-white h-11">
              {loading ? "..." : t("reset.submit")}
            </Button>
            <div className="text-center pt-2">
              <Link to="/login" className="text-sm text-[#461bb6] hover:underline">
                {t("forgot.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
