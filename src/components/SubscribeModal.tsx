import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock, Sparkles, MessageCircle } from "lucide-react";

const WA_URL = "https://wa.me/966115030382?text=" + encodeURIComponent("مرحبا، أرغب بالاشتراك للوصول إلى التحليلات المتقدمة في منصة Boom.");

export function SubscribeModal({
  open,
  onOpenChange,
  sectionLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sectionLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-[#461bb6]/10 dark:bg-[#461bb6]/25 flex items-center justify-center mb-2">
            <Lock className="h-7 w-7 text-[#461bb6]" />
          </div>
          <DialogTitle className="text-center text-lg flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-[#f4d768]" />
            هذا القسم متاح في النسخة المدفوعة
          </DialogTitle>
          <DialogDescription className="text-center pt-1">
            {sectionLabel ? <>للوصول إلى <span className="font-semibold text-foreground">{sectionLabel}</span> وباقي الأقسام المتقدمة، يرجى الاشتراك والتواصل مع فريقنا.</> : "للحصول على مزيد من النتائج والأقسام المتقدمة، يرجى الاشتراك والتواصل مع فريقنا."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#461bb6] text-white text-sm font-semibold hover:bg-[#3a16a0] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            تواصل معنا على واتساب
          </a>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/40"
          >
            لاحقاً
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
