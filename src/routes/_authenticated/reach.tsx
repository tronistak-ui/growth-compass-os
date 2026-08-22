import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { StatCard } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";
import { CHANNELS, nicheConfig } from "@/lib/niches";
import { money, sum } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/reach")({
  head: () => ({
    meta: [
      { title: "Offers & Campaigns — TrendZypher Growth OS" },
      {
        name: "description",
        content: "Build offers people actually want and run campaigns that put them in front.",
      },
      { property: "og:title", content: "Offers & Campaigns — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "Plan offers, set prices and track campaigns across every channel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReachPage,
});

const STATUS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];

function ReachPage() {
  const { org, orgId } = useActiveOrg();
  const currency = (org?.["currency"] as string) ?? "USD";
  const cfg = nicheConfig(org?.["niche"]);
  const { data: offers } = useRows("offers", orgId, { order: { column: "created_at" } });
  const { data: campaigns } = useRows("campaigns", orgId, { order: { column: "created_at" } });
  const { data: segments } = useRows("customer_segments", orgId, {
    order: { column: "created_at" },
  });
  const { data: leads } = useRows("leads", orgId, { order: { column: "created_at" } });
  const { data: revenue } = useRows("revenue_transactions", orgId, {
    order: { column: "occurred_on" },
  });

  const leadRows = leads ?? [];
  const revRows = revenue ?? [];

  const offerRows = offers ?? [];
  const campaignRows = campaigns ?? [];
  const activeCampaigns = campaignRows.filter((c) => c["status"] === "active");
  const budget = activeCampaigns.reduce((s, c) => s + Number(c["budget"] ?? 0), 0);

  const segmentOptions = (segments ?? []).map((s) => ({
    value: String(s["id"]),
    label: String(s["name"]),
  }));
  const offerOptions = offerRows.map((o) => ({
    value: String(o["id"]),
    label: String(o["name"]),
  }));

  return (
    <AppShell title="Offers & Campaigns" subtitle="What you sell, and how people hear about it">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Offers" value={offerRows.length} />
        <StatCard
          label="Active offers"
          value={offerRows.filter((o) => o["status"] === "active").length}
          tone="positive"
        />
        <StatCard label="Active campaigns" value={activeCampaigns.length} />
        <StatCard
          label="Best-fit channels"
          value={cfg.priorityChannels.slice(0, 3).join(" · ")}
          hint={`Typical for ${org?.["niche"] ?? "your category"}`}
        />
        <StatCard label="Active budget" value={money(budget, currency)} />
      </div>

      <div className="space-y-4">
        <CrudPanel
          table="offers"
          orgId={orgId}
          title="Offers"
          description="Packages, promotions and services you actively sell"
          emptyTitle="No offers yet"
          emptyDescription="Create one clear offer with a price and a reason to buy now."
          queryOpts={{ order: { column: "created_at" } }}
          fields={[
            { name: "name", label: "Offer name", required: true },
            { name: "status", label: "Status", type: "select", options: STATUS },
            { name: "price", label: "Price", type: "number" },
            { name: "cost", label: "Cost to deliver", type: "number" },
            { name: "start_date", label: "Starts", type: "date" },
            { name: "end_date", label: "Ends", type: "date" },
            ...(segmentOptions.length
              ? [
                  {
                    name: "segment_id",
                    label: "For segment",
                    type: "select" as const,
                    options: segmentOptions,
                    inTable: false,
                  },
                ]
              : []),
            { name: "cta", label: "Call to action", inTable: false },
            { name: "description", label: "Description", type: "textarea", inTable: false },
          ]}
        />

        <CrudPanel
          table="campaigns"
          orgId={orgId}
          title="Campaigns"
          description="Every push you run to get the offer seen"
          emptyTitle="No campaigns yet"
          emptyDescription="Pick one channel, one offer and one clear message."
          queryOpts={{ order: { column: "created_at" } }}
          fields={[
            { name: "name", label: "Campaign name", required: true },
            {
              name: "results",
              label: "Results",
              inForm: false,
              render: (row) => {
                const cid = row["id"];
                const cLeads = leadRows.filter((l) => l["campaign_id"] === cid);
                const won = cLeads.filter((l) => l["status"] === "won").length;
                const rev = sum(revRows.filter((r) => r["campaign_id"] === cid));
                return (
                  <div className="text-xs text-muted-foreground">
                    <span className="num font-medium text-foreground">{cLeads.length}</span> leads ·{" "}
                    <span className="num font-medium text-foreground">{won}</span> won ·{" "}
                    <span className="num font-medium text-foreground">{money(rev, currency)}</span>
                  </div>
                );
              },
            },
            {
              name: "channel",
              label: "Channel",
              type: "select",
              required: true,
              options: CHANNELS.map((c) => ({ value: c, label: c })),
            },
            { name: "status", label: "Status", type: "select", options: STATUS },
            { name: "budget", label: "Budget", type: "number" },
            { name: "start_date", label: "Starts", type: "date" },
            { name: "end_date", label: "Ends", type: "date" },
            ...(offerOptions.length
              ? [
                  {
                    name: "offer_id",
                    label: "Promoting offer",
                    type: "select" as const,
                    options: offerOptions,
                    inTable: false,
                  },
                ]
              : []),
            { name: "target_audience", label: "Target audience", inTable: false },
            { name: "notes", label: "Notes", type: "textarea", inTable: false },
          ]}
        />
      </div>
    </AppShell>
  );
}
