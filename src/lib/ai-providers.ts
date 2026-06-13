// Shared catalog of supported AI providers + models (client-safe).
export type ProviderId = "gemini" | "openai" | "anthropic" | "mistral" | "groq";

export const PROVIDERS: {
  id: ProviderId;
  name: string;
  subtitle: string;
  color: string;
  emoji: string;
  models: { id: string; label: string; tag?: string }[];
}[] = [
  {
    id: "gemini",
    name: "Gemini",
    subtitle: "Google",
    color: "#4285F4",
    emoji: "🟦",
    models: [
      { id: "gemini-2.0-flash", label: "gemini-2.0-flash", tag: "Recommended ⚡ Fast & Free" },
      { id: "gemini-1.5-pro", label: "gemini-1.5-pro", tag: "Powerful" },
      { id: "gemini-1.5-flash", label: "gemini-1.5-flash", tag: "Fast" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    subtitle: "GPT",
    color: "#10a37f",
    emoji: "🟩",
    models: [
      { id: "gpt-4o", label: "gpt-4o", tag: "Most capable" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini", tag: "Fast & cheap" },
      { id: "gpt-4-turbo", label: "gpt-4-turbo", tag: "Powerful" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    subtitle: "Claude",
    color: "#d97757",
    emoji: "🟧",
    models: [
      { id: "claude-sonnet-4-20250514", label: "claude-sonnet-4", tag: "Recommended" },
      { id: "claude-haiku-4-5", label: "claude-haiku-4-5", tag: "Fast" },
      { id: "claude-opus-4", label: "claude-opus-4", tag: "Most powerful" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    subtitle: "Mistral AI",
    color: "#ff7000",
    emoji: "🟥",
    models: [
      { id: "mistral-large-latest", label: "mistral-large-latest" },
      { id: "mistral-small-latest", label: "mistral-small-latest" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    subtitle: "Ultra fast",
    color: "#111827",
    emoji: "⬛",
    models: [
      { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile" },
      { id: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768" },
    ],
  },
];

export function getProvider(id: string) {
  return PROVIDERS.find(p => p.id === id);
}

export function maskKey(key: string | null | undefined) {
  if (!key) return "—";
  const k = String(key);
  if (k.length <= 8) return "•".repeat(k.length);
  return `${k.slice(0, 3)}${"•".repeat(6)}${k.slice(-4)}`;
}
