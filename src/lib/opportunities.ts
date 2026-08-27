import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncGrowthOpportunities } from "@/server/functions/opportunities";
import type { Insight } from "./metrics";

/**
 * Persists the deterministic, rule-based insights into growth_opportunities.
 * Rows created here carry source = 'auto' and a stable insight_key, so a
 * re-sync updates the same row instead of duplicating it. Manual rows are
 * never touched; auto rows whose rule no longer fires are removed.
 */
export function useSyncInsights(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insights: Insight[]) => {
      if (!orgId) throw new Error("No active business");
      const result = await syncGrowthOpportunities({
        data: {
          orgId,
          insights: insights.map((i) => ({
            key: i.key,
            title: i.title,
            lever: i.lever,
            module: i.module,
            impact: i.impact,
            current: i.current ?? null,
            target: i.target ?? null,
            action: i.action ?? null,
          })),
        },
      });
      return result.synced;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
