const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 30;
const MAX_CLIENTS = 10000;
const clients = new Map();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of clients) {
    if (now - entry.startedAt >= WINDOW_MS) clients.delete(key);
  }
}, WINDOW_MS);
cleanupTimer.unref?.();

export default function publicRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  let entry = clients.get(key);

  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    if (clients.size >= MAX_CLIENTS) clients.delete(clients.keys().next().value);
    entry = { startedAt: now, count: 0 };
    clients.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetSeconds = Math.ceil((entry.startedAt + WINDOW_MS - now) / 1000);
  res.set('RateLimit-Limit', String(MAX_REQUESTS));
  res.set('RateLimit-Remaining', String(remaining));
  res.set('RateLimit-Reset', String(resetSeconds));

  if (entry.count > MAX_REQUESTS) {
    res.set('Retry-After', String(resetSeconds));
    return res.status(429).json({ message: 'Too many certificate verification requests. Try again later.' });
  }

  return next();
}
