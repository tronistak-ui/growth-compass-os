import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, StatCard, Meter } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  listAllOrganizations,
  setOnboardingStage,
  saveOrgNotes,
  updateOrgBilling,
} from "@/server/functions/organizations";
import { getOrgActivity, getSystemHealthCheck, claimPlatformAdmin } from "@/server/functions/admin";
import { useIsAdmin, useHasRole, setStoredOrgId } from "@/lib/growth";
import { money } from "@/lib/metrics";
import { ONBOARDING_STAGES, stageLabel } from "@/lib/niches";
import { HealthAlertsPanel } from "@/components/growth/health-alerts";
import { TeamRolesPanel } from "@/components/growth/team-roles";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

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
  internal_notes: string | null;
  billing_status: "active" | "overdue" | "suspended" | null;
  next_payment_due_date: string | null;
};

const BILLING_TONE: Record<string, string> = {
  active: "bg-success/10 text-success",
  overdue: "bg-warning/10 text-warning",
  suspended: "bg-destructive/10 text-destructive",
};

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: canView, isLoading: viewRoleLoading } = useHasRole("platform_admin", "support");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [notesFor, setNotesFor] = useState<OrgRow | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [billingFor, setBillingFor] = useState<OrgRow | null>(null);
  const [billingStatusDraft, setBillingStatusDraft] = useState<"active" | "overdue" | "suspended">("active");
  const [billingDueDraft, setBillingDueDraft] = useState("");
  const [savingBilling, setSavingBilling] = useState(false);
  const qc = useQueryClient();

  const orgs = useQuery({
    queryKey: ["admin", "organizations"],
    enabled: !!canView,
    queryFn: () => listAllOrganizations() as Promise<OrgRow[]>,
  });

  const activity = useQuery({
    queryKey: ["admin", "activity"],
    enabled: !!canView,
    queryFn: async () => {
      const byOrg = await getOrgActivity();
      return new Map(Object.entries(byOrg));
    },
  });

  const health = useQuery({
    queryKey: ["admin", "health"],
    enabled: !!canView,
    refetchInterval: 60_000,
    queryFn: () => getSystemHealthCheck(),
  });

  async function claimAdmin() {
    try {
      const granted = await claimPlatformAdmin();
      if (granted) {
        toast.success("Platform admin access granted");
        void qc.invalidateQueries();
      } else {
        toast.error("An admin already exists for this platform");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim admin access");
    }
  }

  async function setStage(id: string, stage: string) {
    try {
      await setOnboardingStage({ data: { id, stage } });
      toast.success(`Moved to ${stageLabel(stage)}`);
      void qc.invalidateQueries({ queryKey: ["admin", "organizations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  if (!roleLoading && !viewRoleLoading && !canView) {
    return (
      <AppShell title="Admin">
        <Panel title="Not authorised">
          <p className="text-sm text-muted-foreground">You do not have access to the admin area.</p>
          <Button className="mt-4" variant="outline" onClick={claimAdmin}>
            Claim platform admin
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Only available while no platform admin exists yet.
          </p>
        </Panel>
      </AppShell>
    );
  }

  const all = orgs.data ?? [];
  const rows = q
    ? all.filter((r) => `${r.name} ${r.niche ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
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

  function openNotes(row: OrgRow) {
    setNotesFor(row);
    setNotesDraft(row.internal_notes ?? "");
  }

  async function saveNotes() {
    if (!notesFor) return;
    setSavingNotes(true);
    try {
      await saveOrgNotes({ data: { id: notesFor.id, notes: notesDraft.trim() || null } });
      toast.success("Notes saved");
      setNotesFor(null);
      void qc.invalidateQueries({ queryKey: ["admin", "organizations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingNotes(false);
    }
  }

  function openBilling(row: OrgRow) {
    setBillingFor(row);
    setBillingStatusDraft(row.billing_status ?? "active");
    setBillingDueDraft(row.next_payment_due_date ?? "");
  }

  async function saveBilling() {
    if (!billingFor) return;
    setSavingBilling(true);
    try {
      await updateOrgBilling({
        data: { id: billingFor.id, billingStatus: billingStatusDraft, nextPaymentDueDate: billingDueDraft || null },
      });
      toast.success("Billing updated");
      setBillingFor(null);
      void qc.invalidateQueries({ queryKey: ["admin", "organizations"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingBilling(false);
    }
  }

  const totalRevenueTracked = [...(stats?.values() ?? [])].reduce((sum, a) => sum + a.revenue, 0);

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
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        <StatCard
          label="Revenue tracked"
          value={totalRevenueTracked.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          hint="across all clients, mixed currencies"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="System health" description="Live backend checks, refreshed every minute">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Database
              </div>
              <div
                className={
                  health.data?.databaseOk
                    ? "mt-1 text-sm font-semibold text-success"
                    : "mt-1 text-sm font-semibold text-destructive"
                }
              >
                {health.isLoading
                  ? "Checking…"
                  : health.data?.databaseOk
                    ? "Operational"
                    : "Degraded"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {health.data?.errorMessage ?? `${health.data?.latency ?? 0} ms round trip`}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Auth &amp; access
              </div>
              <div className="mt-1 text-sm font-semibold text-success">Row-level security on</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Every business table is tenant-scoped
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Open tasks
              </div>
              <div className="num mt-1 text-lg font-semibold">{health.data?.openTasks ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Open opportunities
              </div>
              <div className="num mt-1 text-lg font-semibold">
                {health.data?.openOpportunities ?? 0}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {health.data?.autoOpportunities ?? 0} generated by rules
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Onboarding pipeline" description="How clients are distributed across stages">
          <div className="space-y-3">
            {ONBOARDING_STAGES.map((s) => {
              const count = all.filter((r) => (r.onboarding_status ?? "not_started") === s).length;
              const value = all.length ? Math.round((count / all.length) * 100) : 0;
              return <Meter key={s} label={`${stageLabel(s)} · ${count}`} value={value} />;
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HealthAlertsPanel />
        {isAdmin && <TeamRolesPanel />}
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
                <th className="py-2">Billing</th>
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
                      <Select
                        value={String(r.onboarding_status ?? "not_started")}
                        onValueChange={(v) => void setStage(r.id, v)}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ONBOARDING_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {stageLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="num py-2">{a?.leads ?? 0}</td>
                    <td className="num py-2">{a?.customers ?? 0}</td>
                    <td className="num py-2">{money(a?.revenue ?? 0, r.currency ?? "USD")}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => openBilling(r)}
                        className={cn(
                          "inline-flex flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left text-xs font-medium capitalize transition-opacity hover:opacity-80",
                          BILLING_TONE[r.billing_status ?? "active"],
                        )}
                      >
                        {r.billing_status ?? "active"}
                        {r.next_payment_due_date && (
                          <span className="text-[10px] font-normal normal-case opacity-80">
                            due {new Date(r.next_payment_due_date).toLocaleDateString()}
                          </span>
                        )}
                      </button>
                    </td>
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
                        className={r.internal_notes ? "text-ink" : "text-muted-foreground"}
                        onClick={() => openNotes(r)}
                      >
                        Notes{r.internal_notes ? " •" : ""}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openWorkspace(r.id, r.name)}>
                        Open workspace
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-muted-foreground">
                    No businesses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={!!notesFor} onOpenChange={(open) => !open && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support notes · {notesFor?.name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Internal notes visible only to platform admins and support — context for the next person who opens this account."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesFor(null)}>
              Cancel
            </Button>
            <Button disabled={savingNotes} onClick={() => void saveNotes()}>
              Save notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!billingFor} onOpenChange={(open) => !open && setBillingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Billing · {billingFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={billingStatusDraft} onValueChange={(v) => setBillingStatusDraft(v as typeof billingStatusDraft)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="overdue">Overdue (warning only, still has access)</SelectItem>
                  <SelectItem value="suspended">Suspended (locked out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Next payment due</label>
              <Input type="date" value={billingDueDraft} onChange={(e) => setBillingDueDraft(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingFor(null)}>
              Cancel
            </Button>
            <Button disabled={savingBilling} onClick={() => void saveBilling()}>
              Save billing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
