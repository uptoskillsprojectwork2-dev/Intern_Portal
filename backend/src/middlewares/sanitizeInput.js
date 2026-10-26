function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
    .map(([key, nested]) => [key, sanitize(nested)]));
}

export default function sanitizeInput(req, res, next) {
  const query = req.query;
  const hasUnsafeQuery = Object.entries(query).some(([key, value]) =>
    key.startsWith('$') || key.includes('.') || typeof value !== 'string'
  );
  if (hasUnsafeQuery) return res.status(400).json({ message: 'Query parameters must be plain strings.' });
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  return next();
}
