import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { StatCard, StatusPill } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_FULL } from "@/lib/brand";
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
import { CHANNELS, lexicon, EXPENSE_CATEGORIES } from "@/lib/niches";
import { useOrgData } from "@/lib/use-org-data";
import { money, pct, sum, type CustomerSegment } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: `Customers — ${BRAND_FULL}` },
      {
        name: "description",
        content: "A simple CRM for repeat business: profiles, purchase history and retention.",
      },
      { property: "og:title", content: `Customers — ${BRAND_FULL}` },
      { property: "og:description", content: "Track customers, repeat rate and lifetime value." },
    ],
  }),
  component: CustomersPage,
});

const INTERACTION_TYPES = ["call", "email", "message", "meeting", "visit", "note"];

function CustomersPage() {
  const { org, orgId } = useActiveOrg();
  const d = useOrgData();
  const lex = lexicon(org?.["niche"]);
  const currency = d.currency;
  const [profileId, setProfileId] = useState<string | null>(null);
  const ltv = d.metrics.totalCustomers ? d.metrics.totalRevenue / d.metrics.totalCustomers : 0;

  const { data: segments } = useRows("customer_segments", orgId, {
    order: { column: "created_at" },
  });
  const segmentOptions = (segments ?? []).map((s) => ({
    value: String(s["id"]),
    label: String(s["name"]),
  }));

  // Per-customer spend + purchase count from revenue.
  const spend = new Map<string, { total: number; count: number; last: string | null }>();
  for (const t of d.revenue) {
    const cid = t["customer_id"];
    if (!cid) continue;
    const cur = spend.get(cid) ?? { total: 0, count: 0, last: null };
    cur.total += Number(t["amount"] ?? 0);
    cur.count += 1;
    const on = String(t["occurred_on"] ?? "");
    if (!cur.last || on > cur.last) cur.last = on;
    spend.set(cid, cur);
  }

  const lifecycleSegments = d.metrics.customerSegments;
  const segmentCounts: Record<CustomerSegment, number> = {
    VIP: 0,
    New: 0,
    Active: 0,
    "At Risk": 0,
    Lost: 0,
  };
  for (const seg of lifecycleSegments.values()) segmentCounts[seg]++;

  return (
    <AppShell title={lex.customers} subtitle="Lightweight CRM built for repeat business">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Total ${lex.customers.toLowerCase()}`} value={d.metrics.totalCustomers} />
        <StatCard label="New this month" value={d.metrics.newCustomersThisMonth} tone="positive" />
        <StatCard label="Repeat rate" value={pct(d.metrics.repeatRate, 0)} />
        <StatCard label="Avg. lifetime value" value={money(ltv, currency)} />
      </div>

      <div className="mb-5 grid grid-cols-5 gap-2">
        {(["VIP", "New", "Active", "At Risk", "Lost"] as const).map((seg) => (
          <div key={seg} className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-center">
            <div className="num text-lg font-semibold text-ink">{segmentCounts[seg]}</div>
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {seg}
            </div>
          </div>
        ))}
      </div>

      <CrudPanel
        table="customers"
        orgId={orgId}
        csv
        bulkActions
        title={`${lex.customers} list`}
        description="Store contact details and notes for every relationship you want to keep."
        queryOpts={{ order: { column: "created_at" } }}
        emptyTitle={`No ${lex.customers.toLowerCase()} yet`}
        emptyDescription="Add someone who already bought from you."
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "email", label: "Email", type: "email" },
          {
            name: "source",
            label: "Source",
            type: "select",
            options: CHANNELS.map((c) => ({ value: c, label: c })),
          },
          {
            name: "lifecycle_segment",
            label: "Segment",
            inForm: false,
            render: (row) => <SegmentPill segment={lifecycleSegments.get(row["id"]) ?? "New"} />,
          },
          {
            name: "spent",
            label: "Spent",
            inForm: false,
            render: (row) => {
              const s = spend.get(row["id"]);
              return (
                <span className="num font-medium text-foreground">
                  {s ? money(s.total, currency) : "—"}
                </span>
              );
            },
          },
          {
            name: "purchases",
            label: `${lex.purchases}`,
            inForm: false,
            render: (row) => {
              const s = spend.get(row["id"]);
              return <span className="num">{s ? s.count : 0}</span>;
            },
          },
          { name: "customer_since", label: `${lex.customer} since`, type: "date", inTable: false },
          ...(segmentOptions.length
            ? [
                {
                  name: "segment_id",
                  label: "Segment",
                  type: "select" as const,
                  options: segmentOptions,
                  inTable: false,
                },
              ]
            : []),
          { name: "tags", label: "Tags", type: "tags" as const, inTable: false },
          { name: "notes", label: "Notes", type: "textarea", inTable: false },
          {
            name: "profile",
            label: "",
            inForm: false,
            render: (row) => (
              <Button variant="ghost" size="sm" onClick={() => setProfileId(row["id"])}>
                Profile
              </Button>
            ),
          },
        ]}
      />

      <CustomerProfile
        customerId={profileId}
        orgId={orgId}
        currency={currency}
        revenueRows={d.revenue}
        spend={spend}
        onClose={() => setProfileId(null)}
      />
    </AppShell>
  );
}

function CustomerProfile({
  customerId,
  orgId,
  currency,
  revenueRows,
  spend,
  onClose,
}: {
  customerId: string | null;
  orgId: string | undefined;
  currency: string;
  revenueRows: Row[];
  spend: Map<string, { total: number; count: number; last: string | null }>;
  onClose: () => void;
}) {
  const { data: interactions } = useRows(
    "interactions",
    orgId,
    customerId ? { filters: [["customer_id", customerId]], order: { column: "occurred_on" } } : {},
  );
  const { data: customers } = useRows("customers", orgId, { order: { column: "created_at" } });
  const saveInteraction = useSaveRow("interactions", orgId);

  const customer = (customers ?? []).find((c) => c["id"] === customerId) ?? null;
  const s = customerId ? spend.get(customerId) : undefined;
  const purchases = revenueRows.filter((r) => r["customer_id"] === customerId);
  const interactionRows = interactions ?? [];
  const aov = s && s.count ? s.total / s.count : 0;

  function logInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) return;
    const form = new FormData(e.currentTarget);
    const type = String(form.get("type") ?? "note");
    const summary = String(form.get("summary") ?? "");
    const occurred = String(form.get("occurred_at") ?? new Date().toISOString().slice(0, 10));
    if (!summary.trim()) {
      toast.error("Add a short summary");
      return;
    }
    saveInteraction.mutate(
      // occurred_at is a `timestamp` column (Date-object mode in Drizzle) —
      // a bare string fails server-side with "value.toISOString is not a
      // function". Pre-existing bug, caught while building the lead-side
      // equivalent of this same interaction log.
      { customer_id: customerId, type, summary, occurred_at: new Date(occurred) },
      {
        onSuccess: () => {
          toast.success("Interaction logged");
          (e.target as HTMLFormElement).reset();
        },
        onError: (e: any) => toast.error(e.message ?? "Could not log"),
      },
    );
  }

  return (
    <Dialog open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer?.["name"] ?? "Customer"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 text-sm">
            <div className="text-xs tracking-wider text-muted-foreground uppercase">Contact</div>
            <div>{customer?.["phone"] || "—"}</div>
            <div className="text-muted-foreground">{customer?.["email"] || "—"}</div>
            {customer?.["source"] && (
              <StatusPill value={String(customer["source"])} />
            )}
            {customer?.["tags"]?.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {(customer["tags"] as string[]).map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Total spent" value={s ? money(s.total, currency) : "—"} />
            <MiniStat label={`${"Purchases"}`} value={s ? String(s.count) : "0"} />
            <MiniStat label="Avg. order" value={money(aov, currency)} />
            <MiniStat label="Last purchase" value={s?.last ? String(s.last).slice(5) : "—"} />
          </div>
        </div>

        <div className="mt-2">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {`Purchase history (${purchases.length})`}
          </h4>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {purchases.slice(0, 8).map((p) => (
                <li
                  key={p["id"]}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
                >
                  <span className="text-foreground/90">
                    {p["product_service"] || "—"}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {String(p["occurred_on"] ?? "").slice(5)}
                    </span>
                  </span>
                  <span className="num font-medium">{money(Number(p["amount"] ?? 0), currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Log interaction
          </h4>
          <form onSubmit={logInteraction} className="grid gap-2 sm:grid-cols-[120px_1fr_140px_auto]">
            <Select name="type" defaultValue="note">
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
            <Input name="summary" placeholder="What happened" />
            <Input name="occurred_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <Button type="submit" size="sm" disabled={saveInteraction.isPending}>
              Log
            </Button>
          </form>
        </div>

        <div className="mt-2">
          <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Interaction log
          </h4>
          {interactionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {interactionRows.slice(0, 10).map((i) => (
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

const SEGMENT_TONE: Record<CustomerSegment, string> = {
  VIP: "bg-primary/15 text-primary",
  New: "bg-info/10 text-info",
  Active: "bg-success/10 text-success",
  "At Risk": "bg-warning/10 text-warning",
  Lost: "bg-destructive/10 text-destructive",
};

function SegmentPill({ segment }: { segment: CustomerSegment }) {
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium", SEGMENT_TONE[segment])}>
      {segment}
    </span>
  );
}
