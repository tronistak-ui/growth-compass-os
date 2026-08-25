import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { StatCard } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";
import { money } from "@/lib/metrics";
import { lexicon } from "@/lib/niches";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/discovery")({
  head: () => ({
    meta: [
      { title: `Customer Discovery — ${BRAND_FULL}` },
      {
        name: "description",
        content:
          "Define who your best customers are: their problems, triggers, objections and channels.",
      },
      { property: "og:title", content: `Customer Discovery — ${BRAND_FULL}` },
      {
        property: "og:description",
        content: "Build clear customer segments so every offer speaks to a real person.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoveryPage,
});

function DiscoveryPage() {
  const { org, orgId } = useActiveOrg();
  const { data: segments } = useRows("customer_segments", orgId, {
    order: { column: "created_at" },
  });
  const rows = segments ?? [];
  const lex = lexicon(org?.["niche"]);
  const currency = (org?.["currency"] as string) ?? "USD";
  const highPriority = rows.filter((r) => r["priority"] === "high").length;
  const avgValue = rows.length
    ? rows.reduce((s, r) => s + Number(r["customer_value"] ?? 0), 0) / rows.length
    : 0;

  return (
    <AppShell
      title="Customer Discovery"
      subtitle="Know exactly who you are selling to before you spend on marketing"
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Segments defined" value={rows.length} />
        <StatCard label="High priority" value={highPriority} tone="positive" />
        <StatCard
          label={`Avg ${lex.customer.toLowerCase()} value`}
          value={money(avgValue, currency)}
        />
      </div>

      <CrudPanel
        table="customer_segments"
        orgId={orgId}
        title="Customer segments"
        description="Each segment is a group of people who buy for the same reason"
        emptyTitle="No segments yet"
        emptyDescription="Start with your single best customer type and describe them honestly."
        queryOpts={{ order: { column: "created_at" } }}
        fields={[
          { name: "name", label: "Segment name", required: true, placeholder: "Weekend families" },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ],
          },
          { name: "age_range", label: "Age range", placeholder: "25-40" },
          { name: "location", label: "Location", placeholder: "Within 5km" },
          {
            name: "customer_value",
            label: `Typical ${lex.customer.toLowerCase()} value`,
            type: "number",
          },
          { name: "buying_frequency", label: "Buys how often", placeholder: "Twice a month" },
          { name: "problems", label: "Problems they have", type: "textarea", inTable: false },
          { name: "goals", label: "What they want", type: "textarea", inTable: false },
          { name: "buying_triggers", label: "Buying triggers", type: "textarea", inTable: false },
          { name: "objections", label: "Objections", type: "textarea", inTable: false },
          { name: "interests", label: "Interests", type: "textarea", inTable: false },
          { name: "offer", label: "Best offer for them", type: "textarea", inTable: false },
          { name: "description", label: "Notes", type: "textarea", inTable: false },
        ]}
      />
    </AppShell>
  );
}
