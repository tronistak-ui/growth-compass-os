// Pulls fresh data from each connected provider into presence_profiles.
// Ported from supabase/functions/sync-presence/index.ts. Two callers now
// instead of one HTTP endpoint with two auth modes:
//   - syncPresenceConnection (server function): the frontend "Refresh now"
//     button, rate-limited to once per 5 minutes per connection.
//   - syncAllConnections (plain function, called in-process by node-cron):
//     the daily bulk sync — no HTTP round-trip or shared secret needed since
//     cron runs in the same Node process as the server.
//
// On success: upserts the relevant presence_profiles columns and stamps
// last_synced_at. On failure: sets status='error' + last_error on the
// connection and logs a system_health_events row (severity 'error', source
// 'sync:<provider>') via reportHealthEvent — same as the original design,
// minus the pg_net hop.
//
// Only google_business and instagram are implemented; whatsapp throws a
// clear "not implemented" error per-connection rather than failing the run.
import { db } from "@/db/client";
import { presenceProfiles } from "@/db/schema";
import { decryptToken, encryptToken } from "./token-crypto.server";
import { refreshGoogleToken, refreshInstagramToken } from "./providers.server";
import {
  findConnectionById,
  markConnectionError,
  markConnectionSynced,
  updateConnectionToken,
  listConnectedConnections,
} from "../db-helpers/social-connections.server";
import { reportHealthEventInternal } from "../notify/report-health-event.server";
import type { SocialConnection } from "@/db/schema";

export const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type SyncResult = { id: string; provider: string; ok: boolean; error?: string };

export async function syncConnectionById(id: string): Promise<SyncResult> {
  const conn = await findConnectionById(id);
  if (!conn) throw new Error("Connection not found");
  return syncOne(conn);
}

/** The daily bulk sync — every currently-connected row across every org/provider. */
export async function syncAllConnections(): Promise<SyncResult[]> {
  const connections = await listConnectedConnections();
  const results: SyncResult[] = [];
  for (const conn of connections) results.push(await syncOne(conn));
  return results;
}

async function syncOne(conn: SocialConnection): Promise<SyncResult> {
  try {
    await syncByProvider(conn);
    return { id: conn.id, provider: conn.provider, ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await markConnectionError(conn.id, message);
    await reportHealthEventInternal({
      severity: "error",
      source: `sync:${conn.provider}`,
      event_type: "sync_error",
      message,
      organizationId: conn.organizationId,
    });
    return { id: conn.id, provider: conn.provider, ok: false, error: message };
  }
}

function syncByProvider(conn: SocialConnection): Promise<void> {
  if (conn.provider === "google_business") return syncGoogleBusiness(conn);
  if (conn.provider === "instagram") return syncInstagram(conn);
  return Promise.reject(new Error(`No sync implemented yet for ${conn.provider}`));
}

async function syncGoogleBusiness(conn: SocialConnection): Promise<void> {
  if (!conn.externalAccountId) {
    throw new Error("No Business Profile account linked — reconnect to pick one up");
  }

  let accessToken = await decryptToken(conn.accessToken);

  const expiresAt = conn.tokenExpiresAt ? conn.tokenExpiresAt.getTime() : 0;
  if (expiresAt && expiresAt < Date.now() + 60_000) {
    if (!conn.refreshToken) {
      throw new Error("Access token expired and there is no refresh token — reconnect required");
    }
    const refreshToken = await decryptToken(conn.refreshToken);
    const refreshed = await refreshGoogleToken(refreshToken);
    accessToken = refreshed.access_token;
    await updateConnectionToken(conn.id, {
      accessToken: await encryptToken(accessToken),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    });
  }

  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.externalAccountId}/locations` +
      "?readMask=title,phoneNumbers,storefrontAddress,regularHours,categories,websiteUri",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!locationsRes.ok) {
    throw new Error(`Failed to list Business Profile locations: ${await locationsRes.text()}`);
  }
  const locationsBody = (await locationsRes.json()) as {
    locations?: {
      name?: string;
      title?: string;
      phoneNumbers?: { primaryPhone?: string };
      storefrontAddress?: {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
      };
      regularHours?: {
        periods?: { openDay?: string; openTime?: { hours?: number; minutes?: number }; closeTime?: { hours?: number; minutes?: number } }[];
      };
      categories?: { primaryCategory?: { displayName?: string } };
      websiteUri?: string;
    }[];
  };
  const location = locationsBody.locations?.[0];
  if (!location) throw new Error("No Business Profile locations found for this account");

  let rating = 0;
  let reviewCount = 0;
  try {
    const locationId = location.name?.split("/").pop();
    const accountId = conn.externalAccountId.split("/").pop();
    if (locationId && accountId) {
      const reviewsRes = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (reviewsRes.ok) {
        const reviewsBody = (await reviewsRes.json()) as { averageRating?: number; totalReviewCount?: number };
        rating = reviewsBody.averageRating ?? 0;
        reviewCount = reviewsBody.totalReviewCount ?? 0;
      }
    }
  } catch {
    // Reviews are a bonus, not core — never fail the sync over them.
  }

  const address = location.storefrontAddress
    ? [
        ...(location.storefrontAddress.addressLines ?? []),
        location.storefrontAddress.locality,
        location.storefrontAddress.administrativeArea,
        location.storefrontAddress.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const hours = formatHours(location.regularHours?.periods ?? []);

  await db
    .insert(presenceProfiles)
    .values({
      organizationId: conn.organizationId,
      googleProfileClaimed: true,
      googleCategory: location.categories?.primaryCategory?.displayName ?? null,
      googleAddress: address,
      googlePhone: location.phoneNumbers?.primaryPhone ?? null,
      googleHours: hours,
      googleReviews: reviewCount,
      googleRating: String(rating),
      googleWebsiteLinked: !!location.websiteUri,
    })
    .onConflictDoUpdate({
      target: presenceProfiles.organizationId,
      set: {
        googleProfileClaimed: true,
        googleCategory: location.categories?.primaryCategory?.displayName ?? null,
        googleAddress: address,
        googlePhone: location.phoneNumbers?.primaryPhone ?? null,
        googleHours: hours,
        googleReviews: reviewCount,
        googleRating: String(rating),
        googleWebsiteLinked: !!location.websiteUri,
      },
    });

  await markConnectionSynced(conn.id, { externalAccountName: conn.externalAccountName ?? location.title ?? null });
}

// Instagram Login's long-lived tokens (~60 days) have no distinct refresh
// token — the same token renews in place, but only once it's at least 24h
// old (see refreshInstagramToken). We don't track "issued at" separately;
// it's derived from tokenExpiresAt minus the known 60-day TTL.
const INSTAGRAM_LONG_LIVED_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const INSTAGRAM_REFRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const INSTAGRAM_MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

async function syncInstagram(conn: SocialConnection): Promise<void> {
  let accessToken = await decryptToken(conn.accessToken);

  const expiresAt = conn.tokenExpiresAt ? conn.tokenExpiresAt.getTime() : 0;
  if (expiresAt && expiresAt < Date.now()) {
    throw new Error("Instagram access has expired — please reconnect");
  }
  if (expiresAt && expiresAt - Date.now() < INSTAGRAM_REFRESH_WINDOW_MS) {
    const issuedAt = expiresAt - INSTAGRAM_LONG_LIVED_TTL_MS;
    if (Date.now() - issuedAt >= INSTAGRAM_MIN_TOKEN_AGE_MS) {
      const refreshed = await refreshInstagramToken(accessToken);
      accessToken = refreshed.access_token;
      await updateConnectionToken(conn.id, {
        accessToken: await encryptToken(accessToken),
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      });
    }
  }

  const igRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=username,biography,followers_count,website&access_token=${accessToken}`,
  );
  if (!igRes.ok) throw new Error(`Failed to read Instagram profile: ${await igRes.text()}`);
  const ig = (await igRes.json()) as { username?: string; biography?: string; followers_count?: number; website?: string };

  await db
    .insert(presenceProfiles)
    .values({
      organizationId: conn.organizationId,
      instagramUrl: ig.username ? `https://instagram.com/${ig.username}` : null,
      instagramBio: ig.biography ?? null,
      instagramFollowers: ig.followers_count ?? 0,
      instagramLink: !!ig.website,
    })
    .onConflictDoUpdate({
      target: presenceProfiles.organizationId,
      set: {
        instagramUrl: ig.username ? `https://instagram.com/${ig.username}` : null,
        instagramBio: ig.biography ?? null,
        instagramFollowers: ig.followers_count ?? 0,
        instagramLink: !!ig.website,
        // instagram_has_cta / instagram_contact aren't exposed by the Graph
        // API — left alone here so manual entry stays authoritative.
      },
    });

  await markConnectionSynced(conn.id, { externalAccountName: ig.username ? `@${ig.username}` : conn.externalAccountName });
}

function formatHours(
  periods: { openDay?: string; openTime?: { hours?: number; minutes?: number }; closeTime?: { hours?: number; minutes?: number } }[],
): string | null {
  if (periods.length === 0) return null;
  const time = (t?: { hours?: number; minutes?: number }) =>
    `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
  return periods.map((p) => `${p.openDay ?? "?"} ${time(p.openTime)}–${time(p.closeTime)}`).join("; ");
}
