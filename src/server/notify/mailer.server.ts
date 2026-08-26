// Local dev mail transport — points at Mailpit (docker-compose.yml), a free
// SMTP catcher with a web UI at http://localhost:8025. No real email
// provider needed to develop this locally. At deploy time, set SMTP_HOST/
// PORT to a real provider plus SMTP_USER/PASS — Mailpit needs no auth, but
// every real provider (SendGrid, SES, Mailgun, Gmail, ...) does, so this
// silently sent nothing outside of dev until auth support was added here.
import nodemailer from "nodemailer";
import { BRAND_NAME } from "@/lib/brand";

let _transport: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransport() {
  if (!_transport) {
    const user = process.env["SMTP_USER"];
    const pass = process.env["SMTP_PASS"];
    _transport = nodemailer.createTransport({
      host: process.env["SMTP_HOST"] ?? "localhost",
      port: Number(process.env["SMTP_PORT"] ?? 1025),
      secure: process.env["SMTP_SECURE"] === "true",
      auth: user && pass ? { user, pass } : undefined,
    });
  }
  return _transport;
}

export async function sendMail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (input.to.length === 0) return;
  const from = process.env["ALERT_FROM_EMAIL"] ?? `${BRAND_NAME} Alerts <alerts@localhost>`;
  await getTransport().sendMail({ from, to: input.to, subject: input.subject, html: input.html });
}
