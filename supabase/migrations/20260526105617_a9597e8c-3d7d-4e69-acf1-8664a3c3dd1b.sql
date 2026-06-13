
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

-- Public read access for shared reports (anyone, no login)
DROP POLICY IF EXISTS "Allow public read for shared reports" ON public.influencers;
CREATE POLICY "Allow public read for shared reports"
ON public.influencers
FOR SELECT
USING (is_public = true);

-- Preserve current app behavior (app uses anon key for all operations).
DROP POLICY IF EXISTS "App full read" ON public.influencers;
CREATE POLICY "App full read" ON public.influencers FOR SELECT USING (true);

DROP POLICY IF EXISTS "App insert" ON public.influencers;
CREATE POLICY "App insert" ON public.influencers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "App update" ON public.influencers;
CREATE POLICY "App update" ON public.influencers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App delete" ON public.influencers;
CREATE POLICY "App delete" ON public.influencers FOR DELETE USING (true);
