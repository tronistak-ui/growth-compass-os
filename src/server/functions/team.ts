// Org-level staff invites — lets a business owner add their own team,
// separate from TeamRolesPanel/admin.ts which manages *our* support access
// (platform_admin/support/auditor) into a client's instance. Same
// one-time-hashed-token pattern as password-reset.ts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { getRequestHeader } from "@tanstack/react-start/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, organizationMembers, organizationInvites, userRoles, users } from "@/db/schema";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember, requireOrgWrite } from "../authz.server";
import { hashPassword, verifyPassword } from "../auth/password.server";
import { findUserByEmail, createUser } from "../db-helpers/users.server";
import { createSession } from "../db-helpers/sessions.server";
import { setSessionCookie } from "./auth";
import { checkRateLimit, getClientIp } from "../auth/rate-limit.server";
import { sendMail } from "../notify/mailer.server";
import { BRAND_NAME, BRAND_FULL } from "@/lib/brand";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — longer than a password reset since staff may not check email same-day

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function inviteEmailHtml(orgName: string, link: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
        ${BRAND_FULL}
      </p>
      <h2 style="margin:0 0 12px;">You're invited to join ${orgName}</h2>
      <p style="color:#374151;font-size:14px;">
        Click below to set up your account. This link works once and expires in 7 days.
      </p>
      <p style="margin:20px 0;">
        <a href="${link}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;display:inline-block;">
          Accept invite
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;">
        Didn't expect this? You can safely ignore this email.
      </p>
    </div>`;
}

const orgIdInput = z.object({ orgId: z.string().uuid() });

/** Members + pending invites for the Settings > Team panel. */
export const listOrgTeam = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: unknown) => orgIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);

    const [org, members, invites] = await Promise.all([
      db.select({ ownerId: organizations.ownerId }).from(organizations).where(eq(organizations.id, data.orgId)).limit(1),
      db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          joinedAt: organizationMembers.createdAt,
          email: users.email,
          fullName: users.fullName,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, data.orgId))
        .orderBy(organizationMembers.createdAt),
      db
        .select({
          id: organizationInvites.id,
          email: organizationInvites.email,
          role: organizationInvites.role,
          expiresAt: organizationInvites.expiresAt,
          createdAt: organizationInvites.createdAt,
        })
        .from(organizationInvites)
        .where(
          and(
            eq(organizationInvites.organizationId, data.orgId),
            isNull(organizationInvites.acceptedAt),
            isNull(organizationInvites.revokedAt),
          ),
        )
        .orderBy(desc(organizationInvites.createdAt)),
    ]);

    return { ownerId: org[0]?.ownerId ?? null, members, invites };
  });

const inviteInput = z.object({ orgId: z.string().uuid(), email: z.string().email() });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => inviteInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);
    const email = data.email.toLowerCase();

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      const [existingMember] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, data.orgId),
            eq(organizationMembers.userId, existingUser.id),
          ),
        )
        .limit(1);
      if (existingMember) throw new Error("Already a member of this business");
    }

    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, data.orgId))
      .limit(1);
    if (!org) throw new Error("Business not found");

    // Refresh an existing pending invite rather than piling up duplicates
    // for the same email.
    const [pending] = await db
      .select({ id: organizationInvites.id })
      .from(organizationInvites)
      .where(
        and(
          eq(organizationInvites.organizationId, data.orgId),
          eq(organizationInvites.email, email),
          isNull(organizationInvites.acceptedAt),
          isNull(organizationInvites.revokedAt),
        ),
      )
      .limit(1);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    if (pending) {
      await db
        .update(organizationInvites)
        .set({ tokenHash, expiresAt, invitedByUserId: context.userId })
        .where(eq(organizationInvites.id, pending.id));
    } else {
      await db.insert(organizationInvites).values({
        organizationId: data.orgId,
        email,
        tokenHash,
        invitedByUserId: context.userId,
        expiresAt,
      });
    }

    const appBaseUrl = process.env["APP_BASE_URL"] ?? "";
    const link = `${appBaseUrl}/accept-invite?token=${token}`;
    await sendMail({
      to: [email],
      subject: `You're invited to join ${org.name} on ${BRAND_NAME}`,
      html: inviteEmailHtml(org.name, link),
    });

    return { ok: true };
  });

const revokeInput = z.object({ orgId: z.string().uuid(), inviteId: z.string().uuid() });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => revokeInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);
    await db
      .update(organizationInvites)
      .set({ revokedAt: new Date() })
      .where(and(eq(organizationInvites.id, data.inviteId), eq(organizationInvites.organizationId, data.orgId)));
    return { ok: true };
  });

const removeInput = z.object({ orgId: z.string().uuid(), memberUserId: z.string().uuid() });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => removeInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgWrite(context.userId, data.orgId);

    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, data.orgId))
      .limit(1);
    if (org?.ownerId === data.memberUserId) {
      throw new Error("Can't remove the account owner");
    }

    await db
      .delete(organizationMembers)
      .where(
        and(eq(organizationMembers.organizationId, data.orgId), eq(organizationMembers.userId, data.memberUserId)),
      );
    return { ok: true };
  });

// --- Invite acceptance — public, the invited person isn't signed in yet ---

const tokenInput = z.object({ token: z.string().min(1) });

export const getInviteInfo = createServerFn({ method: "GET" })
  .validator((input: unknown) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    checkRateLimit(`invite-lookup:${getClientIp()}`, 20, 15 * 60 * 1000);

    const tokenHash = hashToken(data.token);
    const [invite] = await db
      .select({
        email: organizationInvites.email,
        expiresAt: organizationInvites.expiresAt,
        acceptedAt: organizationInvites.acceptedAt,
        revokedAt: organizationInvites.revokedAt,
        orgId: organizationInvites.organizationId,
      })
      .from(organizationInvites)
      .where(eq(organizationInvites.tokenHash, tokenHash))
      .limit(1);

    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() < Date.now()) {
      return { valid: false as const };
    }

    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, invite.orgId))
      .limit(1);
    const existingUser = await findUserByEmail(invite.email);

    return {
      valid: true as const,
      email: invite.email,
      orgName: org?.name ?? "this business",
      userExists: !!existingUser,
    };
  });

async function loadValidInvite(token: string) {
  const tokenHash = hashToken(token);
  const [invite] = await db.select().from(organizationInvites).where(eq(organizationInvites.tokenHash, tokenHash)).limit(1);
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() < Date.now()) {
    throw new Error("This invite is invalid or has expired — ask for a new one");
  }
  return invite;
}

const acceptNewInput = z.object({
  token: z.string().min(1),
  fullName: z.string().optional(),
  password: z.string().min(6),
});

/** For an invited email with no existing account — creates one and joins the org. */
export const acceptInviteNewUser = createServerFn({ method: "POST" })
  .validator((input: unknown) => acceptNewInput.parse(input))
  .handler(async ({ data }) => {
    checkRateLimit(`invite-accept:${getClientIp()}`, 10, 15 * 60 * 1000);
    const invite = await loadValidInvite(data.token);

    const existing = await findUserByEmail(invite.email);
    if (existing) throw new Error("An account already exists for this email — sign in instead");

    const passwordHash = await hashPassword(data.password);
    const user = await createUser({
      email: invite.email,
      passwordHash,
      fullName: data.fullName?.trim() || null,
    });
    // Mirrors signUp() in auth.ts — every account starts as business_owner
    // at the platform-role level, same as a self-signed-up user.
    await db.insert(userRoles).values({ userId: user.id, role: "business_owner" });

    await db.transaction(async (tx) => {
      await tx
        .insert(organizationMembers)
        .values({ organizationId: invite.organizationId, userId: user.id, role: invite.role });
      await tx.update(organizationInvites).set({ acceptedAt: new Date() }).where(eq(organizationInvites.id, invite.id));
      // Clicking the invite link already proves this email is theirs —
      // no separate verification email needed on top of it.
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
    });

    const session = await createSession({ userId: user.id, userAgent: getRequestHeader("user-agent") ?? null });
    setSessionCookie(session.id);

    return { ok: true };
  });

const acceptExistingInput = z.object({ token: z.string().min(1), password: z.string().min(1) });

/** For an invited email that already has an account — verifies the password (like a sign-in) and joins the org. */
export const acceptInviteExistingUser = createServerFn({ method: "POST" })
  .validator((input: unknown) => acceptExistingInput.parse(input))
  .handler(async ({ data }) => {
    checkRateLimit(`invite-accept:${getClientIp()}`, 10, 15 * 60 * 1000);
    const invite = await loadValidInvite(data.token);

    const user = await findUserByEmail(invite.email);
    if (!user || !(await verifyPassword(user.passwordHash, data.password))) {
      throw new Error("Incorrect password");
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(organizationMembers)
        .values({ organizationId: invite.organizationId, userId: user.id, role: invite.role })
        .onConflictDoNothing();
      await tx.update(organizationInvites).set({ acceptedAt: new Date() }).where(eq(organizationInvites.id, invite.id));
    });

    const session = await createSession({ userId: user.id, userAgent: getRequestHeader("user-agent") ?? null });
    setSessionCookie(session.id);

    return { ok: true };
  });
