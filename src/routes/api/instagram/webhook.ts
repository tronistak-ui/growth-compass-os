// Instagram Messaging webhook — turns an inbound DM into a lead (or, for a
// returning sender, an interaction on their existing lead) without anyone
// re-typing it into the CRM.
//
// Two request types, same as every Meta webhook:
//   GET  — the one-time verification handshake Meta does when you register
//          the URL in the app dashboard (App → Webhooks → Instagram).
//   POST — the actual event delivery. There's no Authorization header (Meta
//          calls this directly, not through a user's browser); trust comes
//          from the X-Hub-Signature-256 HMAC instead, same shape as the
//          OAuth callback trusting a signed `state` rather than a session.
//
// Requires production access to instagram_business_manage_messages via Meta
// App Review — see providers.server.ts. Works against up to 25 test-mode
// accounts before that's approved. INSTAGRAM_WEBHOOK_VERIFY_TOKEN is a value
// you choose yourself and enter into the same dashboard page as the URL.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db/client";
import { leads, interactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { findConnectionByExternalAccountId } from "@/server/db-helpers/social-connections.server";
import { decryptToken } from "@/server/oauth/token-crypto.server";
import type { SocialConnection } from "@/db/schema";

type MessagingEvent = {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
};

type WebhookEntry = { id?: string; messaging?: MessagingEvent[] };

export const Route = createFileRoute("/api/instagram/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env["INSTAGRAM_WEBHOOK_VERIFY_TOKEN"];

        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const rawBody = await request.text();
        if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { entry?: WebhookEntry[] };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        // Always ack fast — a non-200 makes Meta retry the same event.
        // Per-entry failures are logged, not surfaced as a webhook failure.
        await Promise.allSettled(
          (payload.entry ?? []).map((entry) =>
            processEntry(entry).catch((e) => console.error("[instagram webhook] entry failed:", e)),
          ),
        );

        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env["INSTAGRAM_APP_SECRET"];
  if (!secret || !header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  return timingSafeEqual(expectedBuf, headerBuf);
}

async function processEntry(entry: WebhookEntry): Promise<void> {
  if (!entry.id || !entry.messaging?.length) return;

  const conn = await findConnectionByExternalAccountId("instagram", entry.id);
  if (!conn) return; // No org has this Instagram account connected — ignore.

  for (const evt of entry.messaging) {
    // is_echo marks a message this app itself sent — never turn our own
    // reply into a new lead.
    if (evt.message?.is_echo) continue;
    const text = evt.message?.text;
    const senderId = evt.sender?.id;
    if (!text || !senderId) continue;
    await upsertLeadFromMessage(conn, senderId, text);
  }
}

async function upsertLeadFromMessage(conn: SocialConnection, senderId: string, text: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.organizationId, conn.organizationId), eq(leads.externalId, senderId)))
    .limit(1);

  const today = new Date().toISOString().slice(0, 10);

  if (existing) {
    await db.insert(interactions).values({
      organizationId: conn.organizationId,
      leadId: existing.id,
      type: "message",
      summary: text,
    });
    await db.update(leads).set({ lastContact: today }).where(eq(leads.id, existing.id));
    return;
  }

  const name = await fetchSenderName(conn, senderId);
  await db.insert(leads).values({
    organizationId: conn.organizationId,
    name: name ?? `Instagram DM (${senderId.slice(-6)})`,
    source: "instagram",
    status: "new",
    externalId: senderId,
    lastContact: today,
    notes: text,
  });
}

/** Best-effort — a nameless lead is still useful, so this never blocks lead creation. */
async function fetchSenderName(conn: SocialConnection, senderId: string): Promise<string | null> {
  try {
    const accessToken = await decryptToken(conn.accessToken);
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${senderId}?fields=name,username&access_token=${accessToken}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { name?: string; username?: string };
    return body.name ?? (body.username ? `@${body.username}` : null);
  } catch {
    return null;
  }
}
