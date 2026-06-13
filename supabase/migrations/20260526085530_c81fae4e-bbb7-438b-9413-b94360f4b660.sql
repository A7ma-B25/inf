-- Drop all "public all" policies and replace with authenticated-only

DROP POLICY IF EXISTS "public all" ON public.analysis_jobs;
CREATE POLICY "authenticated all" ON public.analysis_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public all" ON public.apify_tools;
CREATE POLICY "authenticated read" ON public.apify_tools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write" ON public.apify_tools
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.apify_tools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.apify_tools
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.campaign_influencers;
CREATE POLICY "authenticated read" ON public.campaign_influencers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.campaign_influencers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.campaign_influencers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.campaign_influencers
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.campaigns;
CREATE POLICY "authenticated read" ON public.campaigns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.campaigns
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.campaigns
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.influencers;
CREATE POLICY "authenticated read" ON public.influencers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.influencers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.influencers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.influencers
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.settings;
CREATE POLICY "authenticated read" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.settings
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.tracked_influencers;
CREATE POLICY "authenticated read" ON public.tracked_influencers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.tracked_influencers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.tracked_influencers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.tracked_influencers
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public all" ON public.tracked_snapshots;
CREATE POLICY "authenticated read" ON public.tracked_snapshots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.tracked_snapshots
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.tracked_snapshots
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.tracked_snapshots
  FOR DELETE TO authenticated USING (true);