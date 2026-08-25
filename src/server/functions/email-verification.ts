import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { emailVerificationTokens, users } from "@/db/schema";
import { requireAuth } from "../auth/middleware";
import { checkRateLimit, getClientIp } from "../auth/rate-limit.server";
import { sendVerificationEmail, hashVerificationToken } from "../auth/email-verification.server";

const tokenInput = z.object({ token: z.string().min(1) });

export const verifyEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    checkRateLimit(`verify-email:${getClientIp()}`, 10, 15 * 60 * 1000);

    const tokenHash = hashVerificationToken(data.token);
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.usedAt)))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new Error("This verification link is invalid or has expired — request a new one from Settings");
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));
    });

    return { ok: true };
  });

/** For the "Resend" button — a signed-in user re-requesting their own verification email. */
export const resendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    checkRateLimit(`resend-verify:${context.userId}`, 3, 15 * 60 * 1000);

    if (context.user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
    await sendVerificationEmail(context.userId, context.user.email);
    return { ok: true, alreadyVerified: false };
  });
