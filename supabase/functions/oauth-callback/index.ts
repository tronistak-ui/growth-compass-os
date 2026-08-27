// supabase/functions/oauth-callback/index.ts
//
// Step 2 of the Presence "Connect" flow. This is the redirect_uri registered
// directly with each provider, so it's hit by the client's own browser as a
// plain top-level GET — there is no Authorization header to check. All trust
// comes from verifying the signed `state` that oauth-start minted (proves the
// request traces back to an org the caller actually belongs to) plus the
// `code` only being exchangeable once, server-side, with our client secret.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided),
// OAUTH_STATE_SECRET, TOKEN_ENCRYPTION_KEY, APP_BASE_URL (e.g.
// http://localhost:8080 in dev, the deployed app origin in prod), plus the
// per-provider client id/secret/redirect url (GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URL for now).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyState } from "../_shared/oauth-state.ts";
import { encryptToken } from "../_shared/token-crypto.ts";
import { handleCors, withCors } from "../_shared/cors.ts";

type ExchangeResult = {
  // A single OAuth transaction can produce more than one connection — Meta
  // is one flow that yields a `facebook` row and, if the Page has one
  // linked, an `instagram` row too, both carrying the same Page access
  // token (that's how the Instagram Graph API is authenticated once you go
  // through a Facebook Page rather than a standalone IG login).
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  external_account_id?: string;
  external_account_name?: string;
};

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  return withCors(await handleOauthCallback(req));
});

async function handleOauthCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "";

  function redirectToApp(status: "connected" | "error", provider?: string, message?: string) {
    const dest = new URL("/presence", appBaseUrl || url.origin);
    dest.searchParams.set("connect_status", status);
    if (provider) dest.searchParams.set("provider", provider);
    if (message) dest.searchParams.set("connect_message", message);
    return Response.redirect(dest.toString(), 302);
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    return redirectToApp("error", undefined, providerError);
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam) {
    return redirectToApp("error", undefined, "Missing code or state");
  }

  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET");
  const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!stateSecret || !encryptionKey) {
    return redirectToApp("error", undefined, "Server is not configured for OAuth connect");
  }

  const state = await verifyState(stateParam, stateSecret);
  if (!state) {
    return redirectToApp("error", undefined, "Invalid or expired connect request — please retry");
  }

  let exchanges: ExchangeResult[];
  try {
    exchanges = await exchangeCode(state.provider, code);
  } catch (e) {
    return redirectToApp("error", state.provider, e instanceof Error ? e.message : "Token exchange failed");
  }
  if (exchanges.length === 0) {
    return redirectToApp(
      "error",
      state.provider,
      "Connected, but found no linked account to save (e.g. no Facebook Page)",
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  for (const exchange of exchanges) {
    const encryptedAccess = await encryptToken(exchange.access_token, encryptionKey);
    const encryptedRefresh = exchange.refresh_token
      ? await encryptToken(exchange.refresh_token, encryptionKey)
      : null;
    const expiresAt = exchange.expires_in
      ? new Date(Date.now() + exchange.expires_in * 1000).toISOString()
      : null;

    const { error: upsertErr } = await admin
      .from("social_connections")
      .upsert(
        {
          organization_id: state.org_id,
          provider: exchange.provider,
          status: "connected",
          external_account_id: exchange.external_account_id ?? null,
          external_account_name: exchange.external_account_name ?? null,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          token_expires_at: expiresAt,
          scopes: [],
          last_error: null,
        },
        { onConflict: "organization_id,provider" },
      );

    if (upsertErr) {
      return redirectToApp("error", exchange.provider, upsertErr.message);
    }
  }

  return redirectToApp("connected", state.provider);
}

async function exchangeCode(provider: string, code: string): Promise<ExchangeResult[]> {
  if (provider === "google_business") {
    return [await exchangeGoogleCode(code)];
  }
  if (provider === "facebook") {
    return exchangeMetaCode(code);
  }
  throw new Error(`No token exchange implemented for ${provider}`);
}

async function exchangeGoogleCode(code: string): Promise<ExchangeResult> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUrl = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URL");
  if (!clientId || !clientSecret || !redirectUrl) {
    throw new Error("Google OAuth is not configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUrl,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
  }
  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  // Best-effort: name the connection after the Business Profile account so
  // it reads sensibly in the UI. Never fail the connect over this — worst
  // case external_account_name stays null and sync-presence resolves it.
  let external_account_id: string | undefined;
  let external_account_name: string | undefined;
  try {
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (accountsRes.ok) {
      const accounts = (await accountsRes.json()) as {
        accounts?: { name?: string; accountName?: string }[];
      };
      const first = accounts.accounts?.[0];
      external_account_id = first?.name;
      external_account_name = first?.accountName;
    }
  } catch {
    // ignore — non-fatal
  }

  return {
    provider: "google_business",
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_in: token.expires_in,
    external_account_id,
    external_account_name,
  };
}

async function exchangeMetaCode(code: string): Promise<ExchangeResult[]> {
  const clientId = Deno.env.get("META_APP_ID");
  const clientSecret = Deno.env.get("META_APP_SECRET");
  const redirectUrl = Deno.env.get("META_OAUTH_REDIRECT_URL");
  if (!clientId || !clientSecret || !redirectUrl) {
    throw new Error("Meta OAuth is not configured");
  }

  // 1. Short-lived user token.
  const shortRes = await fetch(
    "https://graph.facebook.com/v21.0/oauth/access_token?" +
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
        code,
      }).toString(),
  );
  if (!shortRes.ok) throw new Error(`Meta token exchange failed: ${await shortRes.text()}`);
  const shortToken = (await shortRes.json()) as { access_token: string };

  // 2. Exchange for a long-lived (~60 day) user token — page tokens minted
  // from this are effectively non-expiring in practice, so this is the one
  // token-refresh step Meta needs (unlike Google there's no refresh_token).
  const longRes = await fetch(
    "https://graph.facebook.com/v21.0/oauth/access_token?" +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortToken.access_token,
      }).toString(),
  );
  if (!longRes.ok) throw new Error(`Meta long-lived token exchange failed: ${await longRes.text()}`);
  const longToken = (await longRes.json()) as { access_token: string; expires_in?: number };

  // 3. The Pages this user administers, each with its own (effectively
  // permanent) Page access token and, if set up, a linked IG Business
  // account id. MVP simplification: if the user administers more than one
  // Page, we take the first — a Page picker is a later UI improvement, not
  // a blocker for proving the connect flow.
  const pagesRes = await fetch(
    "https://graph.facebook.com/v21.0/me/accounts?" +
      new URLSearchParams({
        fields: "id,name,access_token,instagram_business_account",
        access_token: longToken.access_token,
      }).toString(),
  );
  if (!pagesRes.ok) throw new Error(`Failed to list Facebook Pages: ${await pagesRes.text()}`);
  const pagesBody = (await pagesRes.json()) as {
    data?: {
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }[];
  };
  const page = pagesBody.data?.[0];
  if (!page) return [];

  const results: ExchangeResult[] = [
    {
      provider: "facebook",
      access_token: page.access_token,
      expires_in: longToken.expires_in,
      external_account_id: page.id,
      external_account_name: page.name,
    },
  ];

  if (page.instagram_business_account) {
    // Best-effort: name the IG connection after the actual @handle. Never
    // fail the whole connect over this — worst case the name stays null.
    let igName: string | undefined;
    try {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.instagram_business_account.id}` +
          `?fields=username&access_token=${page.access_token}`,
      );
      if (igRes.ok) {
        const igBody = (await igRes.json()) as { username?: string };
        igName = igBody.username ? `@${igBody.username}` : undefined;
      }
    } catch {
      // ignore — non-fatal
    }

    results.push({
      provider: "instagram",
      access_token: page.access_token,
      expires_in: longToken.expires_in,
      external_account_id: page.instagram_business_account.id,
      external_account_name: igName ?? page.name,
    });
  }

  return results;
}
