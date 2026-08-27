// One-time-payment activation gate. A short, human-typeable code (not the
// long base64url tokens used for invites/password-reset — this one gets
// read over WhatsApp or typed by hand) generated once per organization and
// shown to the operator exactly once at creation time. Only its hash is
// ever stored, same principle as organizationInvites.tokenHash.
import { randomBytes, createHash } from "node:crypto";

// Excludes 0/O and 1/I/L — characters that are easy to misread when typed
// by hand from a message.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateActivationCode(): string {
  const bytes = randomBytes(10);
  let raw = "";
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function hashActivationCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
