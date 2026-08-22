/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

      const rows = insights.map((i) => ({
        organization_id: orgId,
        insight_key: i.key,
        source: "auto",
        title: i.title,
        lever: i.lever,
        module: i.module,
        impact: i.impact,
        current_value: i.current,
        target_value: i.target,
        recommended_action: i.action,
      }));

      if (rows.length > 0) {
        const { error } = await (supabase.from("growth_opportunities") as any).upsert(rows, {
          onConflict: "organization_id,insight_key",
          ignoreDuplicates: false,
        });
        if (error) throw error;
      }

      // Remove stale auto rows whose rule no longer applies.
      const keep = insights.map((i) => i.key);
      let del = (supabase.from("growth_opportunities") as any)
        .delete()
        .eq("organization_id", orgId)
        .eq("source", "auto")
        .neq("status", "done");
      if (keep.length > 0) del = del.not("insight_key", "in", `(${keep.join(",")})`);
      const { error: delError } = await del;
      if (delError) throw delError;

      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
