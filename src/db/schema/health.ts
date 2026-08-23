import { pgTable, uuid, text, boolean, jsonb, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql, desc } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";

// supabase/migrations/20260822081321_rbac_health_alerts_onboarding_checklist.sql §2
export const systemHealthEvents = pgTable(
  "system_health_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    severity: text("severity").notNull().default("warning"),
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    detail: jsonb("detail").notNull().default({}),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    resolved: boolean("resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_system_health_events_unresolved").on(table.resolved, desc(table.createdAt)),
    index("idx_system_health_events_org").on(table.organizationId),
    check(
      "system_health_events_severity_check",
      sql`${table.severity} IN ('info','warning','error','critical')`,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("system_health"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    healthEventId: uuid("health_event_id").references(() => systemHealthEvents.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_notifications_user_unread").on(table.userId, table.readAt)],
);
