import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  url: z.string().url(),
  platform: z.enum(["instagram", "tiktok", "unknown"]),
  username: z.string().min(1),
  tier: z.enum(["free", "full"]).optional().default("full"),
});

// Enqueue a new analysis job and return its id immediately.
export const enqueueAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: job, error } = await supabaseAdmin
      .from("analysis_jobs")
      .insert({
        url: data.url,
        platform: data.platform,
        username: data.username,
        status: "pending",
        // tier is stored as meta on the first log entry (no schema migration needed)
        logs: [{ ts: Date.now(), msg: "Queued for processing", type: "info", meta: { tier: data.tier } }],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { jobId: job.id };
  });

// Poll a job status.
export const getJobStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: job, error } = await supabaseAdmin
      .from("analysis_jobs")
      .select("id,status,logs,error,influencer_id,updated_at")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return job;
  });
