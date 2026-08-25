import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { findUserByEmail } from "../db-helpers/users.server";
import { hashPassword, verifyPassword } from "../auth/password.server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "../auth/session-cookie.server";
import { requireAuth } from "../auth/middleware";
import { checkRateLimit, getClientIp } from "../auth/rate-limit.server";
import { sendMail } from "../notify/mailer.server";
import { BRAND_NAME, BRAND_FULL } from "@/lib/brand";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const requestInput = z.object({ email: z.string().email() });

/**
 * Always returns { ok: true } regardless of whether the email matches an
 * account — a different response for "no such account" would let anyone
 * probe which emails are registered.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: unknown) => requestInput.parse(input))
  .handler(async ({ data }) => {
    // Keyed by IP+email — stops both a flood of reset emails to one address
    // and a script that cycles through many addresses from one IP.
    checkRateLimit(`reset-request:${getClientIp()}:${data.email.toLowerCase()}`, 5, 15 * 60 * 1000);

    const user = await findUserByEmail(data.email);
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      const appBaseUrl = process.env["APP_BASE_URL"] ?? "";
      const link = `${appBaseUrl}/reset-password?token=${token}`;
      await sendMail({
        to: [user.email],
        subject: `Reset your ${BRAND_NAME} password`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;">
            <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
              ${BRAND_FULL}
            </p>
            <h2 style="margin:0 0 12px;">Reset your password</h2>
            <p style="color:#374151;font-size:14px;">
              Click below to set a new password. This link expires in 1 hour and works once.
            </p>
            <p style="margin:20px 0;">
              <a href="${link}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;display:inline-block;">
                Reset password
              </a>
            </p>
            <p style="color:#9ca3af;font-size:12px;">
              Didn't request this? You can safely ignore this email — your password won't change.
            </p>
          </div>`,
      });
    }
    return { ok: true };
  });

const resetInput = z.object({ token: z.string().min(1), newPassword: z.string().min(6) });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => resetInput.parse(input))
  .handler(async ({ data }) => {
    // Token entropy already makes guessing infeasible; this is defense in
    // depth against a sustained brute-force script.
    checkRateLimit(`reset-consume:${getClientIp()}`, 10, 15 * 60 * 1000);

    const tokenHash = hashToken(data.token);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new Error("This reset link is invalid or has expired — request a new one");
    }

    const passwordHash = await hashPassword(data.newPassword);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
      // A reset ends every other active session, not just the device that
      // requested it — the old password shouldn't still be "logged in"
      // anywhere once it's been changed.
      await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    });

    return { ok: true };
  });

const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

/** For a signed-in user changing their password from Settings — unlike a token reset, keeps the current session alive and only signs out other devices. */
export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => changePasswordInput.parse(input))
  .handler(async ({ data, context }) => {
    checkRateLimit(`change-password:${context.userId}`, 5, 15 * 60 * 1000);

    if (!(await verifyPassword(context.user.passwordHash, data.currentPassword))) {
      throw new Error("Current password is incorrect");
    }

    const passwordHash = await hashPassword(data.newPassword);
    const currentSessionId = verifySessionCookie(getCookie(SESSION_COOKIE_NAME));

    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, context.userId));
      await tx
        .delete(sessions)
        .where(
          currentSessionId
            ? and(eq(sessions.userId, context.userId), ne(sessions.id, currentSessionId))
            : eq(sessions.userId, context.userId),
        );
    });

    return { ok: true };
  });
