import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { socialConnections, type SocialConnection } from "@/db/schema";

export function findConnectionById(id: string): Promise<SocialConnection | undefined> {
  return db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.id, id))
    .limit(1)
    .then((rows) => rows[0]);
}

export function findConnection(orgId: string, provider: string): Promise<SocialConnection | undefined> {
  return db
    .select()
    .from(socialConnections)
    .where(and(eq(socialConnections.organizationId, orgId), eq(socialConnections.provider, provider)))
    .limit(1)
    .then((rows) => rows[0]);
}

export function listConnectedConnections(): Promise<SocialConnection[]> {
  return db.select().from(socialConnections).where(eq(socialConnections.status, "connected"));
}

export async function upsertConnection(input: {
  organizationId: string;
  provider: string;
  status?: string;
  externalAccountId?: string | null;
  externalAccountName?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
}): Promise<SocialConnection> {
  const [row] = await db
    .insert(socialConnections)
    .values({
      organizationId: input.organizationId,
      provider: input.provider,
      status: input.status ?? "connected",
      externalAccountId: input.externalAccountId ?? null,
      externalAccountName: input.externalAccountName ?? null,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      lastError: null,
    })
    .onConflictDoUpdate({
      target: [socialConnections.organizationId, socialConnections.provider],
      set: {
        status: input.status ?? "connected",
        externalAccountId: input.externalAccountId ?? null,
        externalAccountName: input.externalAccountName ?? null,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        lastError: null,
      },
    })
    .returning();
  return row!;
}

export async function markConnectionError(id: string, message: string): Promise<void> {
  await db.update(socialConnections).set({ status: "error", lastError: message }).where(eq(socialConnections.id, id));
}

export async function markConnectionSynced(
  id: string,
  patch: Partial<{ externalAccountName: string | null }> = {},
): Promise<void> {
  await db
    .update(socialConnections)
    .set({ status: "connected", lastSyncedAt: new Date(), lastError: null, ...patch })
    .where(eq(socialConnections.id, id));
}

export async function updateConnectionToken(
  id: string,
  patch: { accessToken: string; tokenExpiresAt: Date },
): Promise<void> {
  await db.update(socialConnections).set(patch).where(eq(socialConnections.id, id));
}
