import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { hasAnyRole } from "../authz.server";
import { toWireRow, toWireRows } from "../wire";
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

    return toWireRow(organizations, created);
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
    await db.update(organizations).set({ internalNotes: data.notes }).where(eq(organizations.id, data.id));
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
