import { useQuery } from "@tanstack/react-query";
import { computeOnboardingChecklist, type ChecklistItem } from "@/server/functions/checklist";

export type { ChecklistItem };

/** Computed server-side from stored data — always reflects real state. */
export function useOnboardingChecklist(orgId?: string) {
  return useQuery({
    queryKey: ["onboarding-checklist", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const items = await computeOnboardingChecklist({ data: { orgId: orgId! } });
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
