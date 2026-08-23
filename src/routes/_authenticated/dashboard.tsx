import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Sparkles,
  Users,
  UserPlus,
  Percent,
  DollarSign,
  TrendingUp,
  Receipt,
  Tag,
  Repeat,
  Clock,
  UserX,
} from "lucide-react";
import { AppShell } from "@/components/growth/shell";
import {
  Panel,
  StatCard,
  EmptyState,
  ErrorState,
  LoadingRows,
  ScoreDial,
  StageTracker,
} from "@/components/growth/ui";
import { useOrgData } from "@/lib/use-org-data";
import { OnboardingChecklist } from "@/components/growth/onboarding-checklist";
import { useOnboardingChecklist } from "@/lib/checklist";
import { money, pct, monthlySeries } from "@/lib/metrics";
import { lexicon } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Business health, growth funnel, revenue and opportunities in one live view.",
      },
      { property: "og:title", content: "Dashboard — TrendZypher Growth OS" },
      { property: "og:description", content: "Live business health, funnel and profit view." },
    ],
  }),
  component: Dashboard,
});

const TONE: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/30 bg-warning/5",
  info: "border-info/30 bg-info/5",
  good: "border-success/30 bg-success/5",
};

function Dashboard() {
  const d = useOrgData();
  const checklist = useOnboardingChecklist(d.orgId);
  const m = d.metrics;
  const lex = lexicon(d.org?.["niche"]);
  const series = monthlySeries(d.revenue, d.expenses);
  const cur = d.currency;

  const funnel = [
    { label: "Reach", value: d.campaigns.length },
    { label: lex.leads, value: m.totalLeads },
    { label: "Qualified", value: m.qualifiedLeads },
    { label: lex.customers, value: m.totalCustomers },
    { label: "Revenue", value: m.totalRevenue },
  ];
  const maxFunnel = Math.max(...funnel.map((f) => f.value), 1);

  if (!d.isLoading && !d.org) {
    return (
      <AppShell title="Dashboard">
        <EmptyState
          title="Set up your business"
          description="Complete onboarding so the Growth OS can start tracking presence, leads, customers and profit."
          action={
            <Link to="/onboarding">
              <Button>Start onboarding</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Business Dashboard"
      subtitle={d.org?.["name"] ? `${d.org["name"]} · ${d.org["niche"] ?? "Business"}` : undefined}
      actions={
        <Link to="/reports">
          <Button variant="outline" size="sm">
            Monthly report
          </Button>
        </Link>
      }
    >
      {d.isLoading ? (
        <LoadingRows rows={6} />
      ) : d.isError ? (
        <ErrorState description="One or more parts of your dashboard failed to load. Please try again." />
      ) : (
        <div className="space-y-6">
          <Panel
            title="Growth OS rollout"
            description="Where this business is in the onboarding journey"
          >
            <StageTracker stage={String(d.org?.["onboarding_status"] ?? "not_started")} />
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label={lex.leads}
              value={m.totalLeads}
              hint={`${m.qualifiedLeads} qualified`}
              icon={Users}
            />
            <StatCard
              label={`New ${lex.customers.toLowerCase()}`}
              value={m.newCustomersThisMonth}
              hint={`${m.totalCustomers} total`}
              icon={UserPlus}
            />
            <StatCard
              label="Conversion rate"
              value={pct(m.conversionRate)}
              hint="leads → won"
              icon={Percent}
            />
            <StatCard
              label="Revenue (MTD)"
              value={money(m.revenueThisMonth, cur)}
              trend={m.revenueGrowth}
              icon={DollarSign}
            />
            <StatCard
              label="Profit (MTD)"
              value={money(m.profit, cur)}
              hint={`${pct(m.margin)} margin`}
              tone={m.profit >= 0 ? "positive" : "negative"}
              icon={TrendingUp}
            />
            <StatCard label="Expenses (MTD)" value={money(m.expensesThisMonth, cur)} icon={Receipt} />
            <StatCard label="Average order value" value={money(m.aov, cur)} icon={Tag} />
            <StatCard label="Repeat customer rate" value={pct(m.repeatRate, 0)} icon={Repeat} />
            <StatCard label="Follow-ups due" value={m.followUpsDue} icon={Clock} />
            <StatCard label="Lost leads" value={m.lostLeads} icon={UserX} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Growth funnel"
              description="Reach → Leads → Qualified → Customers → Revenue"
              className="lg:col-span-2"
            >
              <div className="space-y-3">
                {funnel.map((f, i) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-xs text-muted-foreground">{f.label}</div>
                    <div className="h-8 flex-1 overflow-hidden rounded-lg bg-surface-3">
                      <div
                        className="flex h-full items-center rounded-lg bg-primary/85 px-3 transition-all"
                        style={{ width: `${Math.max((f.value / maxFunnel) * 100, 4)}%` }}
                      >
                        <span className="num text-xs font-medium text-primary-foreground">
                          {i === 4 ? money(f.value, cur) : f.value}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Presence score" description="Discoverability · trust · consistency">
              <ScoreDial score={d.presenceScore.total} label="Online presence" />
              <Link
                to="/presence"
                className="mt-4 inline-flex items-center gap-1 text-xs text-primary"
              >
                Improve presence <ArrowRight className="size-3" />
              </Link>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Revenue, expenses & profit"
              description="Last 6 months"
              className="lg:col-span-2"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => money(v, cur)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      fill="url(#rev)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="var(--chart-3)"
                      fill="transparent"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="var(--chart-2)"
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Revenue by source">
              {m.bySource.length === 0 ? (
                <EmptyState
                  title="No revenue recorded"
                  description="Add transactions in Finance."
                />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={m.bySource}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {m.bySource.map((_, i) => (
                          <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v, cur)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          {checklist.data && checklist.data.percent < 100 && (
            <OnboardingChecklist orgId={d.orgId} />
          )}

          <Panel
            title="Growth opportunities"
            description="Rule-based insights computed from your stored data"
            actions={<Sparkles className="size-4 text-primary" />}
          >
            {d.insights.length === 0 ? (
              <EmptyState
                title="Nothing flagged"
                description="Add leads, customers and transactions to surface opportunities."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {d.insights.map((i) => (
                  <div key={i.title} className={cn("rounded-xl border p-4", TONE[i.tone])}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[13px] font-semibold text-ink">{i.title}</h3>
                      <span className="rounded bg-card px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                        {i.module}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{i.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`${lex.leads} by source`}>
              {m.leadsBySource.length === 0 ? (
                <EmptyState title="No leads yet" />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.leadsBySource}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
                      <Tooltip cursor={{ fill: "var(--surface-3)" }} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Revenue by product / service">
              {m.byProduct.length === 0 ? (
                <EmptyState title="No product revenue recorded" />
              ) : (
                <ul className="space-y-2.5">
                  {m.byProduct.slice(0, 7).map((p) => (
                    <li key={p.name} className="flex items-center justify-between text-sm">
                      <span className="truncate text-foreground/90">{p.name}</span>
                      <span className="num font-medium text-ink">{money(p.value, cur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}
