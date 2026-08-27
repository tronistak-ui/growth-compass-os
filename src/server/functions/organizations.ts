import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { hasAnyRole, requireOrgMember } from "../authz.server";
import { toWireRow, toWireRows, wireColumn } from "../wire";
import { ROW_TABLES, SINGLETON_TABLES } from "./rows";
import { generateActivationCode, hashActivationCode } from "../auth/activation.server";
import { organizations, organizationMembers, presenceProfiles, positioning } from "@/db/schema";

/** Organizations the caller belongs to — platform_admin/support/auditor see every org. */
export const listMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const canSeeAll = await hasAnyRole(context.userId, ["platform_admin", "support", "auditor"]);
    const rows = canSeeAll
      ? await db.select().from(organizations).orderBy(organizations.createdAt)
      : await db
          .select({ organizations })
          .from(organizations)
          .innerJoin(
            organizationMembers,
            and(
              eq(organizationMembers.organizationId, organizations.id),
              eq(organizationMembers.userId, context.userId),
            ),
          )
          .orderBy(organizations.createdAt)
          .then((rows) => rows.map((r) => r.organizations));
    return toWireRows(organizations, rows);
  });

const createOrganizationInput = z.object({
  name: z.string().min(1),
  niche: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  whatsapp: z.string().optional(),
  googleProfile: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  currency: z.string().default("USD"),
  productsServices: z.string().optional(),
  mainOffers: z.string().optional(),
  avgOrderValue: z.number().optional(),
  targetLocation: z.string().optional(),
  mainCustomerType: z.string().optional(),
  monthlyRevenueRange: z.string().optional(),
  mainGoal: z.string().optional(),
  goals: z.array(z.string()).default([]),
  acquisitionChannels: z.array(z.string()).default([]),
});

/**
 * Mirrors handle_new_organization(): creates the org, attaches the creator
 * as an "owner" member, and seeds the one-row-per-org presence/positioning
 * tables — all in one transaction (the source trigger got this for free from
 * running inside the same INSERT; here it's explicit).
 */
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => createOrganizationInput.parse(input))
  .handler(async ({ data, context }) => {
    // Generated once, here, and never retrievable again in plaintext —
    // the response below is the only place this value ever appears.
    const activationCode = generateActivationCode();

    const created = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          ownerId: context.userId,
          name: data.name,
          niche: data.niche || null,
          industry: data.industry || null,
          location: data.location || null,
          website: data.website || null,
          instagram: data.instagram || null,
          facebook: data.facebook || null,
          whatsapp: data.whatsapp || null,
          googleProfile: data.googleProfile || null,
          phone: data.phone || null,
          email: data.email || null,
          currency: data.currency || "USD",
          productsServices: data.productsServices || null,
          mainOffers: data.mainOffers || null,
          avgOrderValue: data.avgOrderValue != null ? String(data.avgOrderValue) : "0",
          targetLocation: data.targetLocation || null,
          mainCustomerType: data.mainCustomerType || null,
          monthlyRevenueRange: data.monthlyRevenueRange || null,
          mainGoal: data.mainGoal || null,
          goals: data.goals,
          acquisitionChannels: data.acquisitionChannels,
          onboardingStatus: "audit",
          activationCodeHash: hashActivationCode(activationCode),
        })
        .returning();
      if (!org) throw new Error("Failed to create business");

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: context.userId,
        role: "owner",
      });
      await tx.insert(presenceProfiles).values({ organizationId: org.id });
      await tx.insert(positioning).values({ organizationId: org.id });

      return org;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wire: Record<string, any> = toWireRow(organizations, created);
    wire["activation_code"] = activationCode;
    return wire;
  });

const activateInput = z.object({ orgId: z.string().uuid(), code: z.string().min(1) });

/**
 * Attemptable by a frozen (not-yet-activated) member — this deliberately
 * uses requireOrgMember, not requireOrgWrite, since requiring write access
 * to unlock write access would be a lock with no key.
 */
export const activateOrganization = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => activateInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, data.orgId))
      .limit(1);
    if (!org) throw new Error("Business not found");
    if (org.activatedAt) return { ok: true };
    if (!org.activationCodeHash || hashActivationCode(data.code) !== org.activationCodeHash) {
      throw new Error("Incorrect activation code");
    }
    await db
      .update(organizations)
      .set({ activatedAt: new Date() })
      .where(eq(organizations.id, data.orgId));
    return { ok: true };
  });

const regenerateActivationInput = z.object({ orgId: z.string().uuid() });

/** Admin-only recovery path if the original code was lost before it reached the client. */
export const regenerateActivationCode = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => regenerateActivationInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    const activationCode = generateActivationCode();
    await db
      .update(organizations)
      .set({ activationCodeHash: hashActivationCode(activationCode) })
      .where(eq(organizations.id, data.orgId));
    return { activation_code: activationCode };
  });

/** Platform-wide list for the admin console — every organisation, regardless of membership. */
export const listAllOrganizations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdminOrSupport(context.userId);
    const rows = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
    return toWireRows(organizations, rows);
  });

const setOnboardingStageInput = z.object({
  id: z.string().uuid(),
  stage: z.string(),
});

export const setOnboardingStage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => setOnboardingStageInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    await db
      .update(organizations)
      .set({ onboardingStatus: data.stage, onboardingCompleted: data.stage === "completed" })
      .where(eq(organizations.id, data.id));
    return { ok: true };
  });

const saveNotesInput = z.object({
  id: z.string().uuid(),
  notes: z.string().nullable(),
});

export const saveOrgNotes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => saveNotesInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    await db
      .update(organizations)
      .set({ internalNotes: data.notes })
      .where(eq(organizations.id, data.id));
    return { ok: true };
  });

const updateBillingInput = z.object({
  id: z.string().uuid(),
  billingStatus: z.enum(["active", "overdue", "suspended"]),
  nextPaymentDueDate: z.string().nullable().optional(),
});

/** Manual billing — a platform admin flips this after confirming a bank transfer. */
export const updateOrgBilling = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => updateBillingInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminOrSupport(context.userId);
    await db
      .update(organizations)
      .set({
        billingStatus: data.billingStatus,
        nextPaymentDueDate: data.nextPaymentDueDate ?? null,
      })
      .where(eq(organizations.id, data.id));
    return { ok: true };
  });

async function requireAdminOrSupport(userId: string) {
  if (!(await hasAnyRole(userId, ["platform_admin", "support"]))) {
    throw new Error("Not authorized");
  }
}

const orgIdInput = z.object({ orgId: z.string().uuid() });

/**
 * Everything this business owns, as one JSON file — the self-service half
 * of the Privacy Policy's export promise. Walks the exact same table
 * registry the generic CRUD layer uses (rows.ts's ROW_TABLES/
 * SINGLETON_TABLES) so a table added there is automatically included here
 * too, with nothing to remember to update in two places.
 */
export const exportOrgData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => orgIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, data.orgId))
      .limit(1);
    if (!org) throw new Error("Business not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tables: Record<string, Record<string, any>[]> = {};
    for (const [name, table] of [
      ...Object.entries(ROW_TABLES),
      ...Object.entries(SINGLETON_TABLES),
    ]) {
      const orgCol = wireColumn(table, "organization_id");
      const rows = await db.select().from(table).where(eq(orgCol, data.orgId));
      tables[name] = toWireRows(table, rows as Record<string, unknown>[]);
    }

    // A raw foreign-key UUID means nothing outside this database — add the
    // referenced row's name alongside it (customer_id -> customer_name, etc.)
    // so the export reads on its own, without joining tables by hand.
    const FK_LOOKUPS: Record<string, string> = {
      customer_id: "customers",
      campaign_id: "campaigns",
      offer_id: "offers",
      segment_id: "customer_segments",
    };
    const nameById: Record<string, Map<string, string>> = {};
    for (const targetTable of new Set(Object.values(FK_LOOKUPS))) {
      nameById[targetTable] = new Map(
        (tables[targetTable] ?? []).map((r) => [String(r["id"]), String(r["name"] ?? "")]),
      );
    }
    for (const rows of Object.values(tables)) {
      for (const row of rows) {
        for (const [fkCol, targetTable] of Object.entries(FK_LOOKUPS)) {
          if (row[fkCol]) {
            const label = nameById[targetTable]?.get(String(row[fkCol]));
            if (label) row[fkCol.replace(/_id$/, "_name")] = label;
          }
        }
      }
    }

    return {
      exported_at: new Date().toISOString(),
      organization: toWireRow(organizations, org),
      tables,
    };
  });

const deleteOrgInput = z.object({ orgId: z.string().uuid(), confirmName: z.string() });

/**
 * Permanently deletes the business and everything in it — the self-service
 * half of the Privacy Policy's deletion promise. Deliberately stricter than
 * requireOrgWrite: only the account owner (or platform staff helping them)
 * can do this, not just any team member with normal write access, and the
 * business name must be typed exactly as a confirmation gate independent
 * of whatever the client-side "are you sure" dialog already did.
 *
 * No manual cleanup needed beyond this one delete — every org-scoped table
 * references organizations.id with onDelete: cascade, so Postgres removes
 * every lead, customer, revenue row, the works, in the same transaction.
 */
export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => deleteOrgInput.parse(input))
  .handler(async ({ data, context }) => {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, data.orgId))
      .limit(1);
    if (!org) throw new Error("Business not found");

    const isPlatformStaff = await hasAnyRole(context.userId, ["platform_admin", "support"]);
    if (!isPlatformStaff && org.ownerId !== context.userId) {
      throw new Error("Only the account owner can delete this business");
    }
    if (data.confirmName !== org.name) {
      throw new Error("That doesn't match the business name — type it exactly to confirm");
    }

    await db.delete(organizations).where(eq(organizations.id, data.orgId));
    return { ok: true };
  });
