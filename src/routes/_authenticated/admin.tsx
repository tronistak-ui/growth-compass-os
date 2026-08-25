import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel, StageTracker } from "@/components/growth/ui";
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
import { listAllOrganizations, setOnboardingStage, saveOrgNotes } from "@/server/functions/organizations";
import { getOrgActivity, getSystemHealthCheck, claimPlatformAdmin } from "@/server/functions/admin";
import { useIsAdmin, useHasRole, setStoredOrgId } from "@/lib/growth";
import { money } from "@/lib/metrics";
import { ONBOARDING_STAGES, stageLabel } from "@/lib/niches";
import { HealthAlertsPanel } from "@/components/growth/health-alerts";
import { TeamRolesPanel } from "@/components/growth/team-roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: `Admin — ${BRAND_FULL}` },
      { name: "description", content: "Support access, system health and this account's setup." },
      { property: "og:title", content: `Admin — ${BRAND_FULL}` },
      { property: "og:description", content: "Support access, system health and this account's setup." },
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
};

function AdminPage() {
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: canView, isLoading: viewRoleLoading } = useHasRole("platform_admin", "support");
  const navigate = useNavigate();
  const [notesFor, setNotesFor] = useState<OrgRow | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [claimSecret, setClaimSecret] = useState("");
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
      const granted = await claimPlatformAdmin({ data: { secret: claimSecret } });
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
          <div className="mt-4 max-w-xs space-y-2">
            <Input
              type="password"
              value={claimSecret}
              onChange={(e) => setClaimSecret(e.target.value)}
              placeholder="Admin claim secret"
              autoComplete="off"
            />
            <Button variant="outline" onClick={claimAdmin} disabled={!claimSecret}>
              Claim platform admin
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Only works once, while no platform admin exists yet, and only with the correct secret
            (PLATFORM_ADMIN_CLAIM_SECRET on the server).
          </p>
        </Panel>
      </AppShell>
    );
  }

  const rows = orgs.data ?? [];
  // This deployment belongs to exactly one client, so there's exactly one
  // row here in practice — kept as an array (rather than assuming rows[0])
  // because nothing below breaks if that ever isn't true, e.g. mid-onboarding.
  const business = rows[0] ?? null;
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

  return (
    <AppShell title="Admin" subtitle="Support access, system health and this account's setup">
      <div className="grid gap-4 lg:grid-cols-2">
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

        <Panel title="Onboarding journey" description="Where this business is in the rollout">
          <StageTracker stage={business?.onboarding_status ?? "not_started"} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HealthAlertsPanel />
        {isAdmin && <TeamRolesPanel />}
      </div>

      <Panel className="mt-4" title="Business" description="This account's details and activity">
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
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    No business set up yet.
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
    </AppShell>
  );
}
