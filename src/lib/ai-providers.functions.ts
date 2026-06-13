import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { testAiProvider } from "./ai-multi.server";

const Input = z.object({
  provider: z.enum(["gemini", "openai", "anthropic", "mistral", "groq"]),
  model: z.string().min(1).max(200),
  api_key: z.string().min(4).max(500),
});

export const testProviderConnection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    return testAiProvider(data);
  });
