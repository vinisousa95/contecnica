import { NextRequest } from "next/server";

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for a single-process deployment (PM2 fork mode). If the app is ever
 * scaled to multiple instances, replace the Map with a shared store (Redis).
 */
type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until the window resets
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || now >= hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  hit.count += 1;
  if (hit.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (nginx sets X-Forwarded-For). */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Periodically drop expired entries so the Map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}
