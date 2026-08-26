ALTER TABLE "organizations" ADD COLUMN "activation_code_hash" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
-- Backfill: orgs that existed before this gate shipped should not retroactively
-- freeze — only organizations created after this migration start frozen.
UPDATE "organizations" SET "activated_at" = "created_at" WHERE "activated_at" IS NULL;