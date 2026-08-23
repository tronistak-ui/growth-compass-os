import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password.server";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, signSessionCookie } from "../auth/session-cookie.server";
import { createSession, deleteSession } from "../db-helpers/sessions.server";
import { createUser, findUserByEmail } from "../db-helpers/users.server";
import { getSessionUser, requireAuth } from "../auth/middleware";
import { getUserRoles } from "../authz.server";
import { db } from "@/db/client";
import { userRoles } from "@/db/schema";
import { verifySessionCookie } from "../auth/session-cookie.server";
import { getCookie } from "@tanstack/react-start/server";

function setSessionCookie(sessionId: string) {
  setCookie(SESSION_COOKIE_NAME, signSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

function userToWire(user: { id: string; email: string; fullName: string | null; avatarUrl: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

const signUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

export const signUp = createServerFn({ method: "POST" })
  .validator((input: unknown) => signUpInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await findUserByEmail(data.email);
    if (existing) throw new Error("An account with that email already exists");

    const passwordHash = await hashPassword(data.password);
    const user = await createUser({
      email: data.email,
      passwordHash,
      fullName: data.fullName?.trim() || null,
    });
    // Mirrors handle_new_user(): every new account starts as business_owner.
    await db.insert(userRoles).values({ userId: user.id, role: "business_owner" });

    const session = await createSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent") ?? null,
    });
    setSessionCookie(session.id);

    return userToWire(user);
  });

const signInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signIn = createServerFn({ method: "POST" })
  .validator((input: unknown) => signInInput.parse(input))
  .handler(async ({ data }) => {
    const user = await findUserByEmail(data.email);
    if (!user || !(await verifyPassword(user.passwordHash, data.password))) {
      throw new Error("Invalid email or password");
    }

    const session = await createSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent") ?? null,
    });
    setSessionCookie(session.id);

    return userToWire(user);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const sessionId = verifySessionCookie(getCookie(SESSION_COOKIE_NAME));
  if (sessionId) await deleteSession(sessionId);
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { ok: true };
});

/** Never throws — used by the auth guard and useSession() to check "am I signed in". */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getSessionUser();
  return user ? userToWire(user) : null;
});

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return getUserRoles(context.userId);
  });
