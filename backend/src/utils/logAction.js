import AuditLog from '../models/AuditLog.model.js';

// Keys that must never appear in stored meta (recursively stripped).
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'interncode',
  'resetpasswordtoken',
]);

/**
 * Returns true when `key` (case-insensitive) is sensitive or contains "secret".
 */
function isSensitiveKey(key) {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.has(lower) || lower.includes('secret');
}

/**
 * Recursively strips sensitive keys from a value.
 * Returns a new object / array; never mutates the original.
 */
function stripSensitive(value) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(stripSensitive);
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isSensitiveKey(k)) {
        cleaned[k] = stripSensitive(v);
      }
    }
    return cleaned;
  }

  return value;
}

/**
 * Fire-and-forget audit logger.
 *
 * Signature:
 *   logAction({ req, actor, action, targetType, targetId, meta })
 *
 * - Must NEVER throw or delay the caller.
 * - When `actor` is null/undefined, sets actorId = null and actorRole = 'system'.
 */
export function logAction({ req, actor, action, targetType, targetId, meta }) {
  try {
    const actorId   = actor?.id ?? actor?._id ?? null;
    const actorRole = actor?.role ?? 'system';
    const ip        = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const ua        = req?.headers?.['user-agent'] || '';

    const safeMeta = meta ? stripSensitive(
      typeof meta === 'object' ? meta : { value: meta }
    ) : {};

    // Intentionally not awaited so the main request is never delayed.
    AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : undefined,
      meta: safeMeta,
      ip: String(ip).slice(0, 100),
      userAgent: String(ua).slice(0, 500),
      createdAt: new Date(),
    }).catch((err) => {
      console.error('[logAction] audit write failed:', err.message);
    });
  } catch (err) {
    // Guaranteed non-blocking: never throw from logAction.
    console.error('[logAction] unexpected error:', err.message);
  }
}

export default logAction;
