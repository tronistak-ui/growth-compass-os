// supabase/functions/oauth-callback/index.ts, ported to a plain HTTP server
// route (createFileRoute's `server` handlers) instead of an edge function.
//
// This is the redirect_uri registered directly with each provider, so it's
// hit by the client's own browser as a plain top-level GET — there is no
// Authorization header to check. All trust comes from verifying the signed
// `state` that startOAuth minted (proves the request traces back to an org
// the caller actually belongs to) plus the `code` only being exchangeable
// once, server-side, with our client secret.
import { createFileRoute } from "@tanstack/react-router";
import { verifyState } from "@/server/oauth/oauth-state.server";
import { encryptToken } from "@/server/oauth/token-crypto.server";
import { exchangeCode } from "@/server/oauth/providers.server";
import { upsertConnection } from "@/server/db-helpers/social-connections.server";

export const Route = createFileRoute("/api/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const appBaseUrl = process.env["APP_BASE_URL"] ?? "";

        function redirectToApp(status: "connected" | "error", provider?: string, message?: string) {
          const dest = new URL("/presence", appBaseUrl || url.origin);
          dest.searchParams.set("connect_status", status);
          if (provider) dest.searchParams.set("provider", provider);
          if (message) dest.searchParams.set("connect_message", message);
          return Response.redirect(dest.toString(), 302);
        }

        const providerError = url.searchParams.get("error");
        if (providerError) return redirectToApp("error", undefined, providerError);

        const code = url.searchParams.get("code");
        const stateParam = url.searchParams.get("state");
        if (!code || !stateParam) return redirectToApp("error", undefined, "Missing code or state");

        const state = await verifyState(stateParam);
        if (!state) {
          return redirectToApp("error", undefined, "Invalid or expired connect request — please retry");
        }

        let exchanges;
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

        for (const exchange of exchanges) {
          const encryptedAccess = await encryptToken(exchange.access_token);
          const encryptedRefresh = exchange.refresh_token ? await encryptToken(exchange.refresh_token) : null;
          const expiresAt = exchange.expires_in ? new Date(Date.now() + exchange.expires_in * 1000) : null;

          try {
            await upsertConnection({
              organizationId: state.org_id,
              provider: exchange.provider,
              externalAccountId: exchange.external_account_id ?? null,
              externalAccountName: exchange.external_account_name ?? null,
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              tokenExpiresAt: expiresAt,
            });
          } catch (e) {
            return redirectToApp("error", exchange.provider, e instanceof Error ? e.message : "Save failed");
          }
        }

        return redirectToApp("connected", state.provider);
      },
    },
  },
});
