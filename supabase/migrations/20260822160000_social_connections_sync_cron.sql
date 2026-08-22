-- Schedules the daily bulk sync (§4 of the social-connections spec): once a
-- day, call sync-presence with no connection_id, which tells it to loop
-- every currently-`connected` row across every org/provider. Reuses the
-- same app_config (edge_functions_url / service_role_key) + pg_net pattern
-- already established for the health-alert trigger — see
-- 20260822081321_rbac_health_alerts_onboarding_checklist.sql.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_cron runs jobs as the postgres role; cron.schedule itself needs to be
-- callable, which Supabase grants by default, but keep this guarded in case
-- of a re-run.
DO $$
BEGIN
  PERFORM cron.unschedule('sync-presence-daily');
EXCEPTION WHEN OTHERS THEN
  NULL; -- job didn't exist yet, nothing to unschedule
END $$;

SELECT cron.schedule(
  'sync-presence-daily',
  '0 6 * * *', -- 06:00 UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public.app_config WHERE key = 'edge_functions_url') || '/sync-presence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
