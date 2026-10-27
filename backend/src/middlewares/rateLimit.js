export function createRateLimiter({ windowMs, max, message, key = () => '' }) {
  const buckets = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [id, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(id);
  }, Math.min(windowMs, 60_000));
  cleanup.unref?.();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const bucketKey = `${ip}:${key(req)}`;
    const now = Date.now();
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.expiresAt <= now) {
      if (buckets.size >= 20_000) buckets.delete(buckets.keys().next().value);
      bucket = { count: 0, expiresAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;
    const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message, retryAfter });
    }
    return next();
  };
}

const emailKey = (req) => typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'missing-email';
export const loginRateLimit = createRateLimiter({ windowMs: 15 * 60_000, max: 5, key: emailKey, message: 'Too many login attempts. Try again later.' });
export const forgotPasswordRateLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 3, key: emailKey, message: 'Too many password reset requests. Try again later.' });
export const credentialRateLimit = createRateLimiter({ windowMs: 15 * 60_000, max: 5, message: 'Too many attempts. Try again later.' });
