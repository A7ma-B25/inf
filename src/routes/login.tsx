import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { isAuthed, getRole, syncSessionToLocal } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PasswordInput } from "@/components/PasswordInput";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (err) {
      setLoading(false);
      if (err.message.toLowerCase().includes("email not confirmed") || err.message.toLowerCase().includes("not confirmed")) {
        toast.error(t("verify.description"));
        navigate({ to: "/verify", search: { email: cleanEmail } as any });
        return;
      }
      setError(t("login.invalid"));
      return;
    }
    const meta = (data.user?.user_metadata || {}) as { first_name?: string; last_name?: string };
    await syncSessionToLocal(data.user?.email, meta, data.user?.id);
    if (typeof window !== "undefined") sessionStorage.setItem("show_welcome", "true");
    const role = getRole();
    if (role === "admin") navigate({ to: "/dashboard" });
    else navigate({ to: "/analyze" });
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm glass-card rounded-xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground mt-3">{t("login.title")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1.5">{t("login.emailLabel")}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">{t("login.passwordLabel")}</label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? t("common.signingIn") : t("login.submit")}
          </button>
        </form>
        <div className="text-center mt-3">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            {t("signup.forgot")}
          </Link>
        </div>
        <div className="text-center mt-4 text-sm text-muted-foreground">
          {t("signup.haveAccount") === "Already have an account?" ? "New here?" : "حساب جديد؟"}{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            {t("common.signUp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
