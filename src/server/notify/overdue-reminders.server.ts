// Daily "you have overdue items" nudge for business owners — reuses the
// notifications table and bell UI that already existed but, until now, only
// ever got written to for platform_admin/support (system health events).
// Same shape as presence-sync.server.ts and weekly-digest.server.ts: one
// plain function, called by cron once a day, per org.
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, organizationMembers, leads, tasks, notifications } from "@/db/schema";
import { todayInBusinessTimezone, startOfTodayInBusinessTimezone } from "@/lib/date";

export async function createOverdueReminders(): Promise<{ created: number }> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  const today = todayInBusinessTimezone();
  let created = 0;

  for (const org of orgs) {
    const [overdueLeads] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        and(
          eq(leads.organizationId, org.id),
          lte(leads.nextFollowUp, today),
          ne(leads.status, "won"),
          ne(leads.status, "lost"),
        ),
      );
    const [overdueTasks] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.organizationId, org.id), lte(tasks.dueDate, today), ne(tasks.status, "done")));

    const leadCount = overdueLeads?.count ?? 0;
    const taskCount = overdueTasks?.count ?? 0;
    if (leadCount === 0 && taskCount === 0) continue;

    const parts: string[] = [];
    if (leadCount > 0) parts.push(`${leadCount} follow-up${leadCount === 1 ? "" : "s"}`);
    if (taskCount > 0) parts.push(`${taskCount} task${taskCount === 1 ? "" : "s"}`);
    const title = `${parts.join(" and ")} overdue`;
    const link = leadCount > 0 ? "/leads" : "/tasks";
    const body = leadCount > 0 ? "Check Leads for who's waiting on you." : "Check Tasks for what's due.";

    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, org.id));

    const startOfDay = startOfTodayInBusinessTimezone();

    for (const m of members) {
      // At most one reminder per user per day — a fresh cron run (or a
      // manual retrigger) shouldn't pile up duplicates for the same day.
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, m.userId),
            eq(notifications.type, "overdue_reminder"),
            gte(notifications.createdAt, startOfDay),
          ),
        )
        .limit(1);
      if (existing) continue;

      await db.insert(notifications).values({ userId: m.userId, type: "overdue_reminder", title, body, link });
      created++;
    }
  }

  return { created };
}
