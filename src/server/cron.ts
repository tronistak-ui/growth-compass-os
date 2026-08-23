// Replaces the pg_cron + pg_net job from
// supabase/migrations/20260822160000_social_connections_sync_cron.sql. That
// migration had Postgres call the sync-presence edge function over HTTP once
// a day; here the same Node process just runs the sync function directly —
// no HTTP hop, no shared secret, no separate scheduler service to run.
//
// Imported once (side-effect only) from src/server.ts so it registers when
// the server process boots, not per-request. Guarded against double
// registration because Vite's dev-mode HMR can re-evaluate this module.
import cron from "node-cron";
import { syncAllConnections } from "./oauth/presence-sync.server";

declare global {
  // eslint-disable-next-line no-var
  var __presenceSyncCronStarted: boolean | undefined;
}

export function startCronJobs(): void {
  if (globalThis.__presenceSyncCronStarted) return;
  globalThis.__presenceSyncCronStarted = true;

  // 06:00 UTC daily — same schedule as the source pg_cron job.
  cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        const results = await syncAllConnections();
        const failed = results.filter((r) => !r.ok).length;
        console.log(`[cron] daily presence sync: ${results.length} connection(s), ${failed} failed`);
      } catch (e) {
        console.error("[cron] daily presence sync failed to run:", e);
      }
    },
    { timezone: "UTC" },
  );
}
