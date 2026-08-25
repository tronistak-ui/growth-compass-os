// In-memory rate limiter for auth endpoints (sign-up, sign-in, password
// reset). Deliberately not Redis-backed: the deployment model is one Node
// process on a single shared VPS (see the launch plan), so a process-local
// Map is enough to blunt a live brute-force/spam attempt without new
// infrastructure. It resets on deploy/restart — acceptable, since the goal
// is throttling in-progress abuse, not permanent bans.
import { getRequestHeader } from "@tanstack/react-start/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Sweep expired buckets periodically so the Map doesn't grow unbounded.
// unref() so this timer never keeps the process alive on its own.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

export class RateLimitError extends Error {
  constructor(retryAfterSeconds: number) {
    super(`Too many attempts — please wait ${retryAfterSeconds}s and try again`);
    this.name = "RateLimitError";
  }
}

/**
 * Throws RateLimitError once `key` has been called more than `limit` times
 * within the trailing `windowMs`. Callers choose the key (e.g. an IP, or an
 * IP+email pair) and the limit/window that fits the endpoint being guarded.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count++;
  if (bucket.count > limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }
}

/** Best-effort client IP from the reverse proxy — falls back to "unknown" for local dev with no proxy in front. */
export function getClientIp(): string {
  const forwarded = getRequestHeader("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return getRequestHeader("x-real-ip") ?? "unknown";
}
