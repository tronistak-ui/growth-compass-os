/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/growth/shell";
import { Panel } from "@/components/growth/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrg, useRows, useSaveRow } from "@/lib/growth";
import { CHANNELS, EXPENSE_CATEGORIES } from "@/lib/niches";
import { todayInBusinessTimezone } from "@/lib/date";
import { money } from "@/lib/metrics";
import { BRAND_FULL } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/rapid-entry")({
  head: () => ({
    meta: [
      { title: `Rapid Entry — ${BRAND_FULL}` },
      {
        name: "description",
        content: "Catch up on a backlog — log sales, expenses and leads back to back without losing your place.",
      },
    ],
  }),
  component: RapidEntryPage,
});

type Kind = "revenue" | "expense" | "lead" | "customer" | "task";

type SessionEntry = { id: string; kind: Kind; label: string; detail: string; at: string };

const KIND_LABELS: Record<Kind, string> = {
  revenue: "Sale",
  expense: "Expense",
  lead: "Lead",
  customer: "Customer",
  task: "Task",
};

function RapidEntryPage() {
  const { orgId, org } = useActiveOrg();
  const currency = (org?.["currency"] as string) ?? "USD";
  const [tab, setTab] = useState<Kind>("revenue");
  const [log, setLog] = useState<SessionEntry[]>([]);

  function record(kind: Kind, label: string, detail: string) {
    setLog((l) => [
      { id: crypto.randomUUID(), kind, label, detail, at: new Date().toLocaleTimeString() },
      ...l,
    ]);
  }

  if (!orgId) return null;

  const counts = (["revenue", "expense", "lead", "customer", "task"] as const).map((k) => ({
    key: k,
    label: KIND_LABELS[k] + (k === "revenue" || k === "expense" ? "s" : "s"),
    count: log.filter((e) => e.kind === k).length,
  }));

  return (
    <AppShell
      title="Rapid Entry"
      subtitle="Catch up on a backlog — each save clears the form and keeps you going"
    >
      <div className="mb-5 grid grid-cols-5 gap-2">
        {counts.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-center">
            <div className="num text-lg font-semibold text-ink">{c.count}</div>
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Panel title="Log an entry" description="Submit and it clears — ready for the next one">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Kind)}>
            {/* px-1 + text-xs override the default px-3/text-sm — five tabs
                in this width otherwise clips "Customer" on a narrow phone. */}
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="revenue" className="px-1 text-xs">
                Sale
              </TabsTrigger>
              <TabsTrigger value="expense" className="px-1 text-xs">
                Expense
              </TabsTrigger>
              <TabsTrigger value="lead" className="px-1 text-xs">
                Lead
              </TabsTrigger>
              <TabsTrigger value="customer" className="px-1 text-xs">
                Customer
              </TabsTrigger>
              <TabsTrigger value="task" className="px-1 text-xs">
                Task
              </TabsTrigger>
            </TabsList>
            <TabsContent value="revenue" className="mt-4">
              <RevenueForm orgId={orgId} currency={currency} onLogged={record} />
            </TabsContent>
            <TabsContent value="expense" className="mt-4">
              <ExpenseForm orgId={orgId} currency={currency} onLogged={record} />
            </TabsContent>
            <TabsContent value="lead" className="mt-4">
              <LeadForm orgId={orgId} onLogged={record} />
            </TabsContent>
            <TabsContent value="customer" className="mt-4">
              <CustomerForm orgId={orgId} onLogged={record} />
            </TabsContent>
            <TabsContent value="task" className="mt-4">
              <TaskForm orgId={orgId} onLogged={record} />
            </TabsContent>
          </Tabs>
        </Panel>

        <Panel
          title="Logged this session"
          description={`${log.length} ${log.length === 1 ? "entry" : "entries"} — this list clears when you leave the page, the data doesn't`}
        >
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet — start on the left.</p>
          ) : (
            <ul className="max-h-[560px] space-y-1.5 overflow-y-auto">
              {log.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {KIND_LABELS[e.kind]}
                    </span>
                    <div className="truncate">
                      <span className="font-medium text-ink">{e.label}</span>
                      {e.detail && <span className="ml-2 text-muted-foreground">{e.detail}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{e.at}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function RevenueForm({
  orgId,
  currency,
  onLogged,
}: {
  orgId: string;
  currency: string;
  onLogged: (kind: Kind, label: string, detail: string) => void;
}) {
  const save = useSaveRow("revenue_transactions", orgId);
  const { data: customers } = useRows("customers", orgId, { order: { column: "name" } });
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [product, setProduct] = useState("");
  const [customerId, setCustomerId] = useState("");
  // Date and customer deliberately survive a submit, unlike amount/product —
  // a catch-up session is usually "yesterday's five sales", not five
  // different days, so re-picking the same date each time would be the
  // opposite of rapid.
  const [occurredOn, setOccurredOn] = useState(todayInBusinessTimezone());

  const customerOptions = (customers ?? []).map((c) => ({
    value: String(c["id"]),
    label: String(c["name"]),
  }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Add an amount");
      return;
    }
    const values: Record<string, unknown> = { amount: n, occurred_on: occurredOn };
    if (product) values["product_service"] = product;
    if (customerId) values["customer_id"] = customerId;
    save.mutate(values, {
      onSuccess: () => {
        onLogged("revenue", money(n, currency), product || occurredOn);
        setAmount("");
        setProduct("");
        amountRef.current?.focus();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not log sale"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Amount ({currency})</Label>
        <Input
          ref={amountRef}
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>What was sold</Label>
        <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Optional" />
      </div>
      {customerOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {customerOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Logging…" : "Log sale"}
      </Button>
    </form>
  );
}

function ExpenseForm({
  orgId,
  currency,
  onLogged,
}: {
  orgId: string;
  currency: string;
  onLogged: (kind: Kind, label: string, detail: string) => void;
}) {
  const save = useSaveRow("expenses", orgId);
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  // Category and date survive a submit — same reasoning as RevenueForm.
  const [category, setCategory] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayInBusinessTimezone());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Add an amount");
      return;
    }
    const values: Record<string, unknown> = { amount: n, occurred_on: occurredOn };
    if (category) values["category"] = category;
    if (description) values["description"] = description;
    save.mutate(values, {
      onSuccess: () => {
        onLogged("expense", money(n, currency), description || category || occurredOn);
        setAmount("");
        setDescription("");
        amountRef.current?.focus();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not log expense"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Amount ({currency})</Label>
        <Input
          ref={amountRef}
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Logging…" : "Log expense"}
      </Button>
    </form>
  );
}

function LeadForm({
  orgId,
  onLogged,
}: {
  orgId: string;
  onLogged: (kind: Kind, label: string, detail: string) => void;
}) {
  const save = useSaveRow("leads", orgId);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Add a name");
      return;
    }
    const values: Record<string, unknown> = { name, status: "new" };
    if (phone) values["phone"] = phone;
    if (source) values["source"] = source;
    save.mutate(values, {
      onSuccess: () => {
        onLogged("lead", name, source || "");
        setName("");
        setPhone("");
        setSource("");
        nameRef.current?.focus();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add lead"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
      </div>
      <div className="space-y-1.5">
        <Label>Source</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Adding…" : "Add lead"}
      </Button>
    </form>
  );
}

function CustomerForm({
  orgId,
  onLogged,
}: {
  orgId: string;
  onLogged: (kind: Kind, label: string, detail: string) => void;
}) {
  const save = useSaveRow("customers", orgId);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Add a name");
      return;
    }
    const values: Record<string, unknown> = { name };
    if (phone) values["phone"] = phone;
    if (source) values["source"] = source;
    save.mutate(values, {
      onSuccess: () => {
        onLogged("customer", name, source || "");
        setName("");
        setPhone("");
        setSource("");
        nameRef.current?.focus();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add customer"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
      </div>
      <div className="space-y-1.5">
        <Label>Source</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Adding…" : "Add customer"}
      </Button>
    </form>
  );
}

function TaskForm({
  orgId,
  onLogged,
}: {
  orgId: string;
  onLogged: (kind: Kind, label: string, detail: string) => void;
}) {
  const save = useSaveRow("tasks", orgId);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }
    const values: Record<string, unknown> = { title, status: "todo", priority: "medium" };
    if (dueDate) values["due_date"] = dueDate;
    save.mutate(values, {
      onSuccess: () => {
        onLogged("task", title, dueDate || "");
        setTitle("");
        setDueDate("");
        titleRef.current?.focus();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add task"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label>Due date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
