// supabase/functions/system-health-alert/index.ts
//
// Called by the `trg_fan_out_health_event` DB trigger (via pg_net) whenever a
// system_health_events row is inserted with severity 'error' or 'critical'.
// In-app notifications are already written by the trigger itself; this
// function only handles the email leg, via Resend.
//
// Required secrets (set with `supabase secrets set`):
//   RESEND_API_KEY       - Resend API key
//   ALERT_FROM_EMAIL     - verified sender, e.g. "TrendZypher Alerts <alerts@yourdomain.com>"
//   SUPABASE_URL          (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)
//
// This function authenticates the caller by requiring the service-role
// bearer token (set in public.app_config.service_role_key and sent by the
// trigger) rather than trusting an unauthenticated request.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: {
    id: string;
    severity: string;
    source: string;
    event_type: string;
    message: string;
    detail?: Record<string, unknown>;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Recipients: every user holding platform_admin or support.
  const { data: roleRows, error: roleErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["platform_admin", "support"]);

  if (roleErr) {
    return new Response(JSON.stringify({ error: roleErr.message }), { status: 500 });
  }

  const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no admin/support users" }), {
      status: 200,
    });
  }

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", userIds);

  if (profErr) {
    return new Response(JSON.stringify({ error: profErr.message }), { status: 500 });
  }

  const emails = (profiles ?? []).map((p) => p.email).filter(Boolean) as string[];

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("ALERT_FROM_EMAIL") ?? "TrendZypher Alerts <alerts@trendzypher.app>";

  if (!resendKey || emails.length === 0) {
    return new Response(
      JSON.stringify({
        sent: 0,
        reason: !resendKey ? "RESEND_API_KEY not configured" : "no recipient emails",
      }),
      { status: 200 },
    );
  }

  const subject = `[${payload.severity.toUpperCase()}] ${payload.source}: ${payload.event_type}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto;">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">
        System health alert · ${payload.severity.toUpperCase()}
      </p>
      <h2 style="margin:0 0 12px;">${payload.source} — ${payload.event_type}</h2>
      <p style="color:#111827;">${payload.message}</p>
      ${
        payload.detail && Object.keys(payload.detail).length
          ? `<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${JSON.stringify(
              payload.detail,
              null,
              2,
            )}</pre>`
          : ""
      }
      <p style="margin-top:16px;font-size:12px;color:#6b7280;">Event id: ${payload.id}</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: emails,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ sent: 0, error: text }), { status: 502 });
  }

  return new Response(JSON.stringify({ sent: emails.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
