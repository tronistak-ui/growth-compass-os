import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { KanbanBoard } from "@/components/growth/kanban";
import { StatCard, StatusPill } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { useActiveOrg, useRows, useSaveRow, type Row } from "@/lib/growth";
import { CHANNELS, lexicon, leadStages } from "@/lib/niches";
import { pct, money } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads & follow-ups — TrendZypher Growth OS" },
      {
        name: "description",
        content:
          "Track every enquiry from new lead to won, with sources, stages and follow-up dates.",
      },
      { property: "og:title", content: "Leads & follow-ups — TrendZypher Growth OS" },
      { property: "og:description", content: "A simple pipeline for enquiries and follow-ups." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { org, orgId } = useActiveOrg();
  const lex = lexicon(org?.["niche"]);
  const currency = (org?.["currency"] as string) ?? "USD";
  const { data: leads } = useRows("leads", orgId, { order: { column: "created_at" } });
  const { data: campaigns } = useRows("campaigns", orgId, { order: { column: "created_at" } });
  const { data: offers } = useRows("offers", orgId, { order: { column: "created_at" } });

  const rows = leads ?? [];
  const won = rows.filter((r) => r["status"] === "won").length;
  const today = new Date().toISOString().slice(0, 10);
  const due = rows.filter((r) => r["next_follow_up"] && r["next_follow_up"] <= today).length;

  const [view, setView] = useState<"table" | "kanban">("table");
  const stages = leadStages(org?.["niche"]);

  const campaignOptions = (campaigns ?? []).map((c) => ({
    value: String(c["id"]),
    label: String(c["name"]),
  }));
  const offerOptions = (offers ?? []).map((o) => ({
    value: String(o["id"]),
    label: String(o["name"]),
  }));

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "phone", label: "Phone", type: "tel" as const },
    { name: "email", label: "Email", type: "email" as const, inTable: false },
    {
      name: "source",
      label: "Source",
      type: "select" as const,
      options: CHANNELS.map((c) => ({ value: c, label: c })),
    },
    {
      name: "status",
      label: "Stage",
      type: "select" as const,
      options: stages.map((s) => ({ value: s.key, label: s.label })),
      render: (r: Row) => {
        const raw = String(r["status"] ?? "new");
        return <StatusPill value={raw} label={stages.find((s) => s.key === raw)?.label} />;
      },
    },
    { name: "value", label: "Estimated value", type: "number" as const },
    ...(campaignOptions.length
      ? [
          {
            name: "campaign_id",
            label: "Campaign",
            type: "select" as const,
            options: campaignOptions,
            inTable: false,
          },
        ]
      : []),
    ...(offerOptions.length
      ? [
          {
            name: "offer_id",
            label: "Offer",
            type: "select" as const,
            options: offerOptions,
            inTable: false,
          },
        ]
      : []),
    { name: "last_contact", label: "Last contact", type: "date" as const, inTable: false },
    { name: "next_follow_up", label: "Next follow-up", type: "date" as const },
    { name: "notes", label: "Notes", type: "textarea" as const, inTable: false },
  ];

  const saveLead = useSaveRow("leads", orgId);
  function saveKanban(values: Row) {
    saveLead.mutate(values, {
      onSuccess: () => toast.success("Saved"),
      onError: (e: any) => toast.error(e.message ?? "Could not save"),
    });
  }

  return (
    <AppShell title={lex.leads} subtitle="Every enquiry, one pipeline">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Total ${lex.leads.toLowerCase()}`} value={rows.length} />
        <StatCard label="Won" value={won} tone="positive" />
        <StatCard label="Win rate" value={pct(rows.length ? (won / rows.length) * 100 : 0)} />
        <StatCard label="Follow-ups due" value={due} tone={due > 0 ? "negative" : "default"} />
      </div>

      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
          {(["table", "kanban"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <CrudPanel
          table="leads"
          orgId={orgId}
          title={`${lex.leads} pipeline`}
          description="Add enquiries, move them through stages and never lose a follow-up."
          queryOpts={{ order: { column: "created_at" } }}
          emptyTitle={`No ${lex.leads.toLowerCase()} yet`}
          emptyDescription="Add your first enquiry to start tracking conversion."
          fields={fields}
          defaults={{ status: "new" }}
        />
      ) : (
        <KanbanBoard
          stages={stages}
          rows={rows}
          fields={fields}
          defaults={{ status: "new" } as Row}
          statusField="status"
          save={saveKanban}
          money={(v) => money(v, currency)}
        />
      )}
    </AppShell>
  );
}
