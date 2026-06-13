import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";

export function WelcomeModal() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);

  // "full" = first-time welcome, "greeting" = returning-user greeting
  const [mode, setMode] = useState<"full" | "greeting">("full");

  useEffect(() => {
    try {
      const shouldShow = sessionStorage.getItem("show_welcome") === "true";
      if (!shouldShow) return;

      const hasSeenWelcome = localStorage.getItem("boom_welcome_seen") === "true";
      if (!hasSeenWelcome) {
        // First-time user → show full welcome always
        setMode("full");
        setOpen(true);
        localStorage.setItem("boom_welcome_seen", "true");
      } else {
        // Returning user → show brief interactive greeting
        setMode("greeting");
        setOpen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(5);
    const countdown = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(countdown);
          setOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [open]);

  if (!open) return null;

  const isFull = mode === "full";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[6px]">
      <div
        className="w-full max-w-[440px] bg-card rounded-2xl p-8 shadow-2xl mx-4 text-center"
        dir={rtl ? "rtl" : "ltr"}
      >
        <div className="mb-5 flex justify-center">
          <Logo size="lg" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">
          {isFull ? t("welcome.title") : t("welcome.backTitle")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {isFull ? t("welcome.description") : t("welcome.backDescription")}
        </p>
        <button
          onClick={() => setOpen(false)}
          className="w-full py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#461bb6" }}
        >
          {isFull ? t("welcome.startNow") : t("welcome.letsGo")}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          {t("welcome.closingIn", { n: secondsLeft })}
        </p>
      </div>
    </div>
  );
}
