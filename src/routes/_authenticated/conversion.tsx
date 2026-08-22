import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { Panel, StatCard, Meter } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";
import { pct } from "@/lib/metrics";
import { lexicon } from "@/lib/niches";

export const Route = createFileRoute("/_authenticated/conversion")({
  head: () => ({
    meta: [
      { title: "Conversion — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Turn attention into enquiries and enquiries into paying customers.",
      },
      { property: "og:title", content: "Conversion — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Audit your conversion assets and track the funnel month by month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConversionPage,
});

function ConversionPage() {
  const { org, orgId } = useActiveOrg();
  const lex = lexicon(org?.["niche"]);
  const { data: snapshots } = useRows("funnel_snapshots", orgId, {
    order: { column: "period_month" },
  });
  const { data: assets } = useRows("conversion_assets", orgId, {
    order: { column: "created_at" },
  });

  const latest = (snapshots ?? [])[0];
  const visitors = Number(latest?.["visitors"] ?? 0);
  const leads = Number(latest?.["leads"] ?? 0);
  const qualified = Number(latest?.["qualified_leads"] ?? 0);
  const customers = Number(latest?.["customers"] ?? 0);
  const rate = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
  const assetRows = assets ?? [];

  return (
    <AppShell title="Conversion" subtitle="Where interested people stop becoming customers">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visitors (latest)" value={visitors} />
        <StatCard label={lex.leads} value={leads} hint={pct(rate(leads, visitors))} />
        <StatCard label="Qualified" value={qualified} hint={pct(rate(qualified, leads))} />
        <StatCard
          label={lex.customers}
          value={customers}
          hint={pct(rate(customers, leads))}
          tone="positive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Funnel health" description="Latest recorded month">
          <div className="space-y-3">
            <Meter
              label={`Visitor → ${lex.lead.toLowerCase()}`}
              value={Math.round(rate(leads, visitors))}
            />
            <Meter label={`${lex.lead} → qualified`} value={Math.round(rate(qualified, leads))} />
            <Meter
              label={`Qualified → ${lex.customer.toLowerCase()}`}
              value={Math.round(rate(customers, qualified))}
            />
            <Meter
              label="Assets ready"
              value={Math.round(
                rate(assetRows.filter((a) => a["status"] === "ready").length, assetRows.length),
              )}
            />
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <CrudPanel
            table="conversion_assets"
            orgId={orgId}
            title="Conversion assets"
            description="Pages, menus, forms and messages that do the selling"
            emptyTitle="No assets tracked"
            emptyDescription="List your booking page, WhatsApp reply and landing page first."
            queryOpts={{ order: { column: "created_at" } }}
            fields={[
              { name: "name", label: "Asset name", required: true },
              {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                options: [
                  { value: "landing_page", label: "Landing page" },
                  { value: "booking", label: "Booking flow" },
                  { value: "whatsapp", label: "WhatsApp reply" },
                  { value: "profile", label: "Social profile" },
                  { value: "menu", label: "Menu / catalogue" },
                  { value: "other", label: "Other" },
                ],
              },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: [
                  { value: "missing", label: "Missing" },
                  { value: "needs_work", label: "Needs work" },
                  { value: "ready", label: "Ready" },
                ],
              },
              { name: "conversion_goal", label: "Goal", placeholder: "Book a table" },
              { name: "url", label: "Link", inTable: false },
              { name: "notes", label: "Notes", type: "textarea", inTable: false },
            ]}
          />

          <CrudPanel
            table="funnel_snapshots"
            orgId={orgId}
            title="Monthly funnel"
            description="Record the numbers each month to see the trend"
            emptyTitle="No months recorded"
            emptyDescription="Add this month's visitors, enquiries and customers."
            queryOpts={{ order: { column: "period_month" } }}
            fields={[
              { name: "period_month", label: "Month", type: "date", required: true },
              { name: "visitors", label: "Visitors", type: "number" },
              { name: "leads", label: lex.leads, type: "number" },
              { name: "qualified_leads", label: "Qualified", type: "number" },
              { name: "customers", label: "Customers", type: "number" },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
