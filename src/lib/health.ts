import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listHealthEvents,
  resolveHealthEvent as resolveHealthEventFn,
  listNotifications,
  markNotificationRead as markNotificationReadFn,
} from "@/server/functions/health";

export type HealthEvent = {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  event_type: string;
  message: string;
  detail: Record<string, unknown>;
  organization_id: string | null;
  resolved: boolean;
  created_at: string;
};

/** Platform_admin / support only — enforced app-side, this just won't return rows otherwise. */
export function useHealthEvents(onlyUnresolved = true) {
  return useQuery({
    queryKey: ["system-health-events", onlyUnresolved],
    queryFn: () => listHealthEvents({ data: { onlyUnresolved } }) as Promise<HealthEvent[]>,
  });
}

export function useResolveHealthEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await resolveHealthEventFn({ data: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-health-events"] }),
  });
}

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications() as Promise<AppNotification[]>,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await markNotificationReadFn({ data: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// reportHealthEvent (previously routed through the log-health-event edge
// function) is rebuilt as part of Phase 3's edge-function conversion — it
// has no callers yet in this app, so there's nothing to keep working here.
