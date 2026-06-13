
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analysis_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_limit integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS report_ids uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) IN ('boom@team.com','admin@boom.test');
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
