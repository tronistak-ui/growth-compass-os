/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, getMyRoles, signOut as signOutFn } from "@/server/functions/auth";
import { listMyOrganizations } from "@/server/functions/organizations";
import { listRows, getSingletonRow, saveRow, upsertSingleton, deleteRow } from "@/server/functions/rows";

export type Row = Record<string, any>;

const ACTIVE_ORG_KEY = "tz.activeOrg";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

/** The signed-in user, from the session cookie — replaces Supabase's client-side session. */
export function useSession() {
  const q = useQuery({
    queryKey: ["session"],
    queryFn: () => getCurrentUser(),
    staleTime: 60_000,
    retry: false,
  });
  return { user: (q.data ?? null) as SessionUser | null, loading: q.isLoading };
}

export async function signOut() {
  await signOutFn();
}

export type AppRole = "platform_admin" | "support" | "auditor" | "business_owner";

/** All roles held by the current user (a user may hold more than one). */
export function useRoles() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: () => getMyRoles() as Promise<AppRole[]>,
  });
}

export function useIsAdmin() {
  const roles = useRoles();
  return { ...roles, data: !!roles.data?.includes("platform_admin") };
}

/** True once roles have loaded and include any of the given roles. */
export function useHasRole(...roles: AppRole[]) {
  const q = useRoles();
  return { ...q, data: !!q.data?.some((r) => roles.includes(r)) };
}

/** users now merges what used to be the separate `profiles` table. */
export function useProfile() {
  const { user, loading } = useSession();
  return { data: user as Row | null, isLoading: loading };
}

export function useOrganizations() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["organizations", user?.id],
    enabled: !!user,
    queryFn: () => listMyOrganizations() as Promise<Row[]>,
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
    queryFn: () =>
      listRows({
        data: { table, orgId: orgId!, order: opts.order, filters: opts.filters, limit: opts.limit },
      }) as Promise<Row[]>,
  });
}

/** Single-row-per-organization tables (presence_profiles, positioning). */
export function useSingletonRow(table: string, orgId?: string) {
  return useQuery({
    queryKey: [table, "single", orgId],
    enabled: !!orgId,
    queryFn: () => getSingletonRow({ data: { table, orgId: orgId! } }) as Promise<Row>,
  });
}

export function useSaveRow(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      return saveRow({ data: { table, orgId: orgId!, values } });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpsertSingleton(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      return upsertSingleton({ data: { table, orgId: orgId!, values } });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteRow(table: string, orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteRow({ data: { table, orgId: orgId!, id } });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
