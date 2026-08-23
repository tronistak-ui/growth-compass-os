import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember } from "../authz.server";
import { findConnectionById } from "../db-helpers/social-connections.server";
import { syncConnectionById, MIN_REFRESH_INTERVAL_MS } from "../oauth/presence-sync.server";

const syncInput = z.object({ connectionId: z.string().uuid() });

/**
 * Mirrors sync-presence's user-triggered path ("Refresh now" in Presence):
 * syncs just the one connection, after verifying org membership, rate
 * limited to once per 5 minutes per connection. The daily bulk sync
 * (syncAllConnections) runs from node-cron instead — see server/cron.ts.
 */
export const syncPresenceConnection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => syncInput.parse(input))
  .handler(async ({ data, context }) => {
    const conn = await findConnectionById(data.connectionId);
    if (!conn) throw new Error("Connection not found");
    await requireOrgMember(context.userId, conn.organizationId);

    if (conn.lastSyncedAt && Date.now() - conn.lastSyncedAt.getTime() < MIN_REFRESH_INTERVAL_MS) {
      return { skipped: true, reason: "Synced too recently — try again in a few minutes" };
    }

    const result = await syncConnectionById(data.connectionId);
    return { skipped: false, result };
  });
