/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Pencil, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "./ui";
import { FieldInput, type Field } from "./crud";
import type { Row } from "@/lib/growth";

type Stage = { key: string; label: string };

export function KanbanBoard({
  stages,
  rows,
  fields,
  defaults,
  statusField = "status",
  save,
  onEdit,
  onActivity,
  money,
}: {
  stages: Stage[];
  rows: Row[];
  fields: Field[];
  defaults?: Row;
  statusField?: string;
  save: (values: Row, opts?: any) => void;
  onEdit?: (row: Row) => void;
  /** Optional second action per card, separate from the edit-fields dialog — e.g. logging an interaction. */
  onActivity?: (row: Row) => void;
  money?: (v: number) => string;
}) {
  const [editing, setEditing] = useState<Row | null>(null);
  const groups = stages.map((s) => ({
    ...s,
    items: rows.filter((r) => (r[statusField] ?? "new") === s.key),
  }));

  function open(row: Row) {
    if (onEdit) onEdit(row);
    else setEditing(row);
  }

  function changeStage(row: Row, newStatus: string) {
    save({ ...defaults, ...row, [statusField]: newStatus });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Row = { id: editing?.["id"] };
    for (const f of fields) {
      const raw = form.get(f.name);
      if (f.type === "switch") values[f.name] = form.get(f.name) === "on";
      else if (f.type === "number")
        values[f.name] = raw === "" || raw == null ? 0 : Number(raw);
      else values[f.name] = raw === "" ? null : raw;
    }
    save({ ...defaults, ...values });
    setEditing(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {groups.map((g) => (
        <div key={g.key} className="flex w-72 shrink-0 flex-col">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {g.label}
              <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {g.items.length}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setEditing({ ...defaults, [statusField]: g.key })}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-surface-2/60 p-2">
            {g.items.length === 0 && (
              <div className="px-2 py-6 text-center text-[11px] text-muted-foreground/70">
                Empty
              </div>
            )}
            {g.items.map((row) => (
              <KanbanCard
                key={row["id"]}
                row={row}
                fields={fields}
                stages={stages}
                statusField={statusField}
                onOpen={() => open(row)}
                onChangeStage={(s) => changeStage(row, s)}
                onActivity={onActivity ? () => onActivity(row) : undefined}
                money={money}
              />
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.["id"] ? "Edit" : "New"} lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.name}
                className={
                  f.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"
                }
              >
                <Label htmlFor={f.name}>{f.label}</Label>
                <FieldInput field={f} value={editing?.[f.name]} />
              </div>
            ))}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanCard({
  row,
  fields,
  stages,
  statusField,
  onOpen,
  onChangeStage,
  onActivity,
  money,
}: {
  row: Row;
  fields: Field[];
  stages: Stage[];
  statusField: string;
  onOpen: () => void;
  onChangeStage: (s: string) => void;
  onActivity?: (() => void) | undefined;
  money: ((v: number) => string) | undefined;
}) {
  const valueField = fields.find((f) => f.name === "value" || f.name === "amount");
  const sourceField = fields.find((f) => f.name === "source");
  const followField = fields.find((f) => f.name === "next_follow_up" || f.name === "due_date");
  const value = valueField ? Number(row[valueField.name] ?? 0) : 0;
  return (
    <div className="cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="truncate text-sm font-medium text-ink">
            {String(row["name"] ?? row["title"] ?? "Untitled")}
          </div>
          {sourceField && row["source"] && (
            <div className="mt-1">
              <StatusPill value={String(row["source"])} />
            </div>
          )}
        </button>
        {onActivity && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            title="Log activity"
            onClick={onActivity}
          >
            <MessageSquare className="size-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-6 shrink-0" title="Edit" onClick={onOpen}>
          <Pencil className="size-3" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {valueField && value > 0 && money && (
          <span className="num text-xs font-medium text-foreground/80">{money(value)}</span>
        )}
        {followField && row[followField.name] && (
          <span className="num text-[11px] text-muted-foreground">
            {String(row[followField.name]).slice(5)}
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-border pt-2">
        <Select value={String(row[statusField] ?? "new")} onValueChange={onChangeStage}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
