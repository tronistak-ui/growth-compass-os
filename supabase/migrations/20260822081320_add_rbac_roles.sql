-- Split into its own migration/transaction: PostgreSQL will not allow a
-- newly-added enum value to be referenced until after this transaction
-- commits, so 'support' and 'auditor' must land before the migration that
-- uses them in policies/functions.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
