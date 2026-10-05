type Bucket = {
  count: number;
  lockedUntil: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { limit: number; lockMs: number; windowMs: number },
) {
  const now = Date.now();
  const current = buckets.get(key);
  if (current?.lockedUntil && current.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((current.lockedUntil - now) / 1000) };
  }
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 0, lockedUntil: 0, resetAt: now + options.windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: current.count < options.limit, retryAfter: 0 };
}

export function recordRateLimitFailure(
  key: string,
  options: { limit: number; lockMs: number; windowMs: number },
) {
  const now = Date.now();
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, lockedUntil: 0, resetAt: now + options.windowMs }
    : current;
  bucket.count += 1;
  if (bucket.count >= options.limit) bucket.lockedUntil = now + options.lockMs;
  buckets.set(key, bucket);
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
