import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/growth";

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

/** Platform_admin / support only — enforced by RLS, this just won't return rows otherwise. */
export function useHealthEvents(onlyUnresolved = true) {
  return useQuery({
    queryKey: ["system-health-events", onlyUnresolved],
    queryFn: async () => {
      let q = supabase
        .from("system_health_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (onlyUnresolved) q = q.eq("resolved", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HealthEvent[];
    },
  });
}

export function useResolveHealthEvent() {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_health_events")
        .update({
          resolved: true,
          resolved_by: user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
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
  const { user } = useSession();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/**
 * Report a health event (failed job, RLS denial, sync issue) from client
 * code. Routed through the log-health-event edge function since regular
 * users have no INSERT grant on system_health_events.
 */
export async function reportHealthEvent(input: {
  severity?: HealthEvent["severity"];
  source: string;
  event_type: string;
  message: string;
  detail?: Record<string, unknown>;
  organization_id?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;
  const { data: cfg } = await supabase.functions.invoke("log-health-event", {
    body: input,
  });
  return cfg;
}
