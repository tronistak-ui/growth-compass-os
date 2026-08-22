-- Deterministic growth opportunity sync support
ALTER TABLE public.growth_opportunities
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS insight_key text,
  ADD COLUMN IF NOT EXISTS impact integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module text;

CREATE UNIQUE INDEX IF NOT EXISTS growth_opportunities_auto_key
  ON public.growth_opportunities (organization_id, insight_key)
  WHERE insight_key IS NOT NULL;

-- Onboarding lifecycle: constrain to the defined stages
ALTER TABLE public.organizations
  ALTER COLUMN onboarding_status SET DEFAULT 'not_started';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_onboarding_status_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_onboarding_status_check
      CHECK (onboarding_status IN ('not_started','onboarding','audit','system_setup','optimization','completed'));
  END IF;
END $$;

-- Platform admin bootstrap: the first user may claim admin only while no admin exists.
CREATE OR REPLACE FUNCTION public.claim_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'platform_admin') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'platform_admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'platform_admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_platform_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_platform_admin() TO authenticated;

-- Platform admins manage every organisation row (for stage management in the admin console)
DROP POLICY IF EXISTS "Platform admins manage organizations" ON public.organizations;
CREATE POLICY "Platform admins manage organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));