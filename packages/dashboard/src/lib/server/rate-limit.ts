import 'server-only';

/**
 * Fixed-window rate limiter for mutations.
 * Serverless instances are independent, so this is a per-instance guard —
 * enough to stop a runaway client, not a distributed attacker. Redis is the
 * upgrade path when the deployment grows.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Occasionally clear expired buckets so the map cannot grow unbounded. */
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 300_000);
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
}
