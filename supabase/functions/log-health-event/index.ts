// supabase/functions/log-health-event/index.ts
//
// Lets any authenticated client report a health event (an RLS denial it hit,
// a background sync that failed client-side, etc.) without needing table
// INSERT rights on system_health_events. The function validates the caller's
// JWT, then writes the row with the service role, which also fires the
// `trg_fan_out_health_event` DB trigger (in-app notification + email for
// error/critical severities).
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided),
// SUPABASE_ANON_KEY (auto-provided, used to validate the caller's JWT).

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_SEVERITY = new Set(["info", "warning", "error", "critical"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization header", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate the caller is a real logged-in user (rejects forged/expired JWTs).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    severity?: string;
    source?: string;
    event_type?: string;
    message?: string;
    detail?: Record<string, unknown>;
    organization_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const severity = ALLOWED_SEVERITY.has(body.severity ?? "") ? body.severity! : "warning";
  if (!body.source || !body.event_type || !body.message) {
    return new Response("source, event_type and message are required", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin
    .from("system_health_events")
    .insert({
      severity,
      source: body.source,
      event_type: body.event_type,
      message: body.message.slice(0, 2000),
      detail: { ...body.detail, reported_by: userData.user.id },
      organization_id: body.organization_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: data.id }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});
