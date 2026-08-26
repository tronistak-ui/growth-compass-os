import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, StatCard } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";
import { useOrgData } from "@/lib/use-org-data";
import { CHANNELS, EXPENSE_CATEGORIES, nicheConfig } from "@/lib/niches";
import { money, pct } from "@/lib/metrics";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: `Finance — ${BRAND_FULL}` },
      {
        name: "description",
        content: "Record income and expenses so you always know real profit, not just sales.",
      },
      { property: "og:title", content: `Finance — ${BRAND_FULL}` },
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
  const customerNameById = new Map(customerOptions.map((c) => [c.value, c.label]));
  const customerName = (row: Record<string, unknown>) =>
    customerNameById.get(String(row["customer_id"] ?? "")) ?? "";
  const customerEmailById = new Map(
    (customers ?? []).map((c) => [String(c["id"]), String(c["email"] ?? "")]),
  );
  const customerPhoneById = new Map(
    (customers ?? []).map((c) => [String(c["id"]), String(c["phone"] ?? "")]),
  );
  const customerEmail = (row: Record<string, unknown>) =>
    customerEmailById.get(String(row["customer_id"] ?? "")) ?? "";
  const customerPhone = (row: Record<string, unknown>) =>
    customerPhoneById.get(String(row["customer_id"] ?? "")) ?? "";
  const campaignOptions = (campaigns ?? []).map((r) => ({
    value: String(r["id"]),
    label: `${String(r["name"])} (${String(r["channel"])})`,
  }));
  const campaignNameById = new Map(campaignOptions.map((c) => [c.value, c.label]));
  const campaignName = (row: Record<string, unknown>) =>
    campaignNameById.get(String(row["campaign_id"] ?? "")) ?? "";

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
          csv
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
                    render: (r: Record<string, unknown>) => customerName(r) || "—",
                    csvValue: (r: Record<string, unknown>) => customerName(r),
                  },
                  {
                    name: "customer_email",
                    label: "Email",
                    inForm: false,
                    render: (r: Record<string, unknown>) => customerEmail(r) || "—",
                    csvValue: (r: Record<string, unknown>) => customerEmail(r),
                  },
                  {
                    name: "customer_phone",
                    label: "Phone",
                    inForm: false,
                    render: (r: Record<string, unknown>) => customerPhone(r) || "—",
                    csvValue: (r: Record<string, unknown>) => customerPhone(r),
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
          csv
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
                    render: (r: Record<string, unknown>) => campaignName(r) || "—",
                    csvValue: (r: Record<string, unknown>) => campaignName(r),
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
