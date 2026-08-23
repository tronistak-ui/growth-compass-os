import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember, requireOrgWrite } from "../authz.server";
import { toWireRow, toWireRows, fromWireValues, wireColumn } from "../wire";
import {
  customerSegments,
  offers,
  campaigns,
  customers,
  leads,
  interactions,
  revenueTransactions,
  expenses,
  tasks,
  competitors,
  conversionAssets,
  funnelSnapshots,
  growthOpportunities,
  presenceProfiles,
  positioning,
  organizations,
} from "@/db/schema";

// Every table growth.ts's generic hooks (useRows/useSaveRow/useDeleteRow) can
// address. This mirrors the set of tables that carried the generated
// "org members manage %s" RLS policy in the source Supabase schema.
const ROW_TABLES: Record<string, PgTable> = {
  customer_segments: customerSegments,
  offers,
  campaigns,
  customers,
  leads,
  interactions,
  revenue_transactions: revenueTransactions,
  expenses,
  tasks,
  competitors,
  conversion_assets: conversionAssets,
  funnel_snapshots: funnelSnapshots,
  growth_opportunities: growthOpportunities,
};

// One-row-per-organization tables (useSingletonRow/useUpsertSingleton).
const SINGLETON_TABLES: Record<string, PgTable> = {
  presence_profiles: presenceProfiles,
  positioning,
};

function rowTable(name: string): PgTable {
  const table = ROW_TABLES[name];
  if (!table) throw new Error(`Unknown table "${name}"`);
  return table;
}

function singletonTable(name: string): PgTable {
  const table = SINGLETON_TABLES[name];
  if (!table) throw new Error(`Unknown singleton table "${name}"`);
  return table;
}

const orderInput = z.object({ column: z.string(), ascending: z.boolean().optional() });
const filtersInput = z.array(z.tuple([z.string(), z.unknown()]));

const listRowsInput = z.object({
  table: z.string(),
  orgId: z.string().uuid(),
  order: orderInput.optional(),
  filters: filtersInput.optional(),
  limit: z.number().optional(),
});

export const listRows = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => listRowsInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const table = rowTable(data.table);
    const orgCol = wireColumn(table, "organization_id");

    const conditions: SQL[] = [eq(orgCol, data.orgId)];
    for (const [col, val] of data.filters ?? []) {
      conditions.push(eq(wireColumn(table, col), val));
    }

    let query = db
      .select()
      .from(table)
      .$dynamic()
      .where(and(...conditions));

    if (data.order) {
      const col = wireColumn(table, data.order.column);
      query = query.orderBy(data.order.ascending ? asc(col) : desc(col));
    }
    if (data.limit) query = query.limit(data.limit);

    const rows = await query;
    return toWireRows(table, rows as Record<string, unknown>[]);
  });

const singletonInput = z.object({ table: z.string(), orgId: z.string().uuid() });

export const getSingletonRow = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => singletonInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const table = singletonTable(data.table);
    const orgCol = wireColumn(table, "organization_id");
    const [row] = await db
      .select()
      .from(table)
      .where(eq(orgCol, data.orgId))
      .limit(1);
    return row ? toWireRow(table, row as Record<string, unknown>) : { organization_id: data.orgId };
  });

const saveRowInput = z.object({
  table: z.string(),
  orgId: z.string().uuid(),
  values: z.record(z.string(), z.unknown()),
});

export const saveRow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => saveRowInput.parse(input))
  .handler(async ({ data, context }) => {
    // "organizations" isn't org-child data — orgId IS the row being edited
    // (see settings.tsx, the only caller). No separate organization_id column.
    if (data.table === "organizations") {
      const id = (data.values["id"] as string | undefined) ?? data.orgId;
      await requireOrgWrite(context.userId, id);
      const clean = { ...data.values };
      delete clean["id"];
      const mapped = fromWireValues(organizations, clean);
      const [updated] = await db
        .update(organizations)
        .set(mapped)
        .where(eq(organizations.id, id))
        .returning();
      if (!updated) throw new Error("Business not found");
      return toWireRow(organizations, updated);
    }

    await requireOrgWrite(context.userId, data.orgId);
    const table = rowTable(data.table);
    const orgCol = wireColumn(table, "organization_id");
    const idCol = wireColumn(table, "id");

    const clean = { ...data.values };
    const id = clean["id"] as string | undefined;
    delete clean["id"];
    delete clean["organization_id"];
    const mapped = fromWireValues(table, clean);

    if (id) {
      const [updated] = await db
        .update(table)
        .set(mapped)
        .where(and(eq(idCol, id), eq(orgCol, data.orgId)))
        .returning();
      if (!updated) throw new Error("Row not found");
      return toWireRow(table, updated as Record<string, unknown>);
    }

    const [inserted] = await db
      .insert(table)
      .values({ ...mapped, organizationId: data.orgId })
      .returning();
    return toWireRow(table, inserted as Record<string, unknown>);
  });

const upsertSingletonInput = z.object({
  table: z.string(),
  orgId: z.string().uuid(),
  values: z.record(z.string(), z.unknown()),
});

export const upsertSingleton = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => upsertSingletonInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);
    const table = singletonTable(data.table);
    const orgCol = wireColumn(table, "organization_id");

    const clean = { ...data.values };
    delete clean["organization_id"];
    const mapped = fromWireValues(table, clean);

    const [row] = await db
      .insert(table)
      .values({ ...mapped, organizationId: data.orgId })
      .onConflictDoUpdate({ target: orgCol as never, set: mapped })
      .returning();
    return toWireRow(table, row as Record<string, unknown>);
  });

const deleteRowInput = z.object({
  table: z.string(),
  orgId: z.string().uuid(),
  id: z.string(),
});

export const deleteRow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => deleteRowInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);
    const table = rowTable(data.table);
    const orgCol = wireColumn(table, "organization_id");
    const idCol = wireColumn(table, "id");
    await db.delete(table).where(and(eq(idCol, data.id), eq(orgCol, data.orgId)));
    return { ok: true };
  });
