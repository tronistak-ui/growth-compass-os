import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember } from "../authz.server";
import {
  organizations,
  presenceProfiles,
  positioning,
  customerSegments,
  offers,
  campaigns,
  leads,
  customers,
  revenueTransactions,
  expenses,
  tasks,
} from "@/db/schema";

export type ChecklistItem = { key: string; stage: string; label: string; complete: boolean };

/**
 * App-layer port of get_onboarding_checklist(): every item is computed from
 * whether the underlying data exists, never a separately-stored checkbox, so
 * it can't drift from reality.
 */
export const computeOnboardingChecklist = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => z.object({ orgId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const orgId = data.orgId;

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) throw new Error("Business not found");

    const exists = async (rowCount: Promise<unknown[]>) => (await rowCount).length > 0;
    const one = sql<number>`1`;

    const [
      hasPresence,
      positioningRow,
      hasSegment,
      hasOffer,
      hasCampaign,
      hasLead,
      hasCustomer,
      hasRevenue,
      hasExpense,
      hasTask,
    ] = await Promise.all([
      exists(db.select({ one }).from(presenceProfiles).where(eq(presenceProfiles.organizationId, orgId)).limit(1)),
      db
        .select({ valueProposition: positioning.valueProposition })
        .from(positioning)
        .where(eq(positioning.organizationId, orgId))
        .limit(1)
        .then((rows) => rows[0]),
      exists(db.select({ one }).from(customerSegments).where(eq(customerSegments.organizationId, orgId)).limit(1)),
      exists(db.select({ one }).from(offers).where(eq(offers.organizationId, orgId)).limit(1)),
      exists(db.select({ one }).from(campaigns).where(eq(campaigns.organizationId, orgId)).limit(1)),
      exists(db.select({ one }).from(leads).where(eq(leads.organizationId, orgId)).limit(1)),
      exists(db.select({ one }).from(customers).where(eq(customers.organizationId, orgId)).limit(1)),
      exists(
        db
          .select({ one })
          .from(revenueTransactions)
          .where(eq(revenueTransactions.organizationId, orgId))
          .limit(1),
      ),
      exists(db.select({ one }).from(expenses).where(eq(expenses.organizationId, orgId)).limit(1)),
      exists(db.select({ one }).from(tasks).where(eq(tasks.organizationId, orgId)).limit(1)),
    ]);

    const items: ChecklistItem[] = [
      {
        key: "business_profile",
        stage: "onboarding",
        label: "Complete your business profile",
        complete: !!(org.name && org.niche && org.location),
      },
      {
        key: "goals_set",
        stage: "onboarding",
        label: "Set your business goals",
        complete: (org.goals?.length ?? 0) > 0,
      },
      { key: "presence_profile", stage: "audit", label: "Fill in your Presence profile", complete: hasPresence },
      {
        key: "positioning",
        stage: "audit",
        label: "Define your brand positioning",
        complete: !!positioningRow?.valueProposition?.trim(),
      },
      {
        key: "customer_segment",
        stage: "system_setup",
        label: "Create your first customer segment",
        complete: hasSegment,
      },
      { key: "first_offer", stage: "system_setup", label: "Add your first offer", complete: hasOffer },
      { key: "first_campaign", stage: "system_setup", label: "Launch your first campaign", complete: hasCampaign },
      { key: "first_lead", stage: "system_setup", label: "Add your first lead", complete: hasLead },
      { key: "first_customer", stage: "optimization", label: "Convert your first customer", complete: hasCustomer },
      {
        key: "first_revenue",
        stage: "optimization",
        label: "Record your first revenue transaction",
        complete: hasRevenue,
      },
      { key: "first_expense", stage: "optimization", label: "Log your first expense", complete: hasExpense },
      { key: "tasks_created", stage: "optimization", label: "Create at least one growth task", complete: hasTask },
    ];

    // Best-effort mirror of advance_onboarding_stage(): once every item is
    // complete, mark the org completed. Never blocks the response on failure.
    if (items.every((i) => i.complete) && org.onboardingStatus !== "completed") {
      await db
        .update(organizations)
        .set({ onboardingStatus: "completed", onboardingCompleted: true })
        .where(eq(organizations.id, orgId));
    }

    return items;
  });
