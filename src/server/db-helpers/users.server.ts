import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";

export function findUserByEmail(email: string): Promise<User | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
    .then((rows) => rows[0]);
}

export function findUserById(id: string): Promise<User | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName?: string | null;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      fullName: input.fullName ?? null,
    })
    .returning();
  return user!;
}
