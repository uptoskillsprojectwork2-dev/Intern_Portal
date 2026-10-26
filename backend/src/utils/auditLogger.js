import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

const SENSITIVE_KEYS = [/password/i, /token/i, /intern.?code/i, /secret/i, /credential/i, /authorization/i, /cookie/i, /api.?key/i];
const redactSensitiveText = (value) => String(value).replace(
  /(password|passphrase|token|secret|intern.?code|credential|authorization|cookie|api.?key)(\s*[:=]\s*)(?:Bearer\s+)?("[^"]*"|'[^']*'|[^\s,;&]+)/gi,
  '$1$2[REDACTED]'
).replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');

const stripSensitiveData = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map(stripSensitiveData);
  if (typeof value !== 'object') return value;

  return Object.entries(value).reduce((cleaned, [key, nestedValue]) => {
    const shouldStrip = SENSITIVE_KEYS.some((pattern) => pattern.test(key));
    if (!shouldStrip) {
      cleaned[key] = stripSensitiveData(nestedValue);
    }
    return cleaned;
  }, {});
};

export async function logAudit({ userId, actor, action, entityType, entityId, targetType, targetId, description, meta, req }) {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('Audit log failure: database is not connected.');
      return;
    }
    const resolvedUserId = userId || actor?._id || (typeof actor === 'string' ? actor : null);
    const actorRole = actor?.role || req?.user?.role || (resolvedUserId ? 'unknown' : 'system');
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';
    const safeMeta = stripSensitiveData(meta ?? description ?? {});
    const safeDescription = description && typeof description === 'object'
      ? JSON.stringify(safeMeta)
      : redactSensitiveText(description || '');

    await AuditLog.create({
      actorId: resolvedUserId || null,
      userId: resolvedUserId || null,
      actorRole,
      action,
      entityType: entityType || targetType || 'unknown',
      targetType: targetType || entityType || 'unknown',
      entityId: entityId || targetId || null,
      targetId: targetId || entityId || null,
      meta: safeMeta,
      description: safeDescription,
      ip: String(ipAddress).slice(0, 100),
      ipAddress: String(ipAddress).slice(0, 100),
      userAgent: String(userAgent).slice(0, 255)
    });
  } catch (err) {
    console.error('Audit log failure:', err.message);
  }
}

export const logAction = logAudit;
export default logAudit;
