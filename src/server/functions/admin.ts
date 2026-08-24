import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { hasAnyRole, getUserRoles, type AppRole } from "../authz.server";
import { users, userRoles, organizations, leads, customers, revenueTransactions, tasks, growthOpportunities } from "@/db/schema";

async function requireAdminOrSupport(userId: string) {
  if (!(await hasAnyRole(userId, ["platform_admin", "support"]))) {
    throw new Error("Not authorized");
  }
}

/** Per-org lead/customer/revenue counts for the admin console's business table. */
export const getOrgActivity = createServerFn({ method: "GET" }).middleware([requireAuth]).handler(
  async ({ context }) => {
    await requireAdminOrSupport(context.userId);
    const [leadRows, customerRows, revenueRows] = await Promise.all([
      db.select({ organizationId: leads.organizationId }).from(leads),
      db.select({ organizationId: customers.organizationId }).from(customers),
      db
        .select({ organizationId: revenueTransactions.organizationId, amount: revenueTransactions.amount })
        .from(revenueTransactions),
    ]);
    const map = new Map<string, { leads: number; customers: number; revenue: number }>();
    const get = (id: string) => {
      let cur = map.get(id);
      if (!cur) {
        cur = { leads: 0, customers: 0, revenue: 0 };
        map.set(id, cur);
      }
      return cur;
    };
    for (const l of leadRows) get(l.organizationId).leads += 1;
    for (const c of customerRows) get(c.organizationId).customers += 1;
    for (const r of revenueRows) get(r.organizationId).revenue += Number(r.amount ?? 0);
    return Object.fromEntries(map);
  },
);

/** Live backend checks for the admin console's "System health" panel. */
export const getSystemHealthCheck = createServerFn({ method: "GET" }).middleware([requireAuth]).handler(
  async ({ context }) => {
    await requireAdminOrSupport(context.userId);
    const started = performance.now();
    try {
      const [orgCount, taskRows, oppRows] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(organizations),
        db.select({ status: tasks.status }).from(tasks),
        db.select({ status: growthOpportunities.status, source: growthOpportunities.source }).from(growthOpportunities),
      ]);
      const latency = Math.round(performance.now() - started);
      return {
        latency,
        databaseOk: true,
        errorMessage: null as string | null,
        openTasks: taskRows.filter((t) => t.status !== "done").length,
        autoOpportunities: oppRows.filter((o) => o.source === "auto").length,
        openOpportunities: oppRows.filter((o) => o.status !== "done").length,
        totalOrgs: Number(orgCount[0]?.count ?? 0),
      };
    } catch (e) {
      return {
        latency: Math.round(performance.now() - started),
        databaseOk: false,
        errorMessage: e instanceof Error ? e.message : "Database check failed",
        openTasks: 0,
        autoOpportunities: 0,
        openOpportunities: 0,
        totalOrgs: 0,
      };
    }
  },
);

type TeamMember = { user_id: string; email: string | null; roles: AppRole[] };

/** platform_admin/support/auditor role holders, for the Team & access panel. */
export const listTeamRoles = createServerFn({ method: "GET" }).middleware([requireAuth]).handler(
  async ({ context }) => {
    await requireAdminOrSupport(context.userId);
    const roleRows = await db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles);
    const userIds = [...new Set(roleRows.map((r) => r.userId))];
    if (userIds.length === 0) return [] as TeamMember[];

    const userRows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, userIds));
    const emailById = new Map(userRows.map((u) => [u.id, u.email]));

    const grouped = new Map<string, AppRole[]>();
    for (const r of roleRows) {
      const list = grouped.get(r.userId) ?? [];
      list.push(r.role);
      grouped.set(r.userId, list);
    }
    return [...grouped.entries()].map(([user_id, roles]) => ({
      user_id,
      email: emailById.get(user_id) ?? null,
      roles,
    })) as TeamMember[];
  },
);

const grantRoleInput = z.object({
  email: z.string().email(),
  role: z.enum(["support", "auditor", "platform_admin"]),
});

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => grantRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    // Matches the source RLS policy: only platform_admin can grant roles
    // (support/admin can both *read* team-roles, but not write).
    if (!(await hasAnyRole(context.userId, ["platform_admin"]))) {
      throw new Error("Only a platform admin can grant roles");
    }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (!user) throw new Error("No account found with that email — they need to sign up first");
    await db.insert(userRoles).values({ userId: user.id, role: data.role }).onConflictDoNothing();
    return { ok: true };
  });

const revokeRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["support", "auditor", "platform_admin", "business_owner"]),
});

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => revokeRoleInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await hasAnyRole(context.userId, ["platform_admin"]))) {
      throw new Error("Only a platform admin can revoke roles");
    }
    await db.delete(userRoles).where(and(eq(userRoles.userId, data.userId), eq(userRoles.role, data.role)));
    return { ok: true };
  });

/** Fixed-length digest compare — avoids both a naive === timing leak and the length-mismatch crash timingSafeEqual throws on unequal-length buffers. */
function secretsMatch(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const claimPlatformAdminInput = z.object({ secret: z.string() });

/**
 * Bootstrapping platform_admin used to be first-come-first-served — whoever
 * clicked the button first after deployment won, including a client who got
 * there before the operator did. Now the very first claim additionally
 * needs PLATFORM_ADMIN_CLAIM_SECRET, a value only the deployer knows and
 * sets once via the environment — so the window is closed by a secret, not
 * by hoping nobody else visits /admin first. Every call after an admin
 * already exists just reports whether the caller already holds it, same as
 * before, and needs no secret since nothing is being granted.
 */
export const claimPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => claimPlatformAdminInput.parse(input))
  .handler(async ({ data, context }) => {
    const [existingAdmin] = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, "platform_admin"))
      .limit(1);
    if (existingAdmin) {
      const roles = await getUserRoles(context.userId);
      return roles.includes("platform_admin");
    }

    const expected = process.env["PLATFORM_ADMIN_CLAIM_SECRET"];
    if (!expected) {
      throw new Error("Admin claiming isn't configured — set PLATFORM_ADMIN_CLAIM_SECRET and try again.");
    }
    if (!secretsMatch(data.secret, expected)) {
      throw new Error("Incorrect claim secret");
    }

    await db.insert(userRoles).values({ userId: context.userId, role: "platform_admin" }).onConflictDoNothing();
    return true;
  });
