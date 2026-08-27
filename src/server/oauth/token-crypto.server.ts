// AES-GCM encryption for social_connections.access_token / refresh_token.
// Ported from supabase/functions/_shared/token-crypto.ts — Web Crypto is
// available as a Node global, so the implementation is unchanged.
// TOKEN_ENCRYPTION_KEY is a 32-byte key, base64-encoded (see .env).
//
// Ciphertext format: base64(iv (12 bytes) || ciphertext) — the IV is random
// per encryption call and safe to store alongside the ciphertext.

function getKeyMaterial(): string {
  const key = process.env["TOKEN_ENCRYPTION_KEY"];
  if (!key) throw new Error("Missing TOKEN_ENCRYPTION_KEY environment variable.");
  return key;
}

async function aesKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await aesKey(getKeyMaterial());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)),
  );
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  let binary = "";
  for (const b of combined) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function decryptToken(encoded: string): Promise<string> {
  const key = await aesKey(getKeyMaterial());
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
