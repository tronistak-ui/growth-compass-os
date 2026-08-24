// Weekly "here's what to fix" email — reuses the exact same deterministic
// insight engine the dashboard renders (computeMetrics/presenceScore/
// buildInsights from src/lib/metrics.ts), just run server-side against the
// DB directly instead of via useOrgData()'s React Query hooks. Two callers,
// same shape as presence-sync.server.ts:
//   - sendMyWeeklyDigest (server function): a manual "Email me this" button.
//   - sendWeeklyDigests (plain function): the Monday cron job.
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  organizations,
  organizationMembers,
  users,
  leads,
  customers,
  revenueTransactions,
  expenses,
  campaigns,
  offers,
  presenceProfiles,
} from "@/db/schema";
import { toWireRows, toWireRow } from "../wire";
import { computeMetrics, presenceScore, buildInsights, money, type Insight } from "@/lib/metrics";
import { sendMail } from "./mailer.server";

export type DigestResult = { organizationId: string; sent: boolean; reason?: string };

async function loadOrgData(organizationId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!org) return null;

  const [leadRows, customerRows, revenueRows, expenseRows, campaignRows, offerRows, presenceRow] =
    await Promise.all([
      db.select().from(leads).where(eq(leads.organizationId, organizationId)),
      db.select().from(customers).where(eq(customers.organizationId, organizationId)),
      db.select().from(revenueTransactions).where(eq(revenueTransactions.organizationId, organizationId)),
      db.select().from(expenses).where(eq(expenses.organizationId, organizationId)),
      db.select().from(campaigns).where(eq(campaigns.organizationId, organizationId)),
      db.select().from(offers).where(eq(offers.organizationId, organizationId)),
      db
        .select()
        .from(presenceProfiles)
        .where(eq(presenceProfiles.organizationId, organizationId))
        .limit(1)
        .then((r) => r[0]),
    ]);

  const metrics = computeMetrics({
    leads: toWireRows(leads, leadRows),
    customers: toWireRows(customers, customerRows),
    revenue: toWireRows(revenueTransactions, revenueRows),
    expenses: toWireRows(expenses, expenseRows),
    campaigns: toWireRows(campaigns, campaignRows),
    offers: toWireRows(offers, offerRows),
  });
  const presence = presenceScore(presenceRow ? toWireRow(presenceProfiles, presenceRow) : null);
  const currency = org.currency ?? "USD";
  const insights = buildInsights(metrics, presence.total, currency);

  return { org, metrics, insights, currency };
}

function renderDigestHtml(orgName: string, currency: string, top: Insight[], metrics: ReturnType<typeof computeMetrics>) {
  const item = (i: Insight) => `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">${i.module} · impact ${i.impact}</div>
      <div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;">${i.title}</div>
      <div style="font-size:13px;color:#4b5563;margin-top:4px;">${i.detail}</div>
      <div style="font-size:13px;color:#111827;margin-top:8px;"><strong>Do this:</strong> ${i.action}</div>
    </div>`;

  return `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
        Weekly growth digest
      </p>
      <h2 style="margin:0 0 14px;">${orgName}</h2>
      <p style="font-size:14px;color:#374151;margin-bottom:16px;">
        ${money(metrics.revenueThisMonth, currency)} revenue this month ·
        ${money(metrics.profit, currency)} profit ·
        ${metrics.totalLeads} leads (${metrics.qualifiedLeads} qualified)
      </p>
      <p style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;">Top ${top.length} this week</p>
      ${top.map(item).join("")}
      <p style="margin-top:16px;font-size:12px;color:#9ca3af;">
        Rule-based, computed from your own data — no AI, nothing invented.
      </p>
    </div>`;
}

/** Builds and sends the digest for one org. Returns why it was skipped, if it was. */
export async function sendDigestForOrg(organizationId: string): Promise<DigestResult> {
  const data = await loadOrgData(organizationId);
  if (!data) return { organizationId, sent: false, reason: "Organization not found" };
  if (data.insights.length === 0) {
    return { organizationId, sent: false, reason: "No insights yet — not enough data" };
  }

  const memberRows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
  const userIds = [...new Set(memberRows.map((r) => r.userId))];
  if (userIds.length === 0) return { organizationId, sent: false, reason: "No members to email" };

  const recipients = await db.select({ email: users.email }).from(users).where(inArray(users.id, userIds));
  const emails = recipients.map((r) => r.email).filter(Boolean);
  if (emails.length === 0) return { organizationId, sent: false, reason: "No member emails on file" };

  const top = data.insights.slice(0, 3);
  await sendMail({
    to: emails,
    subject: `${data.org.name} — this week's biggest opportunity: ${top[0]!.title}`,
    html: renderDigestHtml(data.org.name, data.currency, top, data.metrics),
  });

  return { organizationId, sent: true };
}

/** The Monday cron job — every organization, regardless of who's logged in. */
export async function sendWeeklyDigests(): Promise<DigestResult[]> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  const results: DigestResult[] = [];
  for (const o of orgs) results.push(await sendDigestForOrg(o.id));
  return results;
}
