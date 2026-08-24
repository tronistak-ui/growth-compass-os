import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, StatCard } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";
import { useOrgData } from "@/lib/use-org-data";
import { CHANNELS, EXPENSE_CATEGORIES, nicheConfig } from "@/lib/niches";
import { money, pct } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Finance — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Record income and expenses so you always know real profit, not just sales.",
      },
      { property: "og:title", content: "Finance — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Simple income and expense tracking with live profit and margin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { org, orgId } = useActiveOrg();
  const d = useOrgData();
  const m = d.metrics;
  const c = d.currency;
  const cfg = nicheConfig(org?.["niche"]);
  const expenseOptions = [
    ...cfg.expenseCategories,
    ...EXPENSE_CATEGORIES.filter((x) => !cfg.expenseCategories.includes(x)),
  ].map((x) => ({ value: x, label: x }));
  const { data: customers } = useRows("customers", orgId, { order: { column: "created_at" } });
  const { data: campaigns } = useRows("campaigns", orgId, { order: { column: "created_at" } });

  const customerOptions = (customers ?? []).map((r) => ({
    value: String(r["id"]),
    label: String(r["name"]),
  }));
  const campaignOptions = (campaigns ?? []).map((r) => ({
    value: String(r["id"]),
    label: `${String(r["name"])} (${String(r["channel"])})`,
  }));

  return (
    <AppShell title="Finance" subtitle="Money in, money out, and what is actually left">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={money(m.revenueThisMonth, c)} />
        <StatCard label="Expenses this month" value={money(m.expensesThisMonth, c)} />
        <StatCard
          label="Profit"
          value={money(m.profit, c)}
          tone={m.profit >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Margin" value={pct(m.margin)} />
      </div>

      <Panel
        title="Customer economics"
        description="What a new customer costs to acquire, against what they're worth"
        className="mb-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Customer acquisition cost"
            value={m.cac > 0 ? money(m.cac, c) : "—"}
            hint={
              m.cac > 0
                ? "Marketing spend this month ÷ new customers this month"
                : "Log marketing expenses linked to a campaign to see CAC"
            }
            tone={m.cac > 0 && m.ltv > 0 ? (m.cac > m.ltv ? "negative" : "positive") : "default"}
          />
          <StatCard
            label="Customer lifetime value"
            value={m.ltv > 0 ? money(m.ltv, c) : "—"}
            hint={
              m.ltv > 0
                ? "Average total spend per customer, all time"
                : "Needs at least 3 repeat customers to be meaningful"
            }
          />
        </div>
      </Panel>

      <div className="space-y-4">
        <CrudPanel
          table="revenue_transactions"
          orgId={orgId}
          title="Income"
          description="Every sale, order or payment received"
          emptyTitle="No income recorded"
          emptyDescription="Add your recent sales to see profit and average order value."
          queryOpts={{ order: { column: "occurred_on" } }}
          fields={[
            { name: "occurred_on", label: "Date", type: "date", required: true },
            { name: "amount", label: "Amount", type: "number", required: true },
            { name: "product_service", label: "Product / service" },
            {
              name: "source",
              label: "Source",
              type: "select",
              options: CHANNELS.map((x) => ({ value: x, label: x })),
            },
            ...(customerOptions.length
              ? [
                  {
                    name: "customer_id",
                    label: "Customer",
                    type: "select" as const,
                    options: customerOptions,
                    inTable: false,
                  },
                ]
              : []),
            { name: "payment_method", label: "Payment method", inTable: false },
            { name: "notes", label: "Notes", type: "textarea", inTable: false },
          ]}
        />

        <CrudPanel
          table="expenses"
          orgId={orgId}
          title="Expenses"
          description="Costs that eat into profit"
          emptyTitle="No expenses recorded"
          emptyDescription="Log marketing spend, materials and rent to see true margin."
          queryOpts={{ order: { column: "occurred_on" } }}
          fields={[
            { name: "occurred_on", label: "Date", type: "date", required: true },
            { name: "amount", label: "Amount", type: "number", required: true },
            {
              name: "category",
              label: "Category",
              type: "select",
              required: true,
              options: expenseOptions,
            },
            { name: "description", label: "Description" },
            ...(campaignOptions.length
              ? [
                  {
                    name: "campaign_id",
                    label: "Campaign (for CAC)",
                    type: "select" as const,
                    options: campaignOptions,
                    inTable: false,
                  },
                ]
              : []),
            { name: "payment_method", label: "Payment method", inTable: false },
            { name: "notes", label: "Notes", type: "textarea", inTable: false },
          ]}
        />
      </div>
    </AppShell>
  );
}
