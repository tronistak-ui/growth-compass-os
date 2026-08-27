import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq, not, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { requireOrgWrite } from "../authz.server";
import { growthOpportunities } from "@/db/schema";

const insightInput = z.object({
  key: z.string(),
  title: z.string(),
  lever: z.string(),
  module: z.string(),
  impact: z.number(),
  current: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
});

const syncInsightsInput = z.object({
  orgId: z.string().uuid(),
  insights: z.array(insightInput),
});

/**
 * Persists deterministic, rule-based insights into growth_opportunities.
 * Rows created here carry source='auto' and a stable insight_key, so a
 * re-sync updates the same row instead of duplicating it. Manual rows are
 * never touched; auto rows whose rule no longer fires are removed.
 */
export const syncGrowthOpportunities = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => syncInsightsInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);

    if (data.insights.length > 0) {
      for (const insight of data.insights) {
        await db
          .insert(growthOpportunities)
          .values({
            organizationId: data.orgId,
            insightKey: insight.key,
            source: "auto",
            title: insight.title,
            lever: insight.lever,
            module: insight.module,
            impact: insight.impact,
            currentValue: insight.current ?? null,
            targetValue: insight.target ?? null,
            recommendedAction: insight.action ?? null,
          })
          .onConflictDoUpdate({
            target: [growthOpportunities.organizationId, growthOpportunities.insightKey],
            set: {
              title: insight.title,
              lever: insight.lever,
              module: insight.module,
              impact: insight.impact,
              currentValue: insight.current ?? null,
              targetValue: insight.target ?? null,
              recommendedAction: insight.action ?? null,
            },
          });
      }

      // New auto rows land on the DB default status; normalise them to the
      // plan vocabulary without touching statuses the user has already moved.
      await db
        .update(growthOpportunities)
        .set({ status: "identified" })
        .where(
          and(
            eq(growthOpportunities.organizationId, data.orgId),
            eq(growthOpportunities.source, "auto"),
            eq(growthOpportunities.status, "not_started"),
          ),
        );
    }

    // Remove stale auto rows whose rule no longer applies.
    const keep = data.insights.map((i) => i.key);
    const staleConditions = [
      eq(growthOpportunities.organizationId, data.orgId),
      eq(growthOpportunities.source, "auto"),
      not(eq(growthOpportunities.status, "done")),
    ];
    if (keep.length > 0) {
      await db.delete(growthOpportunities).where(and(...staleConditions, not(inArray(growthOpportunities.insightKey, keep))));
    } else {
      await db.delete(growthOpportunities).where(and(...staleConditions));
    }

    return { synced: data.insights.length };
  });
