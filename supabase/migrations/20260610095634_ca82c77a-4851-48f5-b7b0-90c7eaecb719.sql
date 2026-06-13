ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS audience_country_split jsonb,
  ADD COLUMN IF NOT EXISTS audience_city_split jsonb;