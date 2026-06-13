import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("ar") ? "ar" : "en";
  const next = current === "ar" ? "en" : "ar";
  const label = current === "ar" ? "EN" : "عربي";
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label="Toggle language"
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-muted text-foreground/80 min-h-[36px]",
        className
      )}
    >
      <Languages className="h-3.5 w-3.5" />
      <span suppressHydrationWarning>{label}</span>
    </button>
  );
}
