// Simple in-memory token bucket rate limiter for Edge/Node.
// For production at 1M concurrency, swap the Map for Upstash Redis.

const buckets = new Map<string, { tokens: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { tokens: max - 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (bucket.tokens <= 0) return { ok: false, remaining: 0 };
  bucket.tokens--;
  return { ok: true, remaining: bucket.tokens };
}

// Periodic cleanup to avoid unbounded growth (runs lazily on each check in prod via Redis TTL).
if (typeof setInterval !== "undefined") {
  // Only in Node, not Edge
  try {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }, 60_000).unref?.();
  } catch {}
}
