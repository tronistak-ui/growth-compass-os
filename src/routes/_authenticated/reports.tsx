import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppShell } from "@/components/growth/shell";
import { Panel, StatCard, Meter } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { useOrgData } from "@/lib/use-org-data";
import { money, pct, groupCount, groupSum, monthlySeries } from "@/lib/metrics";
import { sendMyWeeklyDigest } from "@/server/functions/digest";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: `Monthly Report — ${BRAND_FULL}` },
      {
        name: "description",
        content: "A plain-language monthly summary of leads, revenue, profit and next actions.",
      },
      { property: "og:title", content: `Monthly Report — ${BRAND_FULL}` },
      {
        property: "og:description",
        content: "See how your business performed this month and what to fix next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const PIE_COLORS = [
  "var(--chart-1, oklch(0.72 0.15 250))",
  "var(--chart-2, oklch(0.7 0.14 165))",
  "var(--chart-3, oklch(0.75 0.15 85))",
  "var(--chart-4, oklch(0.68 0.16 20))",
  "var(--chart-5, oklch(0.66 0.13 310))",
];

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const d = useOrgData();
  const m = d.metrics;
  const c = d.currency;

  const series = monthlySeries(d.revenue, d.expenses, 6);
  const bySource = groupCount(d.leads, "source").slice(0, 6);
  const byProduct = groupSum(d.revenue, "product_service").slice(0, 6);
  const byCategory = groupSum(d.expenses, "category").slice(0, 6);

  const sendDigest = useMutation({
    mutationFn: () => sendMyWeeklyDigest({ data: { orgId: d.orgId! } }),
    onSuccess: () => toast.success("Digest emailed to every member of this business"),
    onError: (e: Error) => toast.error(e.message ?? "Could not send digest"),
  });

  function exportCsv() {
    const rows: (string | number)[][] = [
      [`${BRAND_FULL} — Monthly Report`],
      ["Business", String(d.org?.["name"] ?? "")],
      ["Generated", new Date().toISOString().slice(0, 10)],
      [],
      ["Metric", "Value"],
      ["Revenue this month", m.revenueThisMonth],
      ["Expenses this month", m.expensesThisMonth],
      ["Profit", m.profit],
      ["Profit margin", `${Math.round(m.margin * 100)}%`],
      ["Total leads", m.totalLeads],
      ["Lead conversion", `${Math.round(m.conversionRate * 100)}%`],
      ["Customers", m.totalCustomers],
      ["New customers this month", m.newCustomersThisMonth],
      ["Repeat rate", `${Math.round(m.repeatRate * 100)}%`],
      ["Average order value", m.aov],
      ["Presence score", d.presenceScore.total],
      [],
      ["Month", "Revenue", "Expenses", "Profit"],
      ...series.map((s) => [s.month, s.revenue, s.expenses, s.profit]),
      [],
      ["Lead source", "Leads"],
      ...bySource.map((s) => [s.name, s.value]),
      [],
      ["Channel", "Leads", "Customers", "Conversion rate"],
      ...m.channelPerformance.map((ch) => [
        ch.channel,
        ch.leads,
        ch.customers,
        `${Math.round(ch.conversionRate)}%`,
      ]),
      [],
      ["Product / service", "Revenue"],
      ...byProduct.map((s) => [s.name, s.value]),
      [],
      ["Expense category", "Amount"],
      ...byCategory.map((s) => [s.name, s.value]),
    ];
    downloadCsv(`growth-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <AppShell
      title="Monthly Report"
      subtitle="Everything that happened this month, in plain language"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendDigest.mutate()}
            disabled={sendDigest.isPending || !d.orgId}
          >
            {sendDigest.isPending ? "Sending…" : "Email me this"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue this month" value={money(m.revenueThisMonth, c)} />
        <StatCard label="Expenses this month" value={money(m.expensesThisMonth, c)} />
        <StatCard
          label="Profit"
          value={money(m.profit, c)}
          tone={m.profit >= 0 ? "positive" : "negative"}
        />
        <StatCard label="New customers" value={m.newCustomersThisMonth} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Performance" description="Key ratios for the period">
          <div className="space-y-3">
            <Meter label="Lead conversion" value={Math.round(m.conversionRate * 100)} />
            <Meter label="Repeat customers" value={Math.round(m.repeatRate * 100)} />
            <Meter label="Presence score" value={d.presenceScore.total} />
            <Meter
              label="Profit margin"
              value={Math.max(0, Math.min(100, Math.round(m.margin * 100)))}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You captured {m.totalLeads} enquiries and converted {pct(m.conversionRate)} of them.
            Average order value is {money(m.aov, c)}.
          </p>
        </Panel>

        <Panel title="What to do next" description="Ranked by likely impact">
          <ul className="space-y-3">
            {d.insights.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Add more data and recommendations will appear here.
              </li>
            )}
            {d.insights.map((i: any, idx: number) => (
              <li key={idx} className="rounded-lg border border-border px-3 py-2.5">
                <div className="text-sm font-medium">{i.title}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{i.detail}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue vs expenses" description="Last 6 months">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => money(Number(v), c)}
                />
                <Bar dataKey="revenue" fill={PIE_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill={PIE_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Where customers come from" description="Leads by source">
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads recorded yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySource}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {bySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Conversion by platform"
          description="Leads, customers and conversion rate per channel"
        >
          {m.channelPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads or customers with a source yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="py-2 pr-4 font-medium">Channel</th>
                    <th className="py-2 pr-4 font-medium">Leads</th>
                    <th className="py-2 pr-4 font-medium">Customers</th>
                    <th className="py-2 pr-4 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {m.channelPerformance.map((ch) => (
                    <tr key={ch.channel} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium capitalize">{ch.channel}</td>
                      <td className="num py-2 pr-4">{ch.leads}</td>
                      <td className="num py-2 pr-4">{ch.customers}</td>
                      <td className="num py-2 pr-4">
                        {ch.leads > 0 ? pct(ch.conversionRate, 0) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Top products & services" description="Revenue contribution">
          <BreakdownList rows={byProduct} currency={c} />
        </Panel>

        <Panel title="Where money goes" description="Expenses by category">
          <BreakdownList rows={byCategory} currency={c} />
        </Panel>

        <Panel
          title="New vs returning customers"
          description="Customers with more than one purchase, all time"
        >
          <BreakdownList
            rows={[
              { name: "Returning", value: m.repeatCustomers },
              {
                name: "New (single purchase)",
                value: Math.max(0, m.totalCustomers - m.repeatCustomers),
              },
            ]}
            format="count"
          />
        </Panel>
      </div>
    </AppShell>
  );
}

function BreakdownList({
  rows,
  currency,
  format = "currency",
}: {
  rows: { name: string; value: number }[];
  currency?: string;
  format?: "currency" | "count";
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0))
    return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground/90">{r.name}</span>
            <span className="num font-medium">
              {format === "count" ? r.value.toLocaleString() : money(r.value, currency ?? "USD")}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
