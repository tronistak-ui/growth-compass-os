import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChecklistItem = {
  key: string;
  stage: string;
  label: string;
  complete: boolean;
};

/** Computed server-side from stored data — always reflects real state. */
export function useOnboardingChecklist(orgId?: string) {
  return useQuery({
    queryKey: ["onboarding-checklist", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_onboarding_checklist", { _org_id: orgId! });
      if (error) throw error;
      const items = (data ?? []) as ChecklistItem[];
      const complete = items.filter((i) => i.complete).length;
      return {
        items,
        complete,
        total: items.length,
        percent: items.length ? Math.round((complete / items.length) * 100) : 0,
      };
    },
  });
}
