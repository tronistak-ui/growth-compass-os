import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, type Session } from "@/db/schema";
import { SESSION_TTL_MS } from "../auth/session-cookie.server";

export async function createSession(input: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    })
    .returning();
  return session!;
}

export async function findValidSession(id: string): Promise<Session | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}
