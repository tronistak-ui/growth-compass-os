import { pgTable, uuid, text, numeric, boolean, timestamp, unique, check, index } from "drizzle-orm/pg-core";
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
    goals: text("goals").array().default(sql`'{}'::text[]`),
    acquisitionChannels: text("acquisition_channels").array().default(sql`'{}'::text[]`),
    onboardingStatus: text("onboarding_status").notNull().default("not_started"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "organizations_onboarding_status_check",
      sql`${table.onboardingStatus} IN ('not_started','onboarding','audit','system_setup','optimization','completed')`,
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
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("organization_members_org_user_unique").on(table.organizationId, table.userId),
    index("idx_members_user").on(table.userId),
  ],
);
