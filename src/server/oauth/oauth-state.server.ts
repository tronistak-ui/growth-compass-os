// Shared HMAC-signed `state` helper for the OAuth connect flow
// (startOAuth / the /api/oauth/callback route). Ported from
// supabase/functions/_shared/oauth-state.ts, unchanged — Web Crypto is a
// Node global.
//
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
// Verifying recomputes the signature and does a constant-time compare, then
// checks the payload isn't older than MAX_STATE_AGE_MS — this is what stops
// a bare org id in the query string from being trusted (CSRF / cross-org
// connect spoofing).

export type OAuthStatePayload = {
  org_id: string;
  provider: string;
  user_id: string;
  nonce: string;
  iat: number; // ms since epoch
};

const MAX_STATE_AGE_MS = 10 * 60 * 1000; // 10 minutes

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSecret(): string {
  const secret = process.env["OAUTH_STATE_SECRET"];
  if (!secret) throw new Error("Missing OAUTH_STATE_SECRET environment variable.");
  return secret;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signState(payload: Omit<OAuthStatePayload, "iat">): Promise<string> {
  const full: OAuthStatePayload = { ...payload, iat: Date.now() };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(full));
  const key = await hmacKey(getSecret());
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

/** Returns the verified payload, or null if the signature/age check fails. */
export async function verifyState(state: string): Promise<OAuthStatePayload | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, sigPart] = parts;
  const payloadBytes = b64urlDecode(payloadPart!);
  const key = await hmacKey(getSecret());
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sigPart!) as BufferSource,
    payloadBytes as BufferSource,
  );
  if (!valid) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (Date.now() - payload.iat > MAX_STATE_AGE_MS) return null;
  return payload;
}
