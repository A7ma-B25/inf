
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending | running | done | error
  url text NOT NULL,
  platform text NOT NULL,
  username text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  influencer_id uuid
);

CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status, created_at);

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.analysis_jobs FOR ALL USING (true) WITH CHECK (true);
