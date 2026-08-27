import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "./session-cookie.server";
import { findValidSession } from "../db-helpers/sessions.server";
import { findUserById } from "../db-helpers/users.server";
import type { User } from "@/db/schema";

/** Reads + verifies the session cookie without throwing. Returns null if not signed in. */
export const getSessionUser = createServerOnlyFn(async (): Promise<User | null> => {
  const sessionId = verifySessionCookie(getCookie(SESSION_COOKIE_NAME));
  if (!sessionId) return null;
  const session = await findValidSession(sessionId);
  if (!session) return null;
  const user = await findUserById(session.userId);
  return user ?? null;
});

/** Apply to any server function that must run as a signed-in user. */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized: sign in required");
  return next({ context: { userId: user.id, user } });
});
