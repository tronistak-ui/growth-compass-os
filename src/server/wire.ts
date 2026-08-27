// Converts between Drizzle's camelCase JS row shape and the snake_case
// column-name shape every frontend consumer already expects (inherited from
// Supabase/PostgREST, which serializes raw Postgres column names). Keeping
// the wire format snake_case means growth.ts's generic hooks — and every
// route/component that does row["snake_case_key"] — need no changes.
import { getTableColumns } from "drizzle-orm";
import type { Table } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWireRow<T extends Table>(table: T, row: Record<string, unknown>): Record<string, any> {
  const cols = getTableColumns(table) as Record<string, { name: string }>;
  const out: Record<string, unknown> = {};
  for (const [jsKey, col] of Object.entries(cols)) {
    if (jsKey in row) out[col.name] = row[jsKey];
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWireRows<T extends Table>(table: T, rows: Record<string, unknown>[]): Record<string, any>[] {
  return rows.map((row) => toWireRow(table, row));
}

/** Maps an incoming snake_case payload back to Drizzle's camelCase JS keys, dropping unknown keys. */
export function fromWireValues<T extends Table>(
  table: T,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const cols = getTableColumns(table) as Record<string, { name: string }>;
  const byDbName = new Map(Object.entries(cols).map(([jsKey, col]) => [col.name, jsKey]));
  const out: Record<string, unknown> = {};
  for (const [dbName, value] of Object.entries(values)) {
    const jsKey = byDbName.get(dbName);
    if (jsKey) out[jsKey] = value;
  }
  return out;
}

/** Looks up a column by its DB (snake_case) name — for dynamic filter/order-by input. */
export function wireColumn<T extends Table>(table: T, dbName: string) {
  const cols = getTableColumns(table) as Record<string, unknown>;
  const found = Object.values(cols).find((c) => (c as { name: string }).name === dbName);
  if (!found) throw new Error(`Unknown column "${dbName}"`);
  return found as never;
}
