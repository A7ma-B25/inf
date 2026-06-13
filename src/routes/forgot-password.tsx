import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm glass-card rounded-xl p-8 shadow-lg">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <h1 className="text-2xl font-bold text-center">{t("forgot.title")}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2 mb-6">
          {t("forgot.description")}
        </p>
        {sent ? (
          <div className="text-center">
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
              {t("forgot.sent")}
            </div>
            <Link to="/login" className="inline-block mt-4 text-sm text-[#461bb6] hover:underline">
              {t("forgot.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Input required type="email" placeholder={t("forgot.emailPh")} value={email} onChange={e => setEmail(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full bg-[#461bb6] hover:bg-[#3a16a0] text-white h-11">
              {loading ? "..." : t("forgot.submit")}
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
