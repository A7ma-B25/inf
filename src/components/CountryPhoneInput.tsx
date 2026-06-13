import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  // Arab countries (all 22 League of Arab States members)
  { code: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪" },
  { code: "EG", name: "مصر", dial: "+20", flag: "🇪🇬" },
  { code: "KW", name: "الكويت", dial: "+965", flag: "🇰🇼" },
  { code: "QA", name: "قطر", dial: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "عمان", dial: "+968", flag: "🇴🇲" },
  { code: "JO", name: "الأردن", dial: "+962", flag: "🇯🇴" },
  { code: "LB", name: "لبنان", dial: "+961", flag: "🇱🇧" },
  { code: "SY", name: "سوريا", dial: "+963", flag: "🇸🇾" },
  { code: "IQ", name: "العراق", dial: "+964", flag: "🇮🇶" },
  { code: "YE", name: "اليمن", dial: "+967", flag: "🇾🇪" },
  { code: "PS", name: "فلسطين", dial: "+970", flag: "🇵🇸" },
  { code: "MA", name: "المغرب", dial: "+212", flag: "🇲🇦" },
  { code: "TN", name: "تونس", dial: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "الجزائر", dial: "+213", flag: "🇩🇿" },
  { code: "LY", name: "ليبيا", dial: "+218", flag: "🇱🇾" },
  { code: "SD", name: "السودان", dial: "+249", flag: "🇸🇩" },
  { code: "MR", name: "موريتانيا", dial: "+222", flag: "🇲🇷" },
  { code: "SO", name: "الصومال", dial: "+252", flag: "🇸🇴" },
  { code: "DJ", name: "جيبوتي", dial: "+253", flag: "🇩🇯" },
  { code: "KM", name: "جزر القمر", dial: "+269", flag: "🇰🇲" },
  // Others
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  placeholder,
  required,
  className,
}: CountryPhoneInputProps) {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    const prefix = country.dial;
    if (value.startsWith(prefix)) {
      setLocalValue(value.slice(prefix.length).trim());
    } else {
      const match = value.match(/^\+\d+/);
      if (match) {
        const found = COUNTRIES.find((c) => c.dial === match[0]);
        if (found) {
          setCountry(found);
          setLocalValue(value.slice(match[0].length).trim());
          return;
        }
      }
      setLocalValue(value);
    }
  }, [value]);

  const handleCountryChange = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) return;
    setCountry(c);
    onChange(`${c.dial} ${localValue}`.trim());
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/^\+\d+\s?/, "").trim();
    setLocalValue(v);
    onChange(`${country.dial} ${v}`.trim());
  };

  return (
    <div className={cn("flex gap-2", className)} dir="ltr">
      <Select value={country.code} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-[120px] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{country.flag}</span>
              <span className="text-sm">{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        required={required}
        placeholder={placeholder}
        value={localValue}
        onChange={handlePhoneChange}
        className="flex-1"
        dir="ltr"
      />
    </div>
  );
}
