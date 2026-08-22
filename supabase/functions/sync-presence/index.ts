// supabase/functions/sync-presence/index.ts
//
// Pulls fresh data from each connected provider into presence_profiles.
// Two callers:
//   - The frontend "Refresh now" button: POST { connection_id } with the
//     user's JWT — syncs just that one connection, after verifying the
//     caller belongs to its organization. Rate-limited to once per 5
//     minutes per connection so it can't be used to hammer the provider API.
//   - The daily pg_cron job (see the social_connections_sync migration):
//     POST {} with the service-role bearer token — syncs every currently
//     `connected` row across all orgs/providers.
//
// On success: upserts the relevant presence_profiles columns and stamps
// last_synced_at. On failure: sets status='error' + last_error on the
// connection and inserts a system_health_events row (severity 'error',
// source 'sync:<provider>') — that's all that's needed for it to show up in
// the existing Health Alerts panel and trigger the existing admin/support
// email, no new plumbing required.
//
// Only google_business is implemented so far; Meta/WhatsApp throw a clear
// "not implemented" error per-connection rather than failing the whole run.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided),
// TOKEN_ENCRYPTION_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for refresh).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/token-crypto.ts";
import { handleCors, withCors } from "../_shared/cors.ts";

const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type Connection = {
  id: string;
  organization_id: string;
  provider: string;
  external_account_id: string | null;
  external_account_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
};

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  return withCors(await handleSyncPresence(req));
});

async function handleSyncPresence(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!encryptionKey) {
    return new Response(JSON.stringify({ error: "TOKEN_ENCRYPTION_KEY is not configured" }), {
      status: 500,
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCaller = authHeader === `Bearer ${serviceKey}`;
  const admin = createClient(supabaseUrl, serviceKey);

  let body: { connection_id?: string };
  try {
    body = req.headers.get("content-length") === "0" ? {} : await req.json();
  } catch {
    body = {};
  }

  let connections: Connection[];

  if (body.connection_id) {
    const { data: conn, error } = await admin
      .from("social_connections")
      .select(
        "id,organization_id,provider,external_account_id,external_account_name,access_token,refresh_token,token_expires_at,last_synced_at",
      )
      .eq("id", body.connection_id)
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    if (!conn) return new Response("Connection not found", { status: 404 });

    if (!isServiceCaller) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await callerClient.auth.getUser();
      if (!userData?.user) return new Response("Unauthorized", { status: 401 });

      const { data: membership } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", conn.organization_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!membership) return new Response("Not a member of this organization", { status: 403 });

      if (conn.last_synced_at && Date.now() - new Date(conn.last_synced_at).getTime() < MIN_REFRESH_INTERVAL_MS) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "Synced too recently — try again in a few minutes" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    connections = [conn];
  } else {
    if (!isServiceCaller) {
      return new Response("Only the service role can trigger a bulk sync", { status: 403 });
    }
    const { data, error } = await admin
      .from("social_connections")
      .select(
        "id,organization_id,provider,external_account_id,external_account_name,access_token,refresh_token,token_expires_at,last_synced_at",
      )
      .eq("status", "connected");
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    connections = data ?? [];
  }

  const results = [];
  for (const conn of connections) {
    try {
      await syncOne(admin, conn, encryptionKey);
      results.push({ id: conn.id, provider: conn.provider, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      await admin
        .from("social_connections")
        .update({ status: "error", last_error: message })
        .eq("id", conn.id);
      await admin.from("system_health_events").insert({
        severity: "error",
        source: `sync:${conn.provider}`,
        event_type: "sync_error",
        message,
        organization_id: conn.organization_id,
      });
      results.push({ id: conn.id, provider: conn.provider, ok: false, error: message });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function syncOne(
  admin: ReturnType<typeof createClient>,
  conn: Connection,
  encryptionKey: string,
): Promise<void> {
  if (conn.provider === "google_business") return syncGoogleBusiness(admin, conn, encryptionKey);
  if (conn.provider === "instagram") return syncInstagram(admin, conn, encryptionKey);
  // `facebook` connections exist to hold the Page token that authenticates
  // the linked `instagram` connection's API calls — there's no dedicated
  // facebook_* column on presence_profiles to sync into (the product's
  // Presence module never tracked Facebook as its own channel), so a
  // facebook-provider row is connected-but-never-independently-synced.
  throw new Error(`No sync implemented yet for ${conn.provider}`);
}

async function syncGoogleBusiness(
  admin: ReturnType<typeof createClient>,
  conn: Connection,
  encryptionKey: string,
): Promise<void> {
  if (!conn.external_account_id) {
    throw new Error("No Business Profile account linked — reconnect to pick one up");
  }

  let accessToken = await decryptToken(conn.access_token, encryptionKey);

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now() + 60_000) {
    if (!conn.refresh_token) {
      throw new Error("Access token expired and there is no refresh token — reconnect required");
    }
    const refreshToken = await decryptToken(conn.refresh_token, encryptionKey);
    const refreshed = await refreshGoogleToken(refreshToken);
    accessToken = refreshed.access_token;
    const encryptedAccess = await encryptToken(accessToken, encryptionKey);
    await admin
      .from("social_connections")
      .update({
        access_token: encryptedAccess,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("id", conn.id);
  }

  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.external_account_id}/locations` +
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
        periods?: {
          openDay?: string;
          openTime?: { hours?: number; minutes?: number };
          closeTime?: { hours?: number; minutes?: number };
        }[];
      };
      categories?: { primaryCategory?: { displayName?: string } };
      websiteUri?: string;
    }[];
  };
  const location = locationsBody.locations?.[0];
  if (!location) {
    throw new Error("No Business Profile locations found for this account");
  }

  let rating = 0;
  let reviewCount = 0;
  try {
    const locationId = location.name?.split("/").pop();
    const accountId = conn.external_account_id.split("/").pop();
    if (locationId && accountId) {
      const reviewsRes = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (reviewsRes.ok) {
        const reviewsBody = (await reviewsRes.json()) as {
          averageRating?: number;
          totalReviewCount?: number;
        };
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

  const { error: presenceErr } = await admin
    .from("presence_profiles")
    .upsert(
      {
        organization_id: conn.organization_id,
        google_profile_claimed: true,
        google_category: location.categories?.primaryCategory?.displayName ?? null,
        google_address: address,
        google_phone: location.phoneNumbers?.primaryPhone ?? null,
        google_hours: hours,
        google_reviews: reviewCount,
        google_rating: rating,
        google_website_linked: !!location.websiteUri,
      },
      { onConflict: "organization_id" },
    );
  if (presenceErr) throw new Error(presenceErr.message);

  await admin
    .from("social_connections")
    .update({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_error: null,
      external_account_name: conn.external_account_name ?? location.title ?? null,
    })
    .eq("id", conn.id);
}

async function syncInstagram(
  admin: ReturnType<typeof createClient>,
  conn: Connection,
  encryptionKey: string,
): Promise<void> {
  if (!conn.external_account_id) {
    throw new Error("No Instagram Business account linked — reconnect to pick one up");
  }

  // Meta's long-lived Page tokens have no refresh_token — they're renewed by
  // re-exchanging a still-valid token, not by a distinct refresh credential.
  // If it's already expired there is nothing to exchange it for, so the only
  // path forward is asking the client to reconnect (unlike Google, where an
  // expired access token still has a usable refresh_token sitting next to it).
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now()) {
    throw new Error("Facebook/Instagram access has expired — please reconnect");
  }
  const accessToken = await decryptToken(conn.access_token, encryptionKey);

  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${conn.external_account_id}` +
      `?fields=username,biography,followers_count,website&access_token=${accessToken}`,
  );
  if (!igRes.ok) {
    throw new Error(`Failed to read Instagram Business account: ${await igRes.text()}`);
  }
  const ig = (await igRes.json()) as {
    username?: string;
    biography?: string;
    followers_count?: number;
    website?: string;
  };

  const { error: presenceErr } = await admin.from("presence_profiles").upsert(
    {
      organization_id: conn.organization_id,
      instagram_url: ig.username ? `https://instagram.com/${ig.username}` : null,
      instagram_bio: ig.biography ?? null,
      instagram_followers: ig.followers_count ?? 0,
      instagram_link: !!ig.website,
      // instagram_has_cta / instagram_contact aren't exposed by the Graph
      // API (they're Instagram-app UI features, not queryable fields) —
      // left alone here so manual entry stays authoritative for those two.
    },
    { onConflict: "organization_id" },
  );
  if (presenceErr) throw new Error(presenceErr.message);

  await admin
    .from("social_connections")
    .update({
      status: "connected",
      last_synced_at: new Date().toISOString(),
      last_error: null,
      external_account_name: ig.username ? `@${ig.username}` : conn.external_account_name,
    })
    .eq("id", conn.id);
}

function formatHours(
  periods: {
    openDay?: string;
    openTime?: { hours?: number; minutes?: number };
    closeTime?: { hours?: number; minutes?: number };
  }[],
): string | null {
  if (periods.length === 0) return null;
  const time = (t?: { hours?: number; minutes?: number }) =>
    `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
  return periods
    .map((p) => `${p.openDay ?? "?"} ${time(p.openTime)}–${time(p.closeTime)}`)
    .join("; ");
}

async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return await res.json();
}
