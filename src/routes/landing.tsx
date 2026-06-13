import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isAuthed } from "@/lib/auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import { PasswordInput } from "@/components/PasswordInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const JOB_TITLES = [
  "مدير التسويق (Marketing Manager)",
  "رئيس قسم التسويق (CMO / Head of Marketing)",
  "مدير تسويق المؤثرين (Influencer Marketing Manager)",
  "أخصائي تسويق المؤثرين (Influencer Marketing Specialist)",
  "مدير العلاقات مع المؤثرين (Influencer Relations Manager)",
  "مدير التسويق الرقمي (Digital Marketing Manager)",
  "مدير وسائل التواصل الاجتماعي (Social Media Manager)",
  "مدير محتوى (Content Manager)",
  "مدير الحملات (Campaigns Manager)",
  "مدير العلامة التجارية (Brand Manager)",
  "مدير الشراكات (Partnerships Manager)",
  "مدير العلاقات العامة (PR Manager)",
  "مدير النمو (Growth Manager)",
  "مدير الأداء (Performance Marketing Manager)",
  "مؤسس / رئيس تنفيذي (Founder / CEO)",
  "مدير وكالة (Agency Owner / Director)",
];
const OTHER_VALUE = "__other__";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

const BLOCKED_DOMAINS = [
  "gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","live.com",
  "msn.com","aol.com","mail.com","protonmail.com","yandex.com","googlemail.com",
  "me.com","mac.com",
];

function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ first_name: "", last_name: "", company_email: "", phone: "", job_title: "", password: "", password_confirm: "" });
  const [jobChoice, setJobChoice] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  function validateEmail(email: string) {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return t("signup.invalidEmail");
    const domain = e.split("@")[1];
    if (BLOCKED_DOMAINS.includes(domain)) return t("signup.workEmail");
    return "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(form.company_email);
    setEmailError(err);
    if (err) return;
    if (!form.first_name || !form.last_name || !form.phone || !form.job_title || form.password.length < 6) {
      toast.error(t("signup.fillAll"));
      return;
    }
    if (form.password !== form.password_confirm) {
      toast.error(t("signup.passwordMismatch"));
      return;
    }
    setLoading(true);
    const email = form.company_email.trim().toLowerCase();
    const { error: leadErr } = await supabase.from("leads").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      company_email: email,
      phone: form.phone.trim(),
      job_title: form.job_title.trim(),
    });
    if (leadErr) { setLoading(false); toast.error(t("landing.saveError")); return; }
    const { error: authErr } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: { first_name: form.first_name, last_name: form.last_name, phone: form.phone, job_title: form.job_title },
      },
    });
    setLoading(false);
    if (authErr) { toast.error(authErr.message); return; }
    toast.success(t("verify.sentToast"));
    navigate({ to: "/verify", search: { email } as any });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-10 relative">
      <div className="absolute top-4 end-4"><LanguageToggle /></div>
      <div className="w-full max-w-[480px]">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <h1 className="text-[28px] font-bold text-center text-foreground leading-snug">
          {t("landing.heading")}
        </h1>
        <p className="text-muted-foreground text-center mt-3 mb-8">
          {t("landing.description")}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input required placeholder={t("landing.firstNamePh")} value={form.first_name} onChange={set("first_name")} />
            <Input required placeholder={t("landing.lastNamePh")} value={form.last_name} onChange={set("last_name")} />
          </div>
          <div>
            <Input
              required type="email" placeholder={t("landing.emailPh")}
              value={form.company_email}
              onChange={(e) => { set("company_email")(e); if (emailError) setEmailError(""); }}
              onBlur={() => setEmailError(validateEmail(form.company_email))}
              className={emailError ? "border-red-500" : ""}
            />
            {emailError && <p className="text-red-600 text-sm mt-1">{emailError}</p>}
          </div>
          <CountryPhoneInput
            required
            placeholder={t("landing.phonePh")}
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          />
          <Select
            value={jobChoice}
            onValueChange={(v) => {
              setJobChoice(v);
              if (v === OTHER_VALUE) {
                setForm((f) => ({ ...f, job_title: "" }));
              } else {
                setForm((f) => ({ ...f, job_title: v }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("landing.jobTitlePh")} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {JOB_TITLES.map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
              <SelectItem value={OTHER_VALUE}>أخرى (Other)</SelectItem>
            </SelectContent>
          </Select>
          {jobChoice === OTHER_VALUE && (
            <Input
              required
              placeholder={t("landing.jobTitlePh")}
              value={form.job_title}
              onChange={set("job_title")}
            />
          )}
          <PasswordInput
            required
            placeholder={t("signup.passwordPh")}
            value={form.password}
            onChange={set("password")}
            minLength={6}
          />
          <PasswordInput
            required
            placeholder={t("signup.passwordConfirmPh")}
            value={form.password_confirm}
            onChange={set("password_confirm")}
            minLength={6}
          />
          <Button type="submit" disabled={loading} className="w-full bg-[#461bb6] hover:bg-[#3a16a0] text-white h-11 mt-2">
            {loading ? "..." : t("landing.submit")}
          </Button>
        </form>
        <div className="text-center mt-5 text-sm text-muted-foreground">
          {t("landing.haveAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t("landing.signInLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
