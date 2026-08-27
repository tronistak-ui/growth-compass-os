import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  unique,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// supabase/migrations/20260822072307_*.sql + 20260822073114_*.sql (onboarding_status check)
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    niche: text("niche"),
    industry: text("industry"),
    location: text("location"),
    targetLocation: text("target_location"),
    website: text("website"),
    instagram: text("instagram"),
    facebook: text("facebook"),
    whatsapp: text("whatsapp"),
    googleProfile: text("google_profile"),
    phone: text("phone"),
    email: text("email"),
    currency: text("currency").notNull().default("USD"),
    productsServices: text("products_services"),
    mainOffers: text("main_offers"),
    mainCustomerType: text("main_customer_type"),
    avgOrderValue: numeric("avg_order_value", { precision: 12, scale: 2 }).default("0"),
    monthlyRevenueRange: text("monthly_revenue_range"),
    mainGoal: text("main_goal"),
    goals: text("goals")
      .array()
      .default(sql`'{}'::text[]`),
    acquisitionChannels: text("acquisition_channels")
      .array()
      .default(sql`'{}'::text[]`),
    onboardingStatus: text("onboarding_status").notNull().default("not_started"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    internalNotes: text("internal_notes"),
    // Manual billing (one-time setup fee + recurring, paid by bank transfer,
    // not through an automated processor) — a platform admin sets this by
    // hand after confirming payment. "overdue" is a soft warning that still
    // allows full access; only "suspended" actually locks the org out, and
    // only for its own owner/members — platform_admin/support always get
    // through, so a suspended client can still be reached and fixed.
    billingStatus: text("billing_status").notNull().default("active"),
    nextPaymentDueDate: date("next_payment_due_date"),
    // One-time-payment activation gate: a hashed code (same pattern as
    // organizationInvites.tokenHash below) generated once when the org is
    // created and shown to the operator a single time — never re-displayable
    // in plaintext. Handed to the client only once the remaining setup fee
    // clears. activatedAt is null (frozen: full read access, no writes — see
    // requireOrgWrite in authz.server.ts) until the correct code is entered,
    // then set once and never cleared — there is no re-locking.
    activationCodeHash: text("activation_code_hash"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "organizations_onboarding_status_check",
      sql`${table.onboardingStatus} IN ('not_started','onboarding','audit','system_setup','optimization','completed')`,
    ),
    check(
      "organizations_billing_status_check",
      sql`${table.billingStatus} IN ('active','overdue','suspended')`,
    ),
  ],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Stored but not enforced anywhere in authz.server.ts — every member row
    // grants identical read/write access regardless of this value. It's a
    // display label ("Owner" vs "Staff" in the Team panel), not a
    // permission tier. A real per-role permission split is a separate,
    // bigger feature this doesn't attempt.
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("organization_members_org_user_unique").on(table.organizationId, table.userId),
    index("idx_members_user").on(table.userId),
  ],
);

// Staff invites — same one-time-hashed-token pattern as
// passwordResetTokens. Only a hash of the token is stored, so a database
// read alone can never produce a usable invite link.
export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("staff"),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invites_org").on(table.organizationId),
    index("idx_invites_email").on(table.email),
  ],
);
