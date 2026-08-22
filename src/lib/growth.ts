/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type Row = Record<string, any>;

const ACTIVE_ORG_KEY = "tz.activeOrg";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useIsAdmin() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "platform_admin")
        .maybeSingle();
      return !!data;
    },
  });
}

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizations() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["organizations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function getStoredOrgId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_ORG_KEY);
}

export function setStoredOrgId(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_ORG_KEY, id);
}

/** The business the user is currently working in. */
export function useActiveOrg() {
  const orgs = useOrganizations();
  const stored = typeof window !== "undefined" ? getStoredOrgId() : null;
  const list = orgs.data ?? [];
  const org = list.find((o) => o["id"] === stored) ?? list[0] ?? null;
  return { org, orgs: list, isLoading: orgs.isLoading, orgId: org?.["id"] as string | undefined };
}

export type QueryOpts = {
  select?: string;
  order?: { column: string; ascending?: boolean };
  filters?: Array<[string, any]>;
  limit?: number;
};

export function useRows(table: string, orgId?: string, opts: QueryOpts = {}) {
  return useQuery({
    queryKey: [table, orgId, opts],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase.from(table as any) as any)
        .select(opts.select ?? "*")
        .eq("organization_id", orgId);
      for (const [col, val] of opts.filters ?? []) q = q.eq(col, val);
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Single-row-per-organization tables (presence_profiles, positioning). */
export function useSingletonRow(table: string, orgId?: string) {
  return useQuery({
    queryKey: [table, "single", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { organization_id: orgId }) as Row;
    },
  });
}

export function useSaveRow(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const payload: Row = { ...values, organization_id: orgId };
      if (payload["id"]) {
        const id = payload["id"];
        delete payload["id"];
        const { error } = await (supabase.from(table as any) as any)
          .update(payload)
          .eq("id", id)
          .eq("organization_id", orgId);
        if (error) throw error;
      } else {
        delete payload["id"];
        const { error } = await (supabase.from(table as any) as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpsertSingleton(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { error } = await (supabase.from(table as any) as any).upsert(
        { ...values, organization_id: orgId },
        { onConflict: "organization_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteRow(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any)
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
