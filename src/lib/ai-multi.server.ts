// Unified AI provider caller (server-only). Sends a JSON-mode chat request
// to the chosen provider and returns the assistant text content.
import type { ProviderId } from "./ai-providers";

export type AiCallInput = {
  provider: ProviderId;
  model: string;
  api_key: string;
  system?: string;
  prompt: string;
};

export async function callAiProvider(input: AiCallInput): Promise<string> {
  const { provider, model, api_key, system, prompt } = input;

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    return j.content?.[0]?.text || "{}";
  }

  // OpenAI / Mistral / Groq share the OpenAI chat completions schema.
  const endpoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
  };
  const url = endpoints[provider];
  if (!url) throw new Error(`Unsupported provider: ${provider}`);

  const body: any = {
    model,
    temperature: 0.4,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ],
  };
  if (provider === "openai") body.response_format = { type: "json_object" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${provider} error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "{}";
}

// Quick connectivity test — single trivial prompt, returns true on 2xx.
export async function testAiProvider(input: Omit<AiCallInput, "system" | "prompt">): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = await callAiProvider({
      ...input,
      system: "Respond with valid JSON only.",
      prompt: 'Reply with JSON: {"ok":true}',
    });
    return { ok: !!text };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed" };
  }
}
