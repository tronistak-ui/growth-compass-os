import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

// All tables below mirror supabase/migrations/20260822072307_*.sql's
// "business tables" section. Each one is organization-scoped and originally
// carried a generated `idx_<table>_org (organization_id)` index and a
// `set_updated_at_<table>` trigger (see the migration's DO $$ loop) — the
// trigger is recreated in a custom Drizzle migration, not here.

export const customerSegments = pgTable(
  "customer_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    ageRange: text("age_range"),
    location: text("location"),
    interests: text("interests"),
    problems: text("problems"),
    goals: text("goals"),
    buyingTriggers: text("buying_triggers"),
    objections: text("objections"),
    preferredChannels: text("preferred_channels").array().default(sql`'{}'::text[]`),
    customerValue: numeric("customer_value", { precision: 12, scale: 2 }),
    buyingFrequency: text("buying_frequency"),
    offer: text("offer"),
    priority: text("priority").default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_customer_segments_org").on(table.organizationId)],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    segmentId: uuid("segment_id").references(() => customerSegments.id, { onDelete: "set null" }),
    price: numeric("price", { precision: 12, scale: 2 }).default("0"),
    cost: numeric("cost", { precision: 12, scale: 2 }).default("0"),
    cta: text("cta"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_offers_org").on(table.organizationId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("instagram"),
    targetAudience: text("target_audience"),
    budget: numeric("budget", { precision: 12, scale: 2 }).default("0"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_campaigns_org").on(table.organizationId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    source: text("source"),
    segmentId: uuid("segment_id").references(() => customerSegments.id, { onDelete: "set null" }),
    customerSince: date("customer_since").defaultNow(),
    tags: text("tags").array().default(sql`'{}'::text[]`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_customers_org").on(table.organizationId)],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    source: text("source").default("instagram"),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    status: text("status").notNull().default("new"),
    value: numeric("value", { precision: 12, scale: 2 }).default("0"),
    lastContact: date("last_contact"),
    nextFollowUp: date("next_follow_up"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_leads_org").on(table.organizationId),
    index("idx_leads_status").on(table.organizationId, table.status),
  ],
);

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("note"),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_interactions_org").on(table.organizationId)],
);

export const revenueTransactions = pgTable(
  "revenue_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    occurredOn: date("occurred_on").notNull().defaultNow(),
    productService: text("product_service"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    source: text("source"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_revenue_transactions_org").on(table.organizationId),
    index("idx_rev_date").on(table.organizationId, table.occurredOn),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    occurredOn: date("occurred_on").notNull().defaultNow(),
    category: text("category").notNull().default("other"),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_expenses_org").on(table.organizationId),
    index("idx_exp_date").on(table.organizationId, table.occurredOn),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    module: text("module").notNull().default("dashboard"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("todo"),
    dueDate: date("due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_tasks_org").on(table.organizationId)],
);

export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    website: text("website"),
    positioning: text("positioning"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    opportunity: text("opportunity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_competitors_org").on(table.organizationId)],
);

export const conversionAssets = pgTable(
  "conversion_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("website"),
    status: text("status").notNull().default("missing"),
    url: text("url"),
    conversionGoal: text("conversion_goal"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_conversion_assets_org").on(table.organizationId)],
);

export const funnelSnapshots = pgTable(
  "funnel_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    periodMonth: date("period_month")
      .notNull()
      .default(sql`date_trunc('month', CURRENT_DATE)::date`),
    visitors: integer("visitors").notNull().default(0),
    leads: integer("leads").notNull().default(0),
    qualifiedLeads: integer("qualified_leads").notNull().default(0),
    customers: integer("customers").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_funnel_snapshots_org").on(table.organizationId),
    unique("funnel_snapshots_org_period_unique").on(table.organizationId, table.periodMonth),
  ],
);

export const growthOpportunities = pgTable(
  "growth_opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    lever: text("lever").notNull().default("new_customers"),
    currentValue: text("current_value"),
    targetValue: text("target_value"),
    recommendedAction: text("recommended_action"),
    status: text("status").notNull().default("not_started"),
    // Added in 20260822073114_*.sql for deterministic auto-generated opportunities.
    source: text("source").notNull().default("manual"),
    insightKey: text("insight_key"),
    impact: integer("impact").notNull().default(0),
    module: text("module"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_growth_opportunities_org").on(table.organizationId),
    // Plain (non-partial) unique index — matches the 20260822073410_*.sql fixup
    // that dropped the original `WHERE insight_key IS NOT NULL` filter so
    // upserts can infer the conflict target.
    unique("growth_opportunities_auto_key").on(table.organizationId, table.insightKey),
  ],
);

export const presenceProfiles = pgTable("presence_profiles", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  websiteUrl: text("website_url"),
  websiteStatus: text("website_status").default("missing"),
  websiteMobileReady: boolean("website_mobile_ready").default(false),
  websiteHasCta: boolean("website_has_cta").default(false),
  websiteHasContact: boolean("website_has_contact").default(false),
  googleProfileClaimed: boolean("google_profile_claimed").default(false),
  googleCategory: text("google_category"),
  googleAddress: text("google_address"),
  googlePhone: text("google_phone"),
  googleHours: text("google_hours"),
  googleReviews: integer("google_reviews").default(0),
  googleRating: numeric("google_rating", { precision: 2, scale: 1 }).default("0"),
  googleWebsiteLinked: boolean("google_website_linked").default(false),
  instagramUrl: text("instagram_url"),
  instagramBio: text("instagram_bio"),
  instagramHasCta: boolean("instagram_has_cta").default(false),
  instagramLink: boolean("instagram_link").default(false),
  instagramContact: boolean("instagram_contact").default(false),
  // Added in 20260822170000_presence_instagram_followers.sql
  instagramFollowers: integer("instagram_followers").default(0),
  whatsappBusiness: boolean("whatsapp_business").default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappCta: boolean("whatsapp_cta").default(false),
  whatsappCatalogue: boolean("whatsapp_catalogue").default(false),
  consistentName: boolean("consistent_name").default(false),
  consistentPhone: boolean("consistent_phone").default(false),
  consistentAddress: boolean("consistent_address").default(false),
  consistentWebsite: boolean("consistent_website").default(false),
  consistentDescription: boolean("consistent_description").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const positioning = pgTable("positioning", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  targetCustomer: text("target_customer"),
  problem: text("problem"),
  valueProposition: text("value_proposition"),
  differentiator: text("differentiator"),
  brandPromise: text("brand_promise"),
  proof: text("proof"),
  messaging: text("messaging"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
