import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, StatCard, StatusPill } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, setStoredOrgId } from "@/lib/growth";
import { money } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TrendZypher Growth OS" },
      { name: "description", content: "Platform overview of businesses using the Growth OS." },
      { property: "og:title", content: "Admin — TrendZypher Growth OS" },
      { property: "og:description", content: "Platform overview of businesses and members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type OrgRow = {
  id: string;
  name: string;
  niche: string | null;
  currency: string | null;
  created_at: string;
  onboarding_status: string | null;
  onboarding_completed: boolean | null;
};

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const orgs = useQuery({
    queryKey: ["admin", "organizations"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,niche,currency,created_at,onboarding_status,onboarding_completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgRow[];
    },
  });

  const activity = useQuery({
    queryKey: ["admin", "activity"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const [leads, customers, revenue] = await Promise.all([
        supabase.from("leads").select("organization_id,status"),
        supabase.from("customers").select("organization_id"),
        supabase.from("revenue_transactions").select("organization_id,amount"),
      ]);
      if (leads.error) throw leads.error;
      if (customers.error) throw customers.error;
      if (revenue.error) throw revenue.error;
      const map = new Map<string, { leads: number; customers: number; revenue: number }>();
      const get = (id: string) => {
        const cur = map.get(id) ?? { leads: 0, customers: 0, revenue: 0 };
        map.set(id, cur);
        return cur;
      };
      for (const l of leads.data ?? []) get(String(l.organization_id)).leads += 1;
      for (const c of customers.data ?? []) get(String(c.organization_id)).customers += 1;
      for (const r of revenue.data ?? [])
        get(String(r.organization_id)).revenue += Number(r.amount ?? 0);
      return map;
    },
  });

  if (!roleLoading && !isAdmin) {
    return (
      <AppShell title="Admin">
        <Panel title="Not authorised">
          <p className="text-sm text-muted-foreground">
            You do not have access to the admin area.
          </p>
        </Panel>
      </AppShell>
    );
  }

  const all = orgs.data ?? [];
  const rows = q
    ? all.filter((r) =>
        `${r.name} ${r.niche ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
      )
    : all;
  const stats = activity.data;

  function growthScore(id: string) {
    const a = stats?.get(id);
    if (!a) return 0;
    const leadScore = Math.min(35, a.leads * 3);
    const custScore = Math.min(35, a.customers * 4);
    const revScore = a.revenue > 0 ? 30 : 0;
    return Math.round(leadScore + custScore + revScore);
  }

  function openWorkspace(id: string, name: string) {
    setStoredOrgId(id);
    toast.success(`Viewing ${name}`);
    void navigate({ to: "/dashboard" });
  }

  return (
    <AppShell
      title="Admin"
      subtitle="Platform overview"
      actions={
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search businesses"
          className="h-9 w-48"
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Businesses" value={all.length} />
        <StatCard
          label="Onboarded"
          value={all.filter((r) => r.onboarding_completed).length}
          tone="positive"
        />
        <StatCard
          label="Industries"
          value={new Set(all.map((r) => r.niche).filter(Boolean)).size}
        />
        <StatCard
          label="Added this month"
          value={
            all.filter(
              (r) =>
                new Date(r.created_at).getMonth() === new Date().getMonth() &&
                new Date(r.created_at).getFullYear() === new Date().getFullYear(),
            ).length
          }
        />
      </div>

      <Panel className="mt-4" title="Businesses" description="All organisations on the platform">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                <th className="py-2">Name</th>
                <th className="py-2">Industry</th>
                <th className="py-2">Setup</th>
                <th className="py-2">Leads</th>
                <th className="py-2">Customers</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">Growth score</th>
                <th className="py-2">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = stats?.get(r.id);
                const score = growthScore(r.id);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-muted-foreground">{r.niche ?? "—"}</td>
                    <td className="py-2">
                      <StatusPill value={String(r.onboarding_status ?? "not_started")} />
                    </td>
                    <td className="num py-2">{a?.leads ?? 0}</td>
                    <td className="num py-2">{a?.customers ?? 0}</td>
                    <td className="num py-2">{money(a?.revenue ?? 0, r.currency ?? "USD")}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="num text-xs text-muted-foreground">{score}</span>
                      </div>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openWorkspace(r.id, r.name)}
                      >
                        Open workspace
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    No businesses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
