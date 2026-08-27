import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { hasAnyRole } from "../authz.server";
import { toWireRows } from "../wire";
import { systemHealthEvents, notifications } from "@/db/schema";
import { reportHealthEventInternal } from "../notify/report-health-event.server";

async function requireAdminOrSupport(userId: string) {
  if (!(await hasAnyRole(userId, ["platform_admin", "support"]))) {
    throw new Error("Not authorized");
  }
}

const listHealthEventsInput = z.object({ onlyUnresolved: z.boolean().default(true) });

export const listHealthEvents = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => listHealthEventsInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    const rows = await db
      .select()
      .from(systemHealthEvents)
      .where(data.onlyUnresolved ? eq(systemHealthEvents.resolved, false) : undefined)
      .orderBy(desc(systemHealthEvents.createdAt))
      .limit(100);
    return toWireRows(systemHealthEvents, rows);
  });

const resolveHealthEventInput = z.object({ id: z.string().uuid() });

export const resolveHealthEvent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => resolveHealthEventInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    await db
      .update(systemHealthEvents)
      .set({ resolved: true, resolvedBy: context.userId, resolvedAt: new Date() })
      .where(eq(systemHealthEvents.id, data.id));
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, context.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return toWireRows(notifications, rows);
  });

const markNotificationReadInput = z.object({ id: z.string().uuid() });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => markNotificationReadInput.parse(input))
  .handler(async ({ data, context }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, data.id), eq(notifications.userId, context.userId)));
    return { ok: true };
  });

const reportHealthEventInput = z.object({
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  source: z.string().min(1),
  event_type: z.string().min(1),
  message: z.string().min(1),
  detail: z.record(z.string(), z.unknown()).optional(),
  organization_id: z.string().uuid().optional(),
});

/**
 * Mirrors log-health-event: lets any authenticated client report a health
 * event (an auth failure it hit, a background sync that failed client-side,
 * etc). Originally routed through a dedicated edge function since regular
 * users had no INSERT grant on system_health_events under RLS — with RLS
 * gone, `requireAuth` is enough; this stays a distinct server function to
 * keep the client-facing contract identical (and to run the same fan-out).
 */
export const reportHealthEvent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => reportHealthEventInput.parse(input))
  .handler(async ({ data, context }) => {
    return reportHealthEventInternal({
      severity: data.severity,
      source: data.source,
      event_type: data.event_type,
      message: data.message,
      detail: { ...data.detail, reported_by: context.userId },
      organizationId: data.organization_id ?? null,
    });
  });
