// supabase/functions/oauth-start/index.ts
//
// Step 1 of the Presence "Connect" flow. Called by the frontend via
// `supabase.functions.invoke("oauth-start", { body: { provider, org_id } })`
// — a normal authenticated fetch, not a browser navigation, so the caller's
// JWT travels in the Authorization header as usual. It returns the
// provider's authorize URL as JSON; the frontend is responsible for the
// actual top-level redirect (`window.location.href = url`), since a plain
// browser navigation can't carry an Authorization header for us to verify
// org membership against.
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// (all auto-provided), OAUTH_STATE_SECRET, GOOGLE_CLIENT_ID,
// GOOGLE_OAUTH_REDIRECT_URL (the exact URL registered with Google for the
// oauth-callback function, e.g. https://<project>.supabase.co/functions/v1/oauth-callback).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { signState } from "../_shared/oauth-state.ts";
import { handleCors, withCors } from "../_shared/cors.ts";

// "facebook" is the entry point for the whole Meta connect flow — one OAuth
// transaction against one Meta app covers both Facebook Pages and any
// Instagram Business account linked to them (oauth-callback creates a
// separate `instagram` connection row too when one exists). There is no
// separate "instagram" entry in this set — you don't start a distinct OAuth
// flow for it. whatsapp lands later, via Embedded Signup instead of this
// plain redirect flow.
const SUPPORTED_PROVIDERS = new Set(["google_business", "facebook"]);

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/business.manage"];

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
  "business_management",
];

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  return withCors(await handleOauthStart(req));
});

async function handleOauthStart(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization header", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET");
  if (!stateSecret) {
    return new Response(JSON.stringify({ error: "OAUTH_STATE_SECRET is not configured" }), {
      status: 500,
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { provider?: string; org_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const provider = body.provider;
  const orgId = body.org_id;
  if (!provider || !orgId) {
    return new Response("provider and org_id are required", { status: 400 });
  }
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return new Response(JSON.stringify({ error: `${provider} is not connectable yet` }), {
      status: 400,
    });
  }

  // Verify the caller actually belongs to this org before we ever hand out a
  // signed state for it — otherwise anyone could connect their own Google
  // account to a business they don't run.
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: membership, error: memberErr } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (memberErr) {
    return new Response(JSON.stringify({ error: memberErr.message }), { status: 500 });
  }
  if (!membership) {
    return new Response("Not a member of this organization", { status: 403 });
  }

  const state = await signState(
    { org_id: orgId, provider, user_id: userData.user.id, nonce: crypto.randomUUID() },
    stateSecret,
  );

  const url = buildAuthorizeUrl(provider, state);
  if (!url) {
    return new Response(JSON.stringify({ error: `No authorize URL builder for ${provider}` }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function buildAuthorizeUrl(provider: string, state: string): string | null {
  if (provider === "google_business") {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUrl = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URL");
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
  if (provider === "facebook") {
    const clientId = Deno.env.get("META_APP_ID");
    const redirectUrl = Deno.env.get("META_OAUTH_REDIRECT_URL");
    if (!clientId || !redirectUrl) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: META_SCOPES.join(","),
      state,
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }
  return null;
}
