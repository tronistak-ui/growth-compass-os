import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens, sessions, users } from "@/db/schema";
import { findUserByEmail } from "../db-helpers/users.server";
import { hashPassword } from "../auth/password.server";
import { sendMail } from "../notify/mailer.server";

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
        subject: "Reset your TrendZypher password",
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;">
            <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
              TrendZypher Growth OS
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
