/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel, EmptyState, LoadingRows, StatusPill } from "./ui";
import { useRows, useSaveRow, useDeleteRow, type Row, type QueryOpts } from "@/lib/growth";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "switch" | "email" | "tel" | "tags";
  options?: { value: string; label: string }[];
  required?: boolean;
  inTable?: boolean;
  inForm?: boolean;
  render?: (row: Row) => ReactNode;
  placeholder?: string;
};

export function CrudPanel({
  table,
  orgId,
  title,
  description,
  fields,
  defaults = {},
  queryOpts,
  emptyTitle,
  emptyDescription,
  extraActions,
}: {
  table: string;
  orgId?: string | undefined;
  title: string;
  description?: string | undefined;
  fields: Field[];
  defaults?: Row;
  queryOpts?: QueryOpts | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  extraActions?: ReactNode | undefined;
}) {
  const { data: rows, isLoading } = useRows(table, orgId, queryOpts ?? {});
  const save = useSaveRow(table, orgId);
  const remove = useDeleteRow(table, orgId);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  const cols = fields.filter((f) => f.inTable !== false);
  const filtered = useMemo(() => {
    const list = rows ?? [];
    if (!term.trim()) return list;
    const t = term.toLowerCase();
    return list.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, term]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Row = { id: editing?.["id"] };
    for (const f of fields) {
      const raw = form.get(f.name);
      if (f.type === "switch") values[f.name] = form.get(f.name) === "on";
      else if (f.type === "number") values[f.name] = raw === "" || raw == null ? 0 : Number(raw);
      else if (f.type === "tags")
        values[f.name] =
          raw === "" || raw == null
            ? []
            : String(raw)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
      else values[f.name] = raw === "" ? null : raw;
    }
    save.mutate(
      { ...defaults, ...values },
      {
        onSuccess: () => {
          toast.success(editing?.["id"] ? "Changes saved" : "Created");
          setEditing(null);
        },
        onError: (err: any) => toast.error(err.message ?? "Could not save"),
      },
    );
  }

  return (
    <Panel
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          {extraActions}
          <div className="relative hidden sm:block">
            <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search"
              className="h-9 w-44 pl-8"
            />
          </div>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="mr-1 size-4" /> New
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? `No ${title.toLowerCase()} yet`}
          description={emptyDescription}
          action={
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus className="mr-1 size-4" /> Add the first one
            </Button>
          }
        />
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {cols.map((f) => (
                  <th
                    key={f.name}
                    className="px-5 py-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="w-20 px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row["id"]} className="border-b border-border/60 last:border-0">
                  {cols.map((f) => (
                    <td key={f.name} className="px-5 py-2.5 align-top">
                      {f.render ? (
                        f.render(row)
                      ) : f.name.includes("status") ||
                        f.name === "priority" ||
                        f.name === "stage" ? (
                        <StatusPill value={String(row[f.name] ?? "—")} />
                      ) : f.type === "number" ? (
                        <span className="num">{Number(row[f.name] ?? 0).toLocaleString()}</span>
                      ) : f.type === "switch" ? (
                        <span className="text-xs">{row[f.name] ? "Yes" : "No"}</span>
                      ) : (
                        <span className="line-clamp-2 text-foreground/90">
                          {row[f.name] == null || row[f.name] === "" ? "—" : String(row[f.name])}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(row["id"])}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.["id"] ? "Edit" : "New"} {title.replace(/s$/, "")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields
              .filter((f) => f.inForm !== false)
              .map((f) => (
              <div
                key={f.name}
                className={f.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
              >
                <Label htmlFor={f.name}>{f.label}</Label>
                <FieldInput field={f} value={editing?.[f.name]} />
              </div>
            ))}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId &&
                remove.mutate(deleteId, {
                  onSuccess: () => toast.success("Deleted"),
                  onError: (e: any) => toast.error(e.message),
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

export function FieldInput({ field, value }: { field: Field; value: any }) {
  const [selectValue, setSelectValue] = useState<string>(
    value == null ? "" : String(value),
  );

  if (field.type === "textarea")
    return (
      <Textarea
        id={field.name}
        name={field.name}
        defaultValue={value ?? ""}
        placeholder={field.placeholder}
        rows={3}
        required={field.required}
      />
    );

  if (field.type === "tags")
    return (
      <Input
        id={field.name}
        name={field.name}
        defaultValue={Array.isArray(value) ? value.join(", ") : (value ?? "")}
        placeholder={field.placeholder ?? "Comma-separated"}
        required={field.required}
      />
    );

  if (field.type === "select")
    return (
      <>
        <input type="hidden" name={field.name} value={selectValue} />
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );

  if (field.type === "switch")
    return (
      <div className="flex h-9 items-center">
        <Switch name={field.name} defaultChecked={!!value} />
      </div>
    );

  return (
    <Input
      id={field.name}
      name={field.name}
      type={field.type ?? "text"}
      step={field.type === "number" ? "any" : undefined}
      defaultValue={value ?? ""}
      placeholder={field.placeholder}
      required={field.required}
    />
  );
}
