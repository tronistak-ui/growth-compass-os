// App-layer replacement for the Supabase RLS helper functions
// (has_role, has_any_role, is_org_member — see
// supabase/migrations/20260822072307_*.sql + 20260822081321_*.sql). Drizzle
// doesn't enforce row-level security, so every server function that touches
// org-scoped data must call one of these explicitly.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationMembers, userRoles } from "@/db/schema";

export type AppRole = "platform_admin" | "business_owner" | "support" | "auditor";

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.role);
}

export async function hasAnyRole(userId: string, roles: AppRole[]): Promise<boolean> {
  if (roles.length === 0) return false;
  const [row] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), inArray(userRoles.role, roles)))
    .limit(1);
  return !!row;
}

async function isDirectMember(userId: string, orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))
    .limit(1);
  return !!row;
}

/** Mirrors is_org_member(): a real membership row, or platform_admin/support/auditor (read access). */
export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  if (await isDirectMember(userId, orgId)) return true;
  return hasAnyRole(userId, ["platform_admin", "support", "auditor"]);
}

/**
 * Write access is narrower than is_org_member(): a real membership row, or
 * platform_admin/support — NOT auditor. The source RLS policies technically
 * let auditor write too (is_org_member() feeds every table's FOR ALL policy,
 * and the RBAC migration widened is_org_member() without narrowing those
 * policies back down) even though its own comment states "auditor is
 * strictly read-only." That looks like a gap in the original policy set
 * rather than intent, so this app-layer check enforces the stated intent
 * instead of reproducing the gap.
 */
export async function isOrgMemberWithWrite(userId: string, orgId: string): Promise<boolean> {
  if (await isDirectMember(userId, orgId)) return true;
  return hasAnyRole(userId, ["platform_admin", "support"]);
}

export async function requireOrgMember(userId: string, orgId: string): Promise<void> {
  if (!(await isOrgMember(userId, orgId))) {
    throw new Error("Not a member of this organization");
  }
}

export async function requireOrgWrite(userId: string, orgId: string): Promise<void> {
  if (!(await isOrgMemberWithWrite(userId, orgId))) {
    throw new Error("Not authorized to modify this organization's data");
  }
}

export async function requireAnyRole(userId: string, roles: AppRole[]): Promise<void> {
  if (!(await hasAnyRole(userId, roles))) {
    throw new Error("Not authorized");
  }
}
