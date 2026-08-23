// Ported from supabase/functions/system-health-alert/index.ts. Originally
// triggered via a DB trigger + pg_net HTTP call to a separate edge function;
// now it's just a function called directly from reportHealthEventInternal
// (see server/functions/health.ts) — no HTTP hop, no shared secret, since
// everything runs in one Node process.
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users, userRoles } from "@/db/schema";
import { sendMail } from "./mailer.server";

export async function sendHealthAlertEmail(payload: {
  id: string;
  severity: string;
  source: string;
  event_type: string;
  message: string;
  detail?: Record<string, unknown> | undefined;
}): Promise<void> {
  const roleRows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(inArray(userRoles.role, ["platform_admin", "support"]));
  const userIds = [...new Set(roleRows.map((r) => r.userId))];
  if (userIds.length === 0) return;

  const recipients = await db.select({ email: users.email }).from(users).where(inArray(users.id, userIds));
  const emails = recipients.map((r) => r.email).filter(Boolean);
  if (emails.length === 0) return;

  const subject = `[${payload.severity.toUpperCase()}] ${payload.source}: ${payload.event_type}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto;">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
        System health alert · ${payload.severity.toUpperCase()}
      </p>
      <h2 style="margin:0 0 12px;">${payload.source} — ${payload.event_type}</h2>
      <p style="color:#111827;">${payload.message}</p>
      ${
        payload.detail && Object.keys(payload.detail).length
          ? `<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${JSON.stringify(payload.detail, null, 2)}</pre>`
          : ""
      }
      <p style="margin-top:16px;font-size:12px;color:#6b7280;">Event id: ${payload.id}</p>
    </div>`;

  await sendMail({ to: emails, subject, html });
}
