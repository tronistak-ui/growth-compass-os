import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Replaces Supabase's auth.users + public.profiles (Supabase migration
// 20260822072307_*.sql). Self-hosted auth has no separate managed
// auth.users table, so identity + profile fields live in one place.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// New table (no Supabase equivalent) backing httpOnly session-cookie auth.
// The cookie carries this row's id, HMAC-signed; the row itself is the
// source of truth for expiry/revocation.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
