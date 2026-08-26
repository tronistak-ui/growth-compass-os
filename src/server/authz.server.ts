// App-layer replacement for the Supabase RLS helper functions
// (has_role, has_any_role, is_org_member — see
// supabase/migrations/20260822072307_*.sql + 20260822081321_*.sql). Drizzle
// doesn't enforce row-level security, so every server function that touches
// org-scoped data must call one of these explicitly.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationMembers, organizations, userRoles } from "@/db/schema";

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
    .where(
      and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
    )
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

async function isOrgSuspended(orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ billingStatus: organizations.billingStatus })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return row?.billingStatus === "suspended";
}

async function isOrgActivated(orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ activatedAt: organizations.activatedAt })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return row?.activatedAt != null;
}

const SUSPENDED_MESSAGE =
  "This account is on hold pending payment — contact your account manager to restore access.";

const NOT_ACTIVATED_MESSAGE =
  "Enter your activation code to unlock full access — see the banner at the top of the page.";

/**
 * A suspended org's own members are blocked here — the one real
 * enforcement point every org-scoped server function already calls.
 * platform_admin/support bypass this (same as they bypass membership
 * itself) so a suspended client can still be reached and reactivated.
 */
export async function requireOrgMember(userId: string, orgId: string): Promise<void> {
  if (await hasAnyRole(userId, ["platform_admin", "support", "auditor"])) return;
  if (!(await isDirectMember(userId, orgId))) {
    throw new Error("Not a member of this organization");
  }
  if (await isOrgSuspended(orgId)) throw new Error(SUSPENDED_MESSAGE);
}

/**
 * The one central enforcement point for the activation gate, alongside
 * suspension above — every server function that writes org-scoped data
 * already calls this, so a frozen (not-yet-activated) org is blocked from
 * every mutation without touching each call site individually. Reads
 * (requireOrgMember) are deliberately untouched: a frozen client can see
 * the whole product, just can't act in it yet.
 */
export async function requireOrgWrite(userId: string, orgId: string): Promise<void> {
  if (await hasAnyRole(userId, ["platform_admin", "support"])) return;
  if (!(await isDirectMember(userId, orgId))) {
    throw new Error("Not authorized to modify this organization's data");
  }
  if (await isOrgSuspended(orgId)) throw new Error(SUSPENDED_MESSAGE);
  if (!(await isOrgActivated(orgId))) throw new Error(NOT_ACTIVATED_MESSAGE);
}

export async function requireAnyRole(userId: string, roles: AppRole[]): Promise<void> {
  if (!(await hasAnyRole(userId, roles))) {
    throw new Error("Not authorized");
  }
}
