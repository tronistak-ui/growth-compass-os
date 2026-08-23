import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { socialConnectionsPublic, socialConnections } from "@/db/schema";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember, requireOrgWrite } from "../authz.server";
import { signState } from "../oauth/oauth-state.server";
import { SUPPORTED_PROVIDERS, buildAuthorizeUrl } from "../oauth/providers.server";
import { decryptToken } from "../oauth/token-crypto.server";
import { findConnection } from "../db-helpers/social-connections.server";

const getConnectionInput = z.object({ orgId: z.string().uuid(), provider: z.string() });

/** Token-free connection status — mirrors querying social_connections_public directly. */
export const getSocialConnection = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => getConnectionInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const [row] = await db
      .select()
      .from(socialConnectionsPublic)
      .where(and(eq(socialConnectionsPublic.organizationId, data.orgId), eq(socialConnectionsPublic.provider, data.provider)))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      external_account_name: row.externalAccountName,
      last_synced_at: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      last_error: row.lastError,
    };
  });

const startOAuthInput = z.object({
  provider: z.string(),
  orgId: z.string().uuid(),
});

/**
 * Mirrors oauth-start: verifies the caller belongs to the org before ever
 * handing out a signed state for it, then returns the provider's authorize
 * URL for the frontend to redirect the browser to.
 */
export const startOAuth = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => startOAuthInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!SUPPORTED_PROVIDERS.has(data.provider)) {
      throw new Error(`${data.provider} is not connectable yet`);
    }
    await requireOrgMember(context.userId, data.orgId);

    const state = await signState({
      org_id: data.orgId,
      provider: data.provider,
      user_id: context.userId,
      nonce: crypto.randomUUID(),
    });

    const url = buildAuthorizeUrl(data.provider, state);
    if (!url) {
      throw new Error(
        `${data.provider} OAuth isn't configured yet — set the client id/secret in .env (see AGENTS.md/README).`,
      );
    }
    return { url };
  });

const disconnectInput = z.object({ orgId: z.string().uuid(), provider: z.string() });

/**
 * Mirrors §7's disconnect action: deletes the social_connections row and
 * reverts the channel to fully manual. Best-effort revokes the token with
 * the provider first (Google has a trivial one-call revoke endpoint; Meta's
 * Page/user tokens don't have an equivalent this simple, so we skip it there
 * — deleting our copy still stops us from using it either way).
 */
export const disconnectSocialConnection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => disconnectInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);
    const conn = await findConnection(data.orgId, data.provider);
    if (!conn) return { ok: true };

    if (conn.provider === "google_business") {
      try {
        const accessToken = await decryptToken(conn.accessToken);
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } catch {
        // Non-fatal — deleting our row below is what actually matters.
      }
    }

    await db.delete(socialConnections).where(eq(socialConnections.id, conn.id));
    return { ok: true };
  });
