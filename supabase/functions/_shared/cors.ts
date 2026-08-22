// Every edge function called directly from the browser (via
// supabase.functions.invoke or fetch) needs CORS headers on every response —
// including error responses — plus a handler for the preflight OPTIONS
// request the browser sends first for any non-simple request (custom
// Authorization header, JSON content-type, etc). Missing either of these
// surfaces to the caller as a generic "Failed to send a request to the Edge
// Function", with no indication it was a CORS problem.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/** Call first in every handler; returns a response to short-circuit on if this was a preflight request. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

/** Wrap every Response constructed by the function so CORS headers survive on success and error alike. */
export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
