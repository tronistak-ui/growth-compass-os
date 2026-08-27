import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel, type Field } from "@/components/growth/crud";
import { KanbanBoard } from "@/components/growth/kanban";
import { StatCard, StatusPill } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrg, useRows, useSaveRow, type Row } from "@/lib/growth";
import { CHANNELS, lexicon, leadStages } from "@/lib/niches";
import { pct, money } from "@/lib/metrics";
import { todayInBusinessTimezone } from "@/lib/date";
import { cn } from "@/lib/utils";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: `Leads & follow-ups — ${BRAND_FULL}` },
      {
        name: "description",
        content:
          "Track every enquiry from new lead to won, with sources, stages and follow-up dates.",
      },
      { property: "og:title", content: `Leads & follow-ups — ${BRAND_FULL}` },
      { property: "og:description", content: "A simple pipeline for enquiries and follow-ups." },
    ],
  }),
  component: LeadsPage,
});

const INTERACTION_TYPES = ["call", "email", "message", "meeting", "visit", "note"];

function LeadsPage() {
  const { org, orgId } = useActiveOrg();
  const lex = lexicon(org?.["niche"]);
  const currency = (org?.["currency"] as string) ?? "USD";
  const { data: leads } = useRows("leads", orgId, { order: { column: "created_at" } });
  const { data: campaigns } = useRows("campaigns", orgId, { order: { column: "created_at" } });
  const { data: offers } = useRows("offers", orgId, { order: { column: "created_at" } });

  const rows = leads ?? [];
  const won = rows.filter((r) => r["status"] === "won").length;
  const today = todayInBusinessTimezone();
  const due = rows.filter((r) => r["next_follow_up"] && r["next_follow_up"] <= today).length;

  const [view, setView] = useState<"table" | "kanban">("table");
  const [detailId, setDetailId] = useState<string | null>(null);
  const stages = leadStages(org?.["niche"]);

  const campaignOptions = (campaigns ?? []).map((c) => ({
    value: String(c["id"]),
    label: String(c["name"]),
  }));
  const offerOptions = (offers ?? []).map((o) => ({
    value: String(o["id"]),
    label: String(o["name"]),
  }));
  const campaignNameById = new Map(campaignOptions.map((c) => [c.value, c.label]));
  const offerNameById = new Map(offerOptions.map((o) => [o.value, o.label]));
  const leadCampaignName = (row: Row) => campaignNameById.get(String(row["campaign_id"] ?? "")) ?? "";
  const leadOfferName = (row: Row) => offerNameById.get(String(row["offer_id"] ?? "")) ?? "";

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
            csvValue: leadCampaignName,
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
            csvValue: leadOfferName,
          },
        ]
      : []),
    { name: "last_contact", label: "Last contact", type: "date" as const, inTable: false },
    { name: "next_follow_up", label: "Next follow-up", type: "date" as const },
    { name: "notes", label: "Notes", type: "textarea" as const, inTable: false },
  ];

  // A separate array from `fields` — KanbanBoard's edit dialog renders every
  // field it's given as a form input with no `inForm`/`render` filtering, so
  // a button-only column would show up there as a broken empty input. Table
  // view (CrudPanel) does respect `inForm`/`render`, so only it gets this.
  const tableFields: Field[] = [
    ...fields,
    {
      name: "activity",
      label: "",
      inForm: false,
      render: (r: Row) => (
        <Button variant="ghost" size="sm" onClick={() => setDetailId(String(r["id"]))}>
          Activity
        </Button>
      ),
    },
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
          csv
          bulkActions
          title={`${lex.leads} pipeline`}
          description="Add enquiries, move them through stages and never lose a follow-up."
          queryOpts={{ order: { column: "created_at" } }}
          emptyTitle={`No ${lex.leads.toLowerCase()} yet`}
          emptyDescription="Add your first enquiry to start tracking conversion."
          fields={tableFields}
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
          onActivity={(row) => setDetailId(String(row["id"]))}
          money={(v) => money(v, currency)}
        />
      )}

      <LeadDetail leadId={detailId} orgId={orgId} onClose={() => setDetailId(null)} />
    </AppShell>
  );
}

function LeadDetail({
  leadId,
  orgId,
  onClose,
}: {
  leadId: string | null;
  orgId: string | undefined;
  onClose: () => void;
}) {
  const { data: leads } = useRows("leads", orgId, { order: { column: "created_at" } });
  const { data: interactions } = useRows(
    "interactions",
    orgId,
    leadId ? { filters: [["lead_id", leadId]], order: { column: "occurred_at" } } : {},
  );
  const saveInteraction = useSaveRow("interactions", orgId);
  const saveLead = useSaveRow("leads", orgId);

  const lead = (leads ?? []).find((l) => l["id"] === leadId) ?? null;
  const interactionRows = interactions ?? [];

  function logInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) return;
    const form = new FormData(e.currentTarget);
    const type = String(form.get("type") ?? "note");
    const summary = String(form.get("summary") ?? "");
    const occurred = String(form.get("occurred_at") ?? new Date().toISOString().slice(0, 10));
    const nextFollowUp = String(form.get("next_follow_up") ?? "").trim();
    if (!summary.trim()) {
      toast.error("Add a short summary");
      return;
    }
    saveInteraction.mutate(
      // occurred_at is a `timestamp` column (Date-object mode in Drizzle,
      // unlike the plain-string `date` columns like next_follow_up below) —
      // a bare string here fails server-side with "value.toISOString is not
      // a function".
      { lead_id: leadId, type, summary, occurred_at: new Date(occurred) },
      {
        onSuccess: () => {
          // Logging a touch is what "uncontacted"/"follow-ups due" on the
          // dashboard actually track — never regress last_contact to an
          // earlier date if a more recent one is already on file (e.g.
          // backdating a note about a call from last week).
          const currentLastContact = String(lead?.["last_contact"] ?? "");
          const updates: Record<string, unknown> = { id: leadId };
          if (!currentLastContact || occurred >= currentLastContact) {
            updates["last_contact"] = occurred;
          }
          if (nextFollowUp) updates["next_follow_up"] = nextFollowUp;
          if (Object.keys(updates).length > 1) {
            saveLead.mutate(updates, {
              onError: (e: any) => toast.error(e.message ?? "Logged, but couldn't update the lead"),
            });
          }
          toast.success("Interaction logged");
          (e.target as HTMLFormElement).reset();
        },
        onError: (e: any) => toast.error(e.message ?? "Could not log"),
      },
    );
  }

  return (
    <Dialog open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead?.["name"] ?? "Lead"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 text-sm">
            <div className="text-xs tracking-wider text-muted-foreground uppercase">Contact</div>
            <div>{lead?.["phone"] || "—"}</div>
            <div className="text-muted-foreground">{lead?.["email"] || "—"}</div>
            {lead?.["source"] && <StatusPill value={String(lead["source"])} />}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="text-xs tracking-wider text-muted-foreground uppercase">Status</div>
            <div>Last contact: {lead?.["last_contact"] ? String(lead["last_contact"]) : "Never"}</div>
            <div>Next follow-up: {lead?.["next_follow_up"] ? String(lead["next_follow_up"]) : "—"}</div>
          </div>
        </div>

        <div className="mt-2">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Log interaction
          </h4>
          <form onSubmit={logInteraction} className="grid gap-2 sm:grid-cols-2">
            <Select name="type" defaultValue="call">
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="occurred_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <Input name="summary" placeholder="What happened" className="sm:col-span-2" />
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Next follow-up (optional)</label>
              <Input name="next_follow_up" type="date" />
            </div>
            <Button type="submit" size="sm" disabled={saveInteraction.isPending} className="sm:col-span-2">
              Log
            </Button>
          </form>
        </div>

        <div className="mt-2">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Activity log
          </h4>
          {interactionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {interactionRows
                .slice()
                .reverse()
                .slice(0, 10)
                .map((i) => (
                  <li key={i["id"]} className="rounded-md border border-border px-3 py-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <StatusPill value={String(i["type"])} />
                      <span className="num text-xs text-muted-foreground">
                        {String(i["occurred_at"] ?? "").slice(0, 10)}
                      </span>
                    </div>
                    <div className="mt-1 text-foreground/90">{i["summary"]}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
