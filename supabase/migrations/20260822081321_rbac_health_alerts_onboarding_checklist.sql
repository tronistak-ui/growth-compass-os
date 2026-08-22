-- ============================================================================
-- 1. RBAC — add `support` and `auditor` roles alongside platform_admin /
--    business_owner. Support gets the same read/write reach as platform_admin
--    over cross-tenant admin tables (so they can help clients) but cannot
--    manage other users' roles. Auditor is strictly read-only across every
--    business-owned table (for compliance / bookkeeping review).
-- ============================================================================


-- has_any_role: variadic helper so policies can allow several roles at once
-- without stacking has_role() OR chains everywhere.
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, VARIADIC _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

-- is_org_member already grants platform_admin implicit membership; extend the
-- same implicit (read-side) access to support and auditor so both can open a
-- client's workspace. Auditor is then restricted to SELECT via table policies
-- below rather than being blocked from is_org_member entirely.
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id AND m.user_id = auth.uid()
  ) OR public.has_any_role(auth.uid(), 'platform_admin', 'support', 'auditor');
$$;

-- Read-only cross-tenant access for auditor/support on every business-owned
-- table that currently has a platform_admin bypass policy, plus a genuine
-- SELECT-only bypass for auditor on the core operational + financial tables
-- (the ones an auditor actually needs to review) even where no admin policy
-- exists yet. Existing owner/member policies are untouched — this only adds
-- policies, it does not replace any.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'organizations','organization_members','customer_segments','offers','campaigns',
      'customers','leads','interactions','revenue_transactions','expenses','tasks',
      'competitors','conversion_assets','funnel_snapshots','growth_opportunities',
      'presence_profiles','positioning'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.has_any_role(auth.uid(), ''auditor'', ''support''));',
      t || '_auditor_support_read', t
    );
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- migration re-run safety
END $$;

-- Role management: only platform_admin may grant/revoke roles (support and
-- auditor included). Previously the only write path was the one-time
-- claim_platform_admin() RPC; this adds ongoing team management for the
-- admin UI, restricted to platform_admin.
CREATE POLICY "platform_admin manage roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "platform_admin revoke roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- ============================================================================
-- 2. System health alerts — failed jobs / RLS errors / data sync issues.
--    Platform-wide (not tenant scoped). Any authenticated backend job or
--    edge function can log here with the service role; only platform_admin
--    and support can read or resolve them in-app.
-- ============================================================================

CREATE TABLE public.system_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','error','critical')),
  source text NOT NULL,               -- e.g. 'cron:daily-rollup', 'rls', 'sync:instagram'
  event_type text NOT NULL,           -- e.g. 'job_failed', 'rls_violation', 'sync_error'
  message text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_health_events_unresolved ON public.system_health_events (resolved, created_at DESC);
CREATE INDEX idx_system_health_events_org ON public.system_health_events (organization_id);

ALTER TABLE public.system_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_health_events_admin_support_read
  ON public.system_health_events FOR SELECT
  USING (public.has_any_role(auth.uid(), 'platform_admin', 'support'));

CREATE POLICY system_health_events_admin_support_update
  ON public.system_health_events FOR UPDATE
  USING (public.has_any_role(auth.uid(), 'platform_admin', 'support'));

-- Inserts happen from trusted server contexts (service role / edge functions),
-- which bypass RLS entirely, so no INSERT policy is granted to end users.

-- In-app notifications feed (bell icon). Health alerts write here too so the
-- same table powers "notify me in-app" for any future notification type.
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system_health',
  title text NOT NULL,
  body text,
  link text,
  health_event_id uuid REFERENCES public.system_health_events(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_owner_select
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_owner_update
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Fan out: whenever a health event is inserted, create an in-app notification
-- for every platform_admin / support user, and queue an email by calling the
-- system-health-alert edge function over pg_net. pg_net + the edge function
-- URL/service key must be configured (see supabase/functions/system-health-alert).
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_config_admin_only ON public.app_config FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));
-- Populate after deploy:
--   insert into public.app_config (key, value) values
--     ('edge_functions_url', 'https://<project-ref>.supabase.co/functions/v1'),
--     ('service_role_key', '<service-role-key>')
--   on conflict (key) do update set value = excluded.value;
-- (Prefer Supabase Vault for the service key in production; this table is a
-- pragmatic stand-in and is locked to platform_admin via RLS above.)

CREATE OR REPLACE FUNCTION public.fan_out_health_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text;
  svc_key text;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, health_event_id)
  SELECT ur.user_id, 'system_health',
         '[' || upper(NEW.severity) || '] ' || NEW.source,
         NEW.message,
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('platform_admin','support');

  SELECT value INTO fn_url FROM public.app_config WHERE key = 'edge_functions_url';
  SELECT value INTO svc_key FROM public.app_config WHERE key = 'service_role_key';

  IF fn_url IS NOT NULL AND svc_key IS NOT NULL AND NEW.severity IN ('error','critical') THEN
    PERFORM net.http_post(
      url := fn_url || '/system-health-alert',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || svc_key),
      body := jsonb_build_object(
        'id', NEW.id, 'severity', NEW.severity, 'source', NEW.source,
        'event_type', NEW.event_type, 'message', NEW.message, 'detail', NEW.detail
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fan_out_health_event
  AFTER INSERT ON public.system_health_events
  FOR EACH ROW EXECUTE FUNCTION public.fan_out_health_event();

-- ============================================================================
-- 3. Onboarding checklist — computed, not stored, so it can never drift from
--    reality. Each item is "complete" purely because the underlying data
--    exists (a lead was added, presence was filled in, a logo was uploaded,
--    etc.) — there is no separate checkbox state to fall out of sync.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_checklist(_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org RECORD;
  result jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_org_member(_org_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO org FROM public.organizations WHERE id = _org_id;

  result := result || jsonb_build_array(jsonb_build_object(
    'key','business_profile','stage','onboarding','label','Complete your business profile',
    'complete', (org.name IS NOT NULL AND org.niche IS NOT NULL AND org.location IS NOT NULL)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','goals_set','stage','onboarding','label','Set your business goals',
    'complete', (org.goals IS NOT NULL AND array_length(org.goals,1) > 0)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','presence_profile','stage','audit','label','Fill in your Presence profile',
    'complete', EXISTS (SELECT 1 FROM public.presence_profiles WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','positioning','stage','audit','label','Define your brand positioning',
    'complete', EXISTS (SELECT 1 FROM public.positioning WHERE organization_id = _org_id AND coalesce(value_proposition,'') <> '')
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','customer_segment','stage','system_setup','label','Create your first customer segment',
    'complete', EXISTS (SELECT 1 FROM public.customer_segments WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_offer','stage','system_setup','label','Add your first offer',
    'complete', EXISTS (SELECT 1 FROM public.offers WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_campaign','stage','system_setup','label','Launch your first campaign',
    'complete', EXISTS (SELECT 1 FROM public.campaigns WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_lead','stage','system_setup','label','Add your first lead',
    'complete', EXISTS (SELECT 1 FROM public.leads WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_customer','stage','optimization','label','Convert your first customer',
    'complete', EXISTS (SELECT 1 FROM public.customers WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_revenue','stage','optimization','label','Record your first revenue transaction',
    'complete', EXISTS (SELECT 1 FROM public.revenue_transactions WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','first_expense','stage','optimization','label','Log your first expense',
    'complete', EXISTS (SELECT 1 FROM public.expenses WHERE organization_id = _org_id)
  ));
  result := result || jsonb_build_array(jsonb_build_object(
    'key','tasks_created','stage','optimization','label','Create at least one growth task',
    'complete', EXISTS (SELECT 1 FROM public.tasks WHERE organization_id = _org_id)
  ));

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_onboarding_checklist(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_checklist(uuid) TO authenticated;

-- Keep organizations.onboarding_status roughly in sync once every item in a
-- stage is complete (best-effort convenience; the checklist function above
-- remains the source of truth for the UI).
CREATE OR REPLACE FUNCTION public.advance_onboarding_stage(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  items jsonb;
  all_done boolean;
BEGIN
  items := public.get_onboarding_checklist(_org_id);
  SELECT bool_and((i->>'complete')::boolean) INTO all_done FROM jsonb_array_elements(items) i;
  IF all_done THEN
    UPDATE public.organizations SET onboarding_status = 'completed', onboarding_completed = true
    WHERE id = _org_id AND onboarding_status <> 'completed';
  END IF;
END;
$$;
