// Provider-specific OAuth logic — ported from supabase/functions/oauth-start
// and supabase/functions/oauth-callback, then reworked for Instagram: the
// original design assumed one Meta app covering Facebook Login + deriving
// Instagram access through a linked Page (see git history for that version).
// In practice Instagram Business Login and Facebook Login turned out not to
// be addable to the same Meta app, and presence_profiles never had a
// Facebook-specific field to sync into anyway (the Page connection only
// ever existed to reach Instagram) — so Facebook Login was dropped entirely
// and Instagram now authenticates directly via Meta's newer "Instagram API
// with Instagram Login" product, its own dedicated app/credentials, no Page
// involved. whatsapp is deferred — Embedded Signup needs a Meta payment
// method even for the free test tier, out of scope for now.
export const SUPPORTED_PROVIDERS = new Set(["google_business", "instagram"]);

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/business.manage"];

// Least-privilege for presence sync (profile info + follower count) — the
// app also has instagram_business_manage_comments/_messages available for
// its messaging use case, neither of which we need here.
const INSTAGRAM_SCOPES = ["instagram_business_basic"];

export function buildAuthorizeUrl(provider: string, state: string): string | null {
  if (provider === "google_business") {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    const redirectUrl = process.env["GOOGLE_OAUTH_REDIRECT_URL"];
    if (!clientId || !redirectUrl) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  if (provider === "instagram") {
    const clientId = process.env["INSTAGRAM_APP_ID"];
    const redirectUrl = process.env["INSTAGRAM_OAUTH_REDIRECT_URL"];
    if (!clientId || !redirectUrl) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: INSTAGRAM_SCOPES.join(","),
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }
  return null;
}

export type ExchangeResult = {
  provider: string;
  access_token: string;
  refresh_token?: string | undefined;
  expires_in?: number | undefined;
  external_account_id?: string | undefined;
  external_account_name?: string | undefined;
};

export async function exchangeCode(provider: string, code: string): Promise<ExchangeResult[]> {
  if (provider === "google_business") return [await exchangeGoogleCode(code)];
  if (provider === "instagram") return [await exchangeInstagramCode(code)];
  throw new Error(`No token exchange implemented for ${provider}`);
}

async function exchangeGoogleCode(code: string): Promise<ExchangeResult> {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const redirectUrl = process.env["GOOGLE_OAUTH_REDIRECT_URL"];
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
  // case external_account_name stays null and sync resolves it.
  let external_account_id: string | undefined;
  let external_account_name: string | undefined;
  try {
    const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
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

async function exchangeInstagramCode(code: string): Promise<ExchangeResult> {
  const clientId = process.env["INSTAGRAM_APP_ID"];
  const clientSecret = process.env["INSTAGRAM_APP_SECRET"];
  const redirectUrl = process.env["INSTAGRAM_OAUTH_REDIRECT_URL"];
  if (!clientId || !clientSecret || !redirectUrl) {
    throw new Error("Instagram OAuth is not configured");
  }

  // 1. Short-lived token (~1hr). Instagram Login's token endpoint has
  // changed response shape across API revisions — accept either the flat
  // {access_token,user_id} form or the newer {data:[{access_token,user_id}]}
  // form rather than assuming one.
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUrl,
      code,
    }),
  });
  if (!shortRes.ok) throw new Error(`Instagram token exchange failed: ${await shortRes.text()}`);
  const shortBody = (await shortRes.json()) as {
    access_token?: string;
    user_id?: string;
    data?: { access_token: string; user_id: string; permissions?: string }[];
  };
  const shortToken = shortBody.data?.[0] ?? shortBody;
  if (!shortToken.access_token) throw new Error("Instagram token exchange returned no access token");

  // 2. Exchange for a long-lived (~60 day) token — Instagram Login has no
  // refresh_token; refreshInstagramToken() below is the renewal path
  // instead, same shape as Meta's fb_exchange_token dance used to be.
  const longRes = await fetch(
    "https://graph.instagram.com/access_token?" +
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: clientSecret,
        access_token: shortToken.access_token,
      }).toString(),
  );
  if (!longRes.ok) throw new Error(`Instagram long-lived token exchange failed: ${await longRes.text()}`);
  const longToken = (await longRes.json()) as { access_token: string; expires_in?: number };

  // Best-effort: name the connection after the @handle. Never fail the
  // connect over this — worst case external_account_name stays null.
  let external_account_name: string | undefined;
  try {
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=username&access_token=${longToken.access_token}`,
    );
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { username?: string };
      external_account_name = profile.username ? `@${profile.username}` : undefined;
    }
  } catch {
    // ignore — non-fatal
  }

  return {
    provider: "instagram",
    access_token: longToken.access_token,
    expires_in: longToken.expires_in,
    external_account_id: shortToken.user_id,
    external_account_name,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env["GOOGLE_CLIENT_ID"]!;
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"]!;
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

/**
 * Instagram Login's long-lived tokens (~60 days) have no separate refresh
 * token — you renew the same token in place, and it must be at least 24h
 * old and not yet expired for this call to succeed.
 */
export async function refreshInstagramToken(accessToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    "https://graph.instagram.com/refresh_access_token?" +
      new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken }).toString(),
  );
  if (!res.ok) throw new Error(`Instagram token refresh failed: ${await res.text()}`);
  return await res.json();
}
