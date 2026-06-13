
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON public.ai_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.ai_providers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.ai_providers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.ai_providers FOR DELETE TO authenticated USING (true);

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS active_ai_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL;
