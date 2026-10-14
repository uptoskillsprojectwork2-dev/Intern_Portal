import AuditLog from '../models/AuditLog.model.js';

const SENSITIVE_EXACT_KEYS = new Set([
  'password',
  'token',
  'interncode',
  'resetpasswordtoken'
]);

export function sanitizeMeta(input, seen = new WeakSet()) {
  if (!input || typeof input !== 'object') {
    return input;
  }

  // Handle Dates, Regex, ObjectIds, Buffers without recursing
  if (
    input instanceof Date ||
    input instanceof RegExp ||
    input._bsontype ||
    input.constructor?.name === 'ObjectId' ||
    Buffer.isBuffer(input)
  ) {
    return input;
  }

  if (seen.has(input)) {
    return '[Circular]';
  }
  seen.add(input);

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeMeta(item, seen));
  }

  const clean = {};
  for (const [key, val] of Object.entries(input)) {
    const lowerKey = String(key).toLowerCase().trim();
    if (SENSITIVE_EXACT_KEYS.has(lowerKey) || lowerKey.includes('secret')) {
      continue;
    }
    clean[key] = sanitizeMeta(val, seen);
  }
  return clean;
}

/**
 * Audit Logger Helper
 * Must never throw or block the main request.
 *
 * @param {Object} params
 * @param {Object} [params.req] - Express request object
 * @param {Object} [params.actor] - { id, _id, role } or { role: 'system' }
 * @param {string} params.action - Standardized action name
 * @param {string} [params.targetType] - Target entity type (e.g. 'User', 'CertificateRequest')
 * @param {string|mongoose.Types.ObjectId} [params.targetId] - Target entity ID
 * @param {Object} [params.meta] - Arbitrary metadata (sensitive keys stripped automatically)
 */
export async function logAction({ req, actor, action, targetType, targetId, meta } = {}) {
  try {
    let resolvedActorId = null;
    let resolvedActorRole = null;

    if (actor) {
      if (actor.role === 'system') {
        resolvedActorId = null;
        resolvedActorRole = 'system';
      } else {
        resolvedActorId = actor.id || actor._id || null;
        resolvedActorRole = actor.role || null;
      }
    } else if (req?.user) {
      resolvedActorId = req.user.id || req.user._id || null;
      resolvedActorRole = req.user.role || null;
    }

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    const sanitizedMeta = sanitizeMeta(meta || {});

    await AuditLog.create({
      actorId: resolvedActorId,
      actorRole: resolvedActorRole,
      action,
      targetType: targetType || '',
      targetId: targetId ? String(targetId) : null,
      meta: sanitizedMeta,
      ip: String(ip).slice(0, 100),
      userAgent: String(userAgent).slice(0, 255)
    });
  } catch (error) {
    // Non-blocking logger: never throw or disrupt the application flow
    console.error('[logAction] Audit log failure:', error.message);
  }
}

export default logAction;
