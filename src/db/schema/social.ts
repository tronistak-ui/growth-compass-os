import { pgTable, pgView, uuid, text, timestamp, unique, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

// supabase/migrations/20260822150000_social_connections.sql +
// 20260822170000_presence_instagram_followers.sql (no columns added here).
export const socialConnections = pgTable(
  "social_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("connected"),
    externalAccountId: text("external_account_id"),
    externalAccountName: text("external_account_name"),
    // Encrypted at rest by the app layer (AES-GCM) — never store plaintext.
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("social_connections_org_provider_unique").on(table.organizationId, table.provider),
    index("idx_social_connections_org").on(table.organizationId),
    check(
      "social_connections_provider_check",
      sql`${table.provider} IN ('instagram','facebook','google_business','whatsapp')`,
    ),
    check(
      "social_connections_status_check",
      sql`${table.status} IN ('connected','error','disconnected')`,
    ),
  ],
);

export type SocialConnection = typeof socialConnections.$inferSelect;

// Token-free read surface — mirrors the Supabase view of the same name.
// Query layer code should read connection status through this view rather
// than selecting straight from social_connections, so a stray `select *`
// can never leak an access/refresh token.
export const socialConnectionsPublic = pgView("social_connections_public").as((qb) =>
  qb
    .select({
      id: socialConnections.id,
      organizationId: socialConnections.organizationId,
      provider: socialConnections.provider,
      status: socialConnections.status,
      externalAccountName: socialConnections.externalAccountName,
      lastSyncedAt: socialConnections.lastSyncedAt,
      lastError: socialConnections.lastError,
      createdAt: socialConnections.createdAt,
    })
    .from(socialConnections),
);
