import { pgEnum } from "drizzle-orm/pg-core";

// Matches supabase/migrations/20260822072307_*.sql + 20260822081320_add_rbac_roles.sql
export const appRoleEnum = pgEnum("app_role", [
  "platform_admin",
  "business_owner",
  "support",
  "auditor",
]);
