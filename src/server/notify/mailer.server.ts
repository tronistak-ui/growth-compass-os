// Local dev mail transport — points at Mailpit (docker-compose.yml), a free
// SMTP catcher with a web UI at http://localhost:8025. No real email
// provider needed to develop this locally; swap SMTP_HOST/PORT for a real
// provider (or re-add an API-based one) at deploy time — that's a separate,
// later decision.
import nodemailer from "nodemailer";

let _transport: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env["SMTP_HOST"] ?? "localhost",
      port: Number(process.env["SMTP_PORT"] ?? 1025),
      secure: false,
    });
  }
  return _transport;
}

export async function sendMail(input: { to: string[]; subject: string; html: string }): Promise<void> {
  if (input.to.length === 0) return;
  const from = process.env["ALERT_FROM_EMAIL"] ?? "TrendZypher Alerts <alerts@trendzypher.local>";
  await getTransport().sendMail({ from, to: input.to, subject: input.subject, html: input.html });
}
