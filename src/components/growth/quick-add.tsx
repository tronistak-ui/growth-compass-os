/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useActiveOrg, useSaveRow } from "@/lib/growth";
import { CHANNELS, EXPENSE_CATEGORIES } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A floating "+" reachable from any page — the most repeated actions
 * (log a lead, a customer, an expense, a task) without navigating away
 * from whatever you're looking at. Deliberately a handful of fields, not
 * the full form — this is for capturing something fast, not editing it.
 */
export function QuickAdd() {
  const { orgId, org } = useActiveOrg();
  const [open, setOpen] = useState(false);

  if (!orgId) return null;

  return (
    <>
      <Button
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-30 size-12 rounded-full shadow-lg lg:right-8 lg:bottom-8"
        aria-label="Quick add"
      >
        <Plus className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="lead">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lead">Lead</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="task">Task</TabsTrigger>
            </TabsList>
            <TabsContent value="lead" className="mt-4">
              <QuickLeadForm orgId={orgId} onDone={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="customer" className="mt-4">
              <QuickCustomerForm orgId={orgId} onDone={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="expense" className="mt-4">
              <QuickExpenseForm orgId={orgId} currency={String(org?.["currency"] ?? "USD")} onDone={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="task" className="mt-4">
              <QuickTaskForm orgId={orgId} onDone={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuickLeadForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const save = useSaveRow("leads", orgId);
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
        toast.success("Lead added");
        onDone();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add lead"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
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

function QuickCustomerForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const save = useSaveRow("customers", orgId);
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
        toast.success("Customer added");
        onDone();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add customer"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
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

function QuickExpenseForm({
  orgId,
  currency,
  onDone,
}: {
  orgId: string;
  currency: string;
  onDone: () => void;
}) {
  const save = useSaveRow("expenses", orgId);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) {
      toast.error("Add an amount");
      return;
    }
    const values: Record<string, unknown> = {
      amount: n,
      occurred_on: new Date().toISOString().slice(0, 10),
    };
    if (category) values["category"] = category;
    if (description) values["description"] = description;
    save.mutate(values, {
      onSuccess: () => {
        toast.success("Expense logged");
        onDone();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not log expense"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Amount ({currency})</Label>
        <Input
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
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Logging…" : "Log expense"}
      </Button>
    </form>
  );
}

function QuickTaskForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const save = useSaveRow("tasks", orgId);
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
        toast.success("Task added");
        onDone();
      },
      onError: (e: any) => toast.error(e.message ?? "Could not add task"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
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
