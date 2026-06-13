import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const { i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar");
  return (
    <div className="relative">
      <Input
        ref={ref}
        {...props}
        type={show ? "text" : "password"}
        className={`${rtl ? "pl-10" : "pr-10"} ${className || ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 ${rtl ? "left-2" : "right-2"}`}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
