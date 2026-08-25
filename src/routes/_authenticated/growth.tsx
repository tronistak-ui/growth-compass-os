import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, StatCard } from "@/components/growth/ui";
import { useActiveOrg, useSaveRow } from "@/lib/growth";
import { useSyncInsights } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { nicheConfig } from "@/lib/niches";
import { useOrgData } from "@/lib/use-org-data";
import { money, pct, priorityLabel, type Insight } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { BRAND_FULL } from "@/lib/brand";

const INSIGHT_MODULE_TO_TASK_MODULE: Record<string, string> = {
  "Revenue Growth": "growth",
};

function taskModuleFor(insightModule: string): string {
  return INSIGHT_MODULE_TO_TASK_MODULE[insightModule] ?? insightModule.toLowerCase();
}

export const Route = createFileRoute("/_authenticated/growth")({
  head: () => ({
    meta: [
      { title: `Revenue Growth — ${BRAND_FULL}` },
      {
        name: "description",
        content:
          "Grow revenue with the four levers: more customers, higher value, more often, better margin.",
      },
      { property: "og:title", content: `Revenue Growth — ${BRAND_FULL}` },
      {
        property: "og:description",
        content: "Track growth levers and the actions that move each one.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GrowthPage,
});

function GrowthPage() {
  const { orgId } = useActiveOrg();
  const d = useOrgData();
  const m = d.metrics;
  const c = d.currency;
  const cfg = nicheConfig(d.org?.["niche"]);
  const sync = useSyncInsights(orgId);
  const saveTask = useSaveRow("tasks", orgId);

  function syncInsights() {
    sync.mutate(d.insights, {
      onSuccess: (n) => toast.success(`${n} rule-based opportunities synced to your growth plan`),
      onError: (e: any) => toast.error(e.message ?? "Could not sync opportunities"),
    });
  }

  function addTask(input: { title: string; module: string; priority: string; notes?: string | undefined }) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    saveTask.mutate(
      {
        title: input.title,
        module: input.module,
        priority: input.priority,
        status: "todo",
        due_date: dueDate.toISOString().slice(0, 10),
        notes: input.notes ?? null,
      },
      {
        onSuccess: () => toast.success("Added to Tasks, due in a week"),
        onError: (e: any) => toast.error(e.message ?? "Could not create task"),
      },
    );
  }

  return (
    <AppShell title="Revenue Growth" subtitle="Four levers decide how fast you grow">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="North star"
          value={cfg.northStar}
          hint={`Focus metric for ${d.org?.["niche"] ?? "your business"}`}
        />
        <StatCard label="Average order value" value={money(m.aov, c)} />
        <StatCard label="Repeat rate" value={pct(m.repeatRate)} />
        <StatCard
          label="Profit margin"
          value={pct(m.margin)}
          tone={m.margin >= 0 ? "positive" : "negative"}
        />
      </div>

      <Panel
        title="Levers at a glance"
        description="The eight ways to grow revenue, with today's reading"
        className="mb-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LeverCard label="More customers" value={String(m.newCustomersThisMonth)} />
          <LeverCard label="Higher order value" value={money(m.aov, c)} />
          <LeverCard label="Buy more often" value={pct(m.repeatRate, 0)} />
          <LeverCard
            label="Better margin"
            value={pct(m.margin)}
            tone={m.margin >= 0 ? "positive" : "negative"}
          />
          <LeverCard
            label="Lost-lead recovery"
            value={String(m.lostLeads)}
            tone={m.lostLeads > 0 ? "negative" : "default"}
          />
          <LeverCard label="Repeat customers" value={String(m.repeatCustomers)} />
          <LeverCard
            label="Due for rebooking"
            value={String(m.rebookingCandidates.length)}
            tone={m.rebookingCandidates.length > 0 ? "negative" : "default"}
          />
          <LeverCard label="Cross-sell pairs found" value={String(m.crossSellOpportunities.length)} />
        </div>
      </Panel>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Cross-sell & upsell"
          description="Who bought one thing but not the other"
        >
          {m.crossSellOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Record at least two different products or services per customer to surface pairs.
            </p>
          ) : (
            <ul className="space-y-3">
              {m.crossSellOpportunities.slice(0, 4).map((op) => (
                <li key={`${op.productA}|${op.productB}`} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="text-sm font-medium">
                    {op.productA} + {op.productB}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    <span className="num">{op.boughtBoth}</span> customer{op.boughtBoth === 1 ? "" : "s"}{" "}
                    bought both
                  </div>
                  {op.targets.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted-foreground">
                      {op.targets.slice(0, 3).map((t) => (
                        <li key={t.customerId}>
                          Pitch <span className="text-foreground">{t.pitch}</span> to{" "}
                          <span className="text-foreground">{t.customerName}</span> — already has {t.has}
                        </li>
                      ))}
                      {op.targets.length > 3 && <li>+{op.targets.length - 3} more</li>}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Win-back / rebooking" description="Overdue for a repeat purchase">
          {m.rebookingCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one is overdue right now — check back as purchase history builds up.
            </p>
          ) : (
            <ul className="space-y-3">
              {m.rebookingCandidates.slice(0, 5).map((r) => (
                <li key={r.customerId} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="text-sm font-medium">{r.customerName}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">{r.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Lost-lead recovery" description="Already know you — worth one more try">
          {d.leads.filter((l) => l["status"] === "lost").length === 0 ? (
            <p className="text-sm text-muted-foreground">No lost leads to recover right now.</p>
          ) : (
            <ul className="space-y-3">
              {d.leads
                .filter((l) => l["status"] === "lost")
                .sort((a, b) => Number(b["value"] ?? 0) - Number(a["value"] ?? 0))
                .slice(0, 5)
                .map((l) => (
                  <li key={l["id"]} className="rounded-lg border border-border px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{String(l["name"])}</div>
                      {Number(l["value"] ?? 0) > 0 && (
                        <span className="num text-[12px] text-muted-foreground">
                          {money(Number(l["value"]), c)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      Send one recovery offer{l["phone"] ? ` to ${l["phone"]}` : ""}
                      {l["email"] ? ` (${l["email"]})` : ""}.
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Where the upside is"
          description="Rule-based, from your own numbers"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={syncInsights}
              disabled={sync.isPending || d.insights.length === 0}
            >
              {sync.isPending ? "Syncing…" : "Add to plan"}
            </Button>
          }
        >
          <ul className="space-y-3">
            {d.insights.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Add leads, customers and revenue to unlock recommendations.
              </li>
            )}
            {d.insights.slice(0, 6).map((i: Insight) => (
              <li key={i.key} className="rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    {i.module}
                  </div>
                  <span className="num rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    {i.impact}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-medium">{i.title}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{i.detail}</div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="text-[12px] text-muted-foreground">
                    <span className="num">{i.current}</span> → <span className="num">{i.target}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                    onClick={() =>
                      addTask({
                        title: i.action,
                        module: taskModuleFor(i.module),
                        priority: priorityLabel(i.impact).toLowerCase(),
                        notes: i.detail,
                      })
                    }
                    disabled={saveTask.isPending}
                  >
                    <CheckSquare className="mr-1 size-3" /> Task
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="lg:col-span-2">
          <CrudPanel
            table="growth_opportunities"
            orgId={orgId}
            title="Growth plan"
            description="Turn each lever into a specific, owned action"
            emptyTitle="No opportunities yet"
            emptyDescription="Pick one lever and write the single action that moves it."
            queryOpts={{ order: { column: "created_at" } }}
            fields={[
              { name: "title", label: "Opportunity", required: true },
              {
                name: "lever",
                label: "Lever",
                type: "select",
                required: true,
                options: [
                  { value: "more_customers", label: "More customers" },
                  { value: "higher_value", label: "Higher order value" },
                  { value: "more_often", label: "Buy more often" },
                  { value: "better_margin", label: "Better margin" },
                  { value: "repeat_customers", label: "Repeat customers" },
                  { value: "lost_lead_recovery", label: "Lost-lead recovery" },
                  { value: "upsells", label: "Upsells" },
                  { value: "cross_sells", label: "Cross-sells" },
                  { value: "referrals", label: "Referrals" },
                ],
              },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: [
                  { value: "identified", label: "Identified" },
                  { value: "in_progress", label: "In progress" },
                  { value: "done", label: "Done" },
                ],
              },
              { name: "current_value", label: "Now" },
              { name: "target_value", label: "Target" },
              {
                name: "recommended_action",
                label: "Action to take",
                type: "textarea",
                inTable: false,
              },
              {
                name: "convert",
                label: "",
                inForm: false,
                render: (row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary"
                    onClick={() =>
                      addTask({
                        title: String(row["title"] ?? "Growth opportunity"),
                        module: taskModuleFor(String(row["module"] ?? "growth")),
                        priority: row["impact"] != null ? priorityLabel(Number(row["impact"])).toLowerCase() : "medium",
                        notes: row["recommended_action"] ? String(row["recommended_action"]) : undefined,
                      })
                    }
                    disabled={saveTask.isPending}
                  >
                    <CheckSquare className="mr-1 size-3" /> Task
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}

function LeverCard({
  label,
  value,
  tone = "default",
  muted,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "num mt-1 text-lg font-semibold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "default" && "text-ink",
          muted && "text-sm font-medium text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
