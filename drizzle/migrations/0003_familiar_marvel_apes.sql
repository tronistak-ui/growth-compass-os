ALTER TABLE "leads" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_external_id_unique" UNIQUE("organization_id","external_id");