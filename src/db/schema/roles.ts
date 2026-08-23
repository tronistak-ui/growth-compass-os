import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { appRoleEnum } from "./enums";
import { users } from "./users";

// supabase/migrations/20260822072307_*.sql + 20260822081321_*.sql
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull().default("business_owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("user_roles_user_id_role_unique").on(table.userId, table.role)],
);
