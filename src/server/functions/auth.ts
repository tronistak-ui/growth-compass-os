import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password.server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  signSessionCookie,
} from "../auth/session-cookie.server";
import { createSession, deleteSession } from "../db-helpers/sessions.server";
import { createUser, findUserByEmail } from "../db-helpers/users.server";
import { getSessionUser, requireAuth } from "../auth/middleware";
import { checkRateLimit, getClientIp } from "../auth/rate-limit.server";
import { sendVerificationEmail } from "../auth/email-verification.server";
import { getUserRoles } from "../authz.server";
import { db } from "@/db/client";
import { userRoles, users } from "@/db/schema";
import { verifySessionCookie } from "../auth/session-cookie.server";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

// createServerOnlyFn (not a plain function) keeps this out of the client
// bundle — a plain export here pulls session-cookie.server's signing key
// into client code wherever a route imports this module, which fails a
// production build outright (import-protection catches it at build time,
// not just as a runtime risk).
export const setSessionCookie = createServerOnlyFn((sessionId: string) => {
  setCookie(SESSION_COOKIE_NAME, signSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });
});

function userToWire(user: {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    email_verified_at: user.emailVerifiedAt,
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
    // 5 accounts per IP per 15 minutes — blunts mass fake-signup spam
    // without getting in the way of a real business signing up once.
    checkRateLimit(`signup:${getClientIp()}`, 5, 15 * 60 * 1000);

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
    // Best-effort — a slow/failed verification email shouldn't block signup
    // itself, so this doesn't get awaited into the error path above.
    void sendVerificationEmail(user.id, user.email).catch((e) =>
      console.error("[signup] failed to send verification email:", e),
    );

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
    // Keyed by IP+email, not IP alone — a shared office/NAT IP shouldn't
    // lock everyone out because one account is being brute-forced.
    checkRateLimit(`signin:${getClientIp()}:${data.email.toLowerCase()}`, 8, 15 * 60 * 1000);

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

const deleteMyAccountInput = z.object({ confirmEmail: z.string() });

/**
 * Permanently deletes the signed-in user's own login — separate from, and a
 * superset of, deleteOrganization in organizations.ts (that removes one
 * business; this removes the person). organizations.ownerId cascades from
 * users.id, so if this account owns a business, that business and
 * everything in it goes too — same for organization_members and user_roles
 * rows anywhere else this account has access. No manual cleanup needed
 * beyond this one delete, same principle as deleteOrganization.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => deleteMyAccountInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.confirmEmail !== context.user.email) {
      throw new Error("That doesn't match your email — type it exactly to confirm");
    }
    await db.delete(users).where(eq(users.id, context.userId));
    deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });
