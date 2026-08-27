ALTER TABLE "organizations" ADD COLUMN "billing_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "next_payment_due_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_billing_status_check" CHECK ("organizations"."billing_status" IN ('active','overdue','suspended'));