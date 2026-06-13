CREATE TABLE public.tracked_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  tracked_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked TIMESTAMPTZ,
  check_frequency TEXT NOT NULL DEFAULT 'weekly',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(influencer_id)
);

CREATE TABLE public.tracked_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  followers INTEGER,
  engagement_rate NUMERIC,
  avg_likes INTEGER,
  avg_comments INTEGER,
  avg_views INTEGER,
  overall_score INTEGER
);

CREATE INDEX idx_tracked_snapshots_inf_date ON public.tracked_snapshots(influencer_id, snapshot_date DESC);

ALTER TABLE public.tracked_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.tracked_influencers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.tracked_snapshots FOR ALL USING (true) WITH CHECK (true);