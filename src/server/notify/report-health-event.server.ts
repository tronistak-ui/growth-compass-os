// Ported from the `fan_out_health_event` DB trigger
// (supabase/migrations/20260822081321_*.sql) — moved to app-layer per the
// Phase 1 decision, since it depended on pg_net (Supabase-only) to call the
// system-health-alert edge function. Now it's a plain function call: insert
// the event, fan out in-app notifications to platform_admin/support, and —
// for error/critical severities — send the alert email via Mailpit.
import { db } from "@/db/client";
import { systemHealthEvents, notifications, userRoles } from "@/db/schema";
import { toWireRow } from "../wire";
import { sendHealthAlertEmail } from "./health-alert.server";

export type ReportHealthEventInput = {
  severity?: "info" | "warning" | "error" | "critical" | undefined;
  source: string;
  event_type: string;
  message: string;
  detail?: Record<string, unknown> | undefined;
  organizationId?: string | null | undefined;
};

const ALLOWED_SEVERITY = new Set(["info", "warning", "error", "critical"]);

export async function reportHealthEventInternal(input: ReportHealthEventInput) {
  const severity = ALLOWED_SEVERITY.has(input.severity ?? "") ? input.severity! : "warning";

  const [event] = await db
    .insert(systemHealthEvents)
    .values({
      severity,
      source: input.source,
      eventType: input.event_type,
      message: input.message.slice(0, 2000),
      detail: input.detail ?? {},
      organizationId: input.organizationId ?? null,
    })
    .returning();
  if (!event) throw new Error("Failed to record health event");

  // platform_admin or support — same audience as the source trigger's fan-out.
  const roleRows = await db
    .select({ userId: userRoles.userId, role: userRoles.role })
    .from(userRoles);
  const recipientIds = [
    ...new Set(
      roleRows.filter((r) => r.role === "platform_admin" || r.role === "support").map((r) => r.userId),
    ),
  ];

  if (recipientIds.length > 0) {
    await db.insert(notifications).values(
      recipientIds.map((userId) => ({
        userId,
        type: "system_health",
        title: `[${severity.toUpperCase()}] ${input.source}`,
        body: input.message,
        healthEventId: event.id,
      })),
    );
  }

  if (severity === "error" || severity === "critical") {
    try {
      await sendHealthAlertEmail({
        id: event.id,
        severity,
        source: input.source,
        event_type: input.event_type,
        message: input.message,
        detail: input.detail,
      });
    } catch (e) {
      // Never fail the health-event write over an email delivery problem.
      console.error("[health-alert] failed to send email:", e);
    }
  }

  return toWireRow(systemHealthEvents, event);
}
