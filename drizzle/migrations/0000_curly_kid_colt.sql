CREATE TYPE "public"."app_role" AS ENUM('platform_admin', 'business_owner', 'support', 'auditor');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'business_owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_unique" UNIQUE("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_org_user_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"niche" text,
	"industry" text,
	"location" text,
	"target_location" text,
	"website" text,
	"instagram" text,
	"facebook" text,
	"whatsapp" text,
	"google_profile" text,
	"phone" text,
	"email" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"products_services" text,
	"main_offers" text,
	"main_customer_type" text,
	"avg_order_value" numeric(12, 2) DEFAULT '0',
	"monthly_revenue_range" text,
	"main_goal" text,
	"goals" text[] DEFAULT '{}'::text[],
	"acquisition_channels" text[] DEFAULT '{}'::text[],
	"onboarding_status" text DEFAULT 'not_started' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_onboarding_status_check" CHECK ("organizations"."onboarding_status" IN ('not_started','onboarding','audit','system_setup','optimization','completed'))
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"offer_id" uuid,
	"channel" text DEFAULT 'instagram' NOT NULL,
	"target_audience" text,
	"budget" numeric(12, 2) DEFAULT '0',
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"positioning" text,
	"strengths" text,
	"weaknesses" text,
	"opportunity" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'missing' NOT NULL,
	"url" text,
	"conversion_goal" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"age_range" text,
	"location" text,
	"interests" text,
	"problems" text,
	"goals" text,
	"buying_triggers" text,
	"objections" text,
	"preferred_channels" text[] DEFAULT '{}'::text[],
	"customer_value" numeric(12, 2),
	"buying_frequency" text,
	"offer" text,
	"priority" text DEFAULT 'medium',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"source" text,
	"segment_id" uuid,
	"customer_since" date DEFAULT now(),
	"tags" text[] DEFAULT '{}'::text[],
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"occurred_on" date DEFAULT now() NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"period_month" date DEFAULT date_trunc('month', CURRENT_DATE)::date NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"qualified_leads" integer DEFAULT 0 NOT NULL,
	"customers" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_snapshots_org_period_unique" UNIQUE("organization_id","period_month")
);
--> statement-breakpoint
CREATE TABLE "growth_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"lever" text DEFAULT 'new_customers' NOT NULL,
	"current_value" text,
	"target_value" text,
	"recommended_action" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"insight_key" text,
	"impact" integer DEFAULT 0 NOT NULL,
	"module" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "growth_opportunities_auto_key" UNIQUE("organization_id","insight_key")
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid,
	"customer_id" uuid,
	"type" text DEFAULT 'note' NOT NULL,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"source" text DEFAULT 'instagram',
	"campaign_id" uuid,
	"offer_id" uuid,
	"customer_id" uuid,
	"status" text DEFAULT 'new' NOT NULL,
	"value" numeric(12, 2) DEFAULT '0',
	"last_contact" date,
	"next_follow_up" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"segment_id" uuid,
	"price" numeric(12, 2) DEFAULT '0',
	"cost" numeric(12, 2) DEFAULT '0',
	"cta" text,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positioning" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"target_customer" text,
	"problem" text,
	"value_proposition" text,
	"differentiator" text,
	"brand_promise" text,
	"proof" text,
	"messaging" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presence_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"website_url" text,
	"website_status" text DEFAULT 'missing',
	"website_mobile_ready" boolean DEFAULT false,
	"website_has_cta" boolean DEFAULT false,
	"website_has_contact" boolean DEFAULT false,
	"google_profile_claimed" boolean DEFAULT false,
	"google_category" text,
	"google_address" text,
	"google_phone" text,
	"google_hours" text,
	"google_reviews" integer DEFAULT 0,
	"google_rating" numeric(2, 1) DEFAULT '0',
	"google_website_linked" boolean DEFAULT false,
	"instagram_url" text,
	"instagram_bio" text,
	"instagram_has_cta" boolean DEFAULT false,
	"instagram_link" boolean DEFAULT false,
	"instagram_contact" boolean DEFAULT false,
	"instagram_followers" integer DEFAULT 0,
	"whatsapp_business" boolean DEFAULT false,
	"whatsapp_number" text,
	"whatsapp_cta" boolean DEFAULT false,
	"whatsapp_catalogue" boolean DEFAULT false,
	"consistent_name" boolean DEFAULT false,
	"consistent_phone" boolean DEFAULT false,
	"consistent_address" boolean DEFAULT false,
	"consistent_website" boolean DEFAULT false,
	"consistent_description" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid,
	"offer_id" uuid,
	"campaign_id" uuid,
	"occurred_on" date DEFAULT now() NOT NULL,
	"product_service" text,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"module" text DEFAULT 'dashboard' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text DEFAULT 'system_health' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"health_event_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_health_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"organization_id" uuid,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_health_events_severity_check" CHECK ("system_health_events"."severity" IN ('info','warning','error','critical'))
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"external_account_id" text,
	"external_account_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_connections_org_provider_unique" UNIQUE("organization_id","provider"),
	CONSTRAINT "social_connections_provider_check" CHECK ("social_connections"."provider" IN ('instagram','facebook','google_business','whatsapp')),
	CONSTRAINT "social_connections_status_check" CHECK ("social_connections"."status" IN ('connected','error','disconnected'))
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_assets" ADD CONSTRAINT "conversion_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_snapshots" ADD CONSTRAINT "funnel_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_opportunities" ADD CONSTRAINT "growth_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning" ADD CONSTRAINT "positioning_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_profiles" ADD CONSTRAINT "presence_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_health_event_id_system_health_events_id_fk" FOREIGN KEY ("health_event_id") REFERENCES "public"."system_health_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_health_events" ADD CONSTRAINT "system_health_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_health_events" ADD CONSTRAINT "system_health_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_members_user" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_campaigns_org" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_competitors_org" ON "competitors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_conversion_assets_org" ON "conversion_assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_customer_segments_org" ON "customer_segments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_customers_org" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_org" ON "expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exp_date" ON "expenses" USING btree ("organization_id","occurred_on");--> statement-breakpoint
CREATE INDEX "idx_funnel_snapshots_org" ON "funnel_snapshots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_growth_opportunities_org" ON "growth_opportunities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_org" ON "interactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_leads_org" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_offers_org" ON "offers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_transactions_org" ON "revenue_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_rev_date" ON "revenue_transactions" USING btree ("organization_id","occurred_on");--> statement-breakpoint
CREATE INDEX "idx_tasks_org" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_system_health_events_unresolved" ON "system_health_events" USING btree ("resolved","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_system_health_events_org" ON "system_health_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_social_connections_org" ON "social_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE VIEW "public"."social_connections_public" AS (select "id", "organization_id", "provider", "status", "external_account_name", "last_synced_at", "last_error", "created_at" from "social_connections");