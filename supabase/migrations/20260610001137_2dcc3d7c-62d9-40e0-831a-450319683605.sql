ALTER TABLE public.influencers
ADD COLUMN IF NOT EXISTS ai_validation_warnings JSONB,
ADD COLUMN IF NOT EXISTS data_confidence JSONB;