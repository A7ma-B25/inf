CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'planning',
  goal text,
  platform text,
  notes text
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.campaign_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  agreed_price integer DEFAULT 0,
  content_type text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  deliverables text
);

ALTER TABLE public.campaign_influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON public.campaign_influencers FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_campaign_influencers_campaign ON public.campaign_influencers(campaign_id);
CREATE INDEX idx_campaign_influencers_influencer ON public.campaign_influencers(influencer_id);