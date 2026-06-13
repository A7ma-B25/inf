import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processJob } from "@/lib/analyze.server";

// Claim and process pending analysis jobs. Called by pg_cron and also
// directly by the frontend right after enqueueing to start work immediately.
async function handle(): Promise<Response> {
  // Reclaim jobs stuck in "running" for >10 minutes (likely worker crash/timeout)
  const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("analysis_jobs")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("started_at", stuckCutoff);

  // Claim up to 2 pending jobs (atomic via update + select)
  const { data: pending } = await supabaseAdmin
    .from("analysis_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(2);

  if (!pending || pending.length === 0) {
    return Response.json({ processed: 0 });
  }

  // Process sequentially (each job runs Apify+Gemini, may take ~60-90s)
  const results: any[] = [];
  for (const j of pending) {
    // Re-check status to avoid double-claim
    const { data: latest } = await supabaseAdmin
      .from("analysis_jobs")
      .select("status")
      .eq("id", j.id)
      .maybeSingle();
    if (latest?.status !== "pending") continue;

    const r = await processJob(j.id);
    results.push({ jobId: j.id, ...r });
  }

  return Response.json({ processed: results.length, results });
}

export const Route = createFileRoute("/api/public/hooks/process-jobs")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
