/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { parseCsvToObjects, downloadCsv } from "@/lib/csv";
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
import { Panel, EmptyState, ErrorState, LoadingRows, StatusPill } from "./ui";
import { useRows, useSaveRow, useDeleteRow, type Row, type QueryOpts } from "@/lib/growth";
import { cn } from "@/lib/utils";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "switch" | "email" | "tel" | "tags";
  options?: { value: string; label: string }[];
  required?: boolean;
  inTable?: boolean;
  inForm?: boolean;
  render?: (row: Row) => ReactNode;
  /**
   * Overrides the exported CSV cell for this field — for a foreign-key
   * `select` field (e.g. customer_id), the raw stored value is a UUID with
   * no meaning outside this database; this lets the field's actual label
   * (e.g. the customer's name) go into the file instead.
   */
  csvValue?: (row: Row) => string | number;
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
  csv = false,
  bulkActions = false,
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
  /** Adds Import/Export CSV buttons, keyed off `fields[].name` as the column headers. */
  csv?: boolean;
  /** Adds row checkboxes plus a bulk-delete (and, if a `status` field exists, bulk-status) bar. */
  bulkActions?: boolean;
}) {
  const { data: rows, isLoading, isError, error, refetch } = useRows(table, orgId, queryOpts ?? {});
  const save = useSaveRow(table, orgId);
  const remove = useDeleteRow(table, orgId);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusField = fields.find((f) => f.name === "status" && f.type === "select");

  const cols = fields.filter((f) => f.inTable !== false);
  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (statusFilter && statusField) list = list.filter((r) => r[statusField.name] === statusFilter);
    if (term.trim()) {
      const t = term.toLowerCase();
      list = list.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
    }
    return list;
  }, [rows, term, statusFilter, statusField]);

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
      // An untouched select has no way to mean "explicitly cleared" — the UI
      // never offers a blank option — so omit it rather than sending null.
      // Sending null would violate NOT NULL columns that rely on a DB
      // default (status, channel, category, ...) whenever a select is left
      // at its initial, un-interacted state on create.
      else if (f.type === "select") {
        if (raw !== "" && raw != null) values[f.name] = raw;
      } else values[f.name] = raw === "" ? null : raw;
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

  // Fields with no `type` and inForm:false are computed, display-only
  // columns (e.g. Customers' "Spent"/"Purchases") backed by no real DB
  // column — export/import should skip them rather than round-trip an
  // always-blank column. A `csvValue` means the field has real, exportable
  // data of its own (e.g. a looked-up customer email), so it's kept.
  const csvFields = fields.filter((f) => f.csvValue || !(f.inForm === false && !f.type));

  function exportRows() {
    const header = csvFields.map((f) => f.name);
    const body = (rows ?? []).map((r) =>
      csvFields.map((f) => {
        if (f.csvValue) return f.csvValue(r);
        return Array.isArray(r[f.name]) ? r[f.name].join("; ") : (r[f.name] ?? "");
      }),
    );
    downloadCsv(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
  }

  function csvCellToValue(field: Field, raw: string): unknown {
    if (raw === "") return undefined; // omit — let a DB default apply, same as an untouched form field
    if (field.type === "number") return Number(raw) || 0;
    if (field.type === "switch") return ["true", "1", "yes"].includes(raw.toLowerCase());
    if (field.type === "tags")
      return raw
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    // A select field with a `csvValue` (e.g. customer_id) exports the
    // option's label, not its stored value — match back to the option so
    // re-importing an exported file round-trips instead of saving the
    // label text into a foreign-key column. If nothing matches (e.g. the
    // file was exported from a different org, or the referenced row was
    // renamed/deleted since), omit the field rather than passing the raw
    // label through — for a foreign-key column that's a stored value some
    // other org's ID or name text, guaranteed to fail the insert outright.
    if (field.type === "select" && field.options) {
      const match = field.options.find((o) => o.value === raw || o.label === raw);
      return match?.value;
    }
    return raw;
  }

  async function importCsv(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const records = parseCsvToObjects(text);
      if (records.length === 0) {
        toast.error("That file has no data rows");
        return;
      }
      let ok = 0;
      let failed = 0;
      let firstError: string | undefined;
      for (const record of records) {
        const values: Row = {};
        for (const f of csvFields) {
          const raw = record[f.name];
          if (raw === undefined) continue;
          const value = csvCellToValue(f, raw);
          if (value !== undefined) values[f.name] = value;
        }
        try {
          await save.mutateAsync({ ...defaults, ...values });
          ok++;
        } catch (e) {
          failed++;
          firstError ??= e instanceof Error ? e.message : String(e);
        }
      }
      const errorSuffix = firstError ? ` — ${firstError}` : "";
      if (ok > 0)
        toast.success(
          `Imported ${ok} row${ok === 1 ? "" : "s"}${failed ? `, ${failed} failed${errorSuffix}` : ""}`,
        );
      else toast.error(`Import failed for all ${failed} row${failed === 1 ? "" : "s"}${errorSuffix}`);
    } catch {
      toast.error("Could not read that file — make sure it's a CSV");
    } finally {
      setImporting(false);
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((s) => {
      const visibleIds = filtered.map((r) => String(r["id"]));
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => s.has(id));
      return allSelected ? new Set() : new Set(visibleIds);
    });
  }

  async function bulkDelete() {
    setBulkWorking(true);
    try {
      const ids = [...selected];
      await Promise.allSettled(ids.map((id) => remove.mutateAsync(id)));
      toast.success(`Deleted ${ids.length} row${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    } finally {
      setBulkWorking(false);
      setBulkDeleting(false);
    }
  }

  async function bulkSetStatus(value: string) {
    if (!statusField) return;
    setBulkWorking(true);
    try {
      const ids = [...selected];
      await Promise.allSettled(ids.map((id) => save.mutateAsync({ id, [statusField.name]: value })));
      toast.success(`Updated ${ids.length} row${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    } finally {
      setBulkWorking(false);
    }
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
          {csv && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importCsv(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                title={`Expected columns: ${csvFields.map((f) => f.name).join(", ")}`}
              >
                <Upload className="mr-1 size-4" /> {importing ? "Importing…" : "Import"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportRows} disabled={!rows?.length}>
                <Download className="mr-1 size-4" /> Export
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="mr-1 size-4" /> New
          </Button>
        </div>
      }
    >
      {statusField && (rows?.length ?? 0) > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              statusFilter === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {(statusField.options ?? []).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatusFilter(o.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                statusFilter === o.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {bulkActions && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-ink">{selected.size} selected</span>
          {statusField && (
            <Select onValueChange={bulkSetStatus} disabled={bulkWorking}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder={`Set ${statusField.label.toLowerCase()}…`} />
              </SelectTrigger>
              <SelectContent>
                {(statusField.options ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkDeleting(true)}
            disabled={bulkWorking}
          >
            <Trash2 className="mr-1 size-4" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={bulkWorking}>
            Clear
          </Button>
        </div>
      )}
      {isLoading ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
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
              <tr className="border-b border-border bg-surface-2/60 text-left">
                {bulkActions && (
                  <th className="w-10 px-5 py-2.5">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={filtered.length > 0 && filtered.every((r) => selected.has(String(r["id"])))}
                      onChange={toggleAllVisible}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {cols.map((f) => (
                  <th
                    key={f.name}
                    className="px-5 py-2.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="w-20 px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row["id"]}
                  className="group border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50"
                >
                  {bulkActions && (
                    <td className="px-5 py-3 align-top">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        checked={selected.has(String(row["id"]))}
                        onChange={() => toggleRow(String(row["id"]))}
                        aria-label={`Select ${row["name"] ?? "row"}`}
                      />
                    </td>
                  )}
                  {cols.map((f) => (
                    <td key={f.name} className="px-5 py-3 align-top">
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
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-ink"
                      onClick={() => setEditing(row)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(row["id"])}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-destructive"
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

      <AlertDialog open={bulkDeleting} onOpenChange={(o) => !o && setBulkDeleting(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} record{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

export function FieldInput({ field, value }: { field: Field; value: any }) {
  const [selectValue, setSelectValue] = useState<string>(value == null ? "" : String(value));

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
