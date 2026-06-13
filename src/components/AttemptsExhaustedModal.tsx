import { X, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "966115030382";

export function AttemptsExhaustedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  if (!open) return null;

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("attempts.waMessage"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(rtl ? "سيتم التواصل معك قريباً" : "We'll be in touch soon");
  };

  const items = [t("attempts.item1"), t("attempts.item2"), t("attempts.item3"), t("attempts.item4")];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[4px] p-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="relative bg-card rounded-2xl w-full max-w-[480px] shadow-2xl border border-border p-7">
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className={`absolute top-3 ${rtl ? "left-3" : "right-3"} p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors`}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-[#fef3c7] flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-[#f59e0b]" />
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-foreground leading-snug">
          {t("attempts.title")}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("attempts.subtitle")}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-foreground">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#461bb6] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={openWhatsApp}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#461bb6] text-white font-semibold hover:bg-[#3a16a0] transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          {t("attempts.cta")}
        </button>
      </div>
    </div>
  );
}
