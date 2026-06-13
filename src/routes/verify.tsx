import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  validateSearch: (s: Record<string, unknown>) => ({ email: (s.email as string) || "" }),
});

function VerifyPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const { email: initialEmail } = useSearch({ from: "/verify" });
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length < 6) { toast.error(t("verify.enterCode")); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "signup",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("verify.success"));
    if (typeof window !== "undefined") sessionStorage.setItem("show_welcome", "true");
    navigate({ to: "/dashboard" });
  }

  async function resend() {
    if (!email) { toast.error(t("verify.emailRequired")); return; }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success(t("verify.resent"));
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm glass-card rounded-xl p-8 shadow-lg">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <h1 className="text-2xl font-bold text-center">{t("verify.title")}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2 mb-6">{t("verify.description")}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            required type="email" placeholder={t("signup.emailPh")}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            required inputMode="numeric" maxLength={6}
            placeholder={t("verify.codePh")}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center tracking-[0.5em] text-lg"
          />
          <Button type="submit" disabled={loading} className="w-full bg-[#461bb6] hover:bg-[#3a16a0] text-white h-11">
            {loading ? "..." : t("verify.submit")}
          </Button>
        </form>
        <div className="text-center mt-4 space-y-2">
          <button type="button" onClick={resend} disabled={resending}
            className="text-sm text-[#461bb6] hover:underline disabled:opacity-60">
            {resending ? "..." : t("verify.resend")}
          </button>
          <div className="text-sm text-muted-foreground">
            <Link to="/login" className="text-[#461bb6] hover:underline">{t("forgot.backToLogin")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
