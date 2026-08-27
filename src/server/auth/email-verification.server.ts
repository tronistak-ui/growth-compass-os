// Same one-time-hashed-token pattern as password-reset.ts. A plain helper
// (not a server function) so signUp/acceptInviteNewUser/resendVerification
// can all call it directly without a server-fn-calling-server-fn hop.
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db/client";
import { emailVerificationTokens } from "@/db/schema";
import { sendMail } from "../notify/mailer.server";
import { BRAND_FULL } from "@/lib/brand";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — longer than a password reset, shorter than a team invite

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const appBaseUrl = process.env["APP_BASE_URL"] ?? "";
  const link = `${appBaseUrl}/verify-email?token=${token}`;
  await sendMail({
    to: [email],
    subject: `Verify your email for ${BRAND_FULL}`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;">
        <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
          ${BRAND_FULL}
        </p>
        <h2 style="margin:0 0 12px;">Confirm your email</h2>
        <p style="color:#374151;font-size:14px;">
          Click below to verify this address. This link works once and expires in 24 hours.
        </p>
        <p style="margin:20px 0;">
          <a href="${link}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;display:inline-block;">
            Verify email
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px;">
          Didn't sign up for this? You can safely ignore this email.
        </p>
      </div>`,
  });
}
