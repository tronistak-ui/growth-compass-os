import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, StatCard } from "@/components/growth/ui";
import { useActiveOrg } from "@/lib/growth";
import { useSyncInsights } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { nicheConfig } from "@/lib/niches";
import { useOrgData } from "@/lib/use-org-data";
import { money, pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/growth")({
  head: () => ({
    meta: [
      { title: "Revenue Growth — TrendZypher Growth OS" },
      {
        name: "description",
        content:
          "Grow revenue with the four levers: more customers, higher value, more often, better margin.",
      },
      { property: "og:title", content: "Revenue Growth — TrendZypher Growth OS" },
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

  function syncInsights() {
    sync.mutate(d.insights, {
      onSuccess: (n) => toast.success(`${n} rule-based opportunities synced to your growth plan`),
      onError: (e: any) => toast.error(e.message ?? "Could not sync opportunities"),
    });
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
          <LeverCard label="Upsells" value="Plan it" muted />
          <LeverCard label="Cross-sells" value="Plan it" muted />
        </div>
      </Panel>

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
            {d.insights.slice(0, 6).map((i: any) => (
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
                <div className="mt-1.5 text-[12px] text-muted-foreground">
                  <span className="num">{i.current}</span> → <span className="num">{i.target}</span>
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
