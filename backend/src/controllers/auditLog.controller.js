import AuditLog from '../models/AuditLog.model.js';
import { logAction } from '../utils/logAction.js';
import { EXPORT } from '../utils/auditActions.js';

/**
 * Build a MongoDB filter from validated query parameters.
 */
function buildFilter({ actor, action, targetType, from, to }) {
  const filter = {};

  if (actor) {
    filter.actorId = actor;
  }

  if (action) {
    filter.action = action;
  }

  if (targetType) {
    filter.targetType = targetType;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  return filter;
}

/**
 * Validate query params and return parsed values or throw a 400 message string.
 */
function validateQueryParams(query) {
  const errors = [];

  const page = Math.max(1, parseInt(query.page, 10) || 1);

  let limit = parseInt(query.limit, 10) || 25;
  if (limit < 1 || limit > 100) {
    errors.push('limit must be between 1 and 100');
  }
  limit = Math.min(Math.max(limit, 1), 100);

  const validSortFields = ['createdAt', 'action', 'actorRole'];
  let sortField = 'createdAt';
  let sortOrder = -1;

  if (query.sort) {
    const sortValue = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    if (!validSortFields.includes(sortValue)) {
      errors.push(`sort must be one of: ${validSortFields.join(', ')} (prefix with - for descending)`);
    } else {
      sortField = sortValue;
      sortOrder = query.sort.startsWith('-') ? -1 : 1;
    }
  }

  if (query.from && isNaN(Date.parse(query.from))) {
    errors.push('from must be a valid date');
  }

  if (query.to && isNaN(Date.parse(query.to))) {
    errors.push('to must be a valid date');
  }

  if (query.from && query.to) {
    if (new Date(query.from) > new Date(query.to)) {
      errors.push('from date must be before to date');
    }
  }

  if (errors.length) {
    return { error: errors.join('; ') };
  }

  return { page, limit, sortField, sortOrder };
}

/**
 * GET /api/admin/audit-logs
 *
 * Lists audit logs with server-side pagination, filtering, and sorting.
 */
export const getAuditLogs = async (req, res) => {
  const validation = validateQueryParams(req.query);

  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { page, limit, sortField, sortOrder } = validation;

  try {
    const filter = buildFilter(req.query);

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', 'fullName email')
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      logs,
      page,
      totalPages,
      total,
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ message: 'Unable to fetch audit logs.' });
  }
};

/**
 * GET /api/admin/audit-logs/export
 *
 * Exports current filter as CSV download.  The download itself is logged as EXPORT.
 */
export const exportAuditLogs = async (req, res) => {
  const validation = validateQueryParams({ ...req.query, limit: '100' });

  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    const filter = buildFilter(req.query);

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .populate('actorId', 'fullName email')
      .lean();

    // Log the export action.
    logAction({
      req,
      actor: { id: req.user.id, role: 'admin' },
      action: EXPORT,
      targetType: 'AuditLog',
      meta: { filter: req.query, count: logs.length },
    });

    // Build CSV
    const headers = ['Timestamp', 'Actor', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'IP', 'User Agent', 'Meta'];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = logs.map((log) => [
      escapeCSV(log.createdAt ? new Date(log.createdAt).toISOString() : ''),
      escapeCSV(log.actorId ? `${log.actorId.fullName || ''} (${log.actorId.email || ''})` : 'system'),
      escapeCSV(log.actorRole || ''),
      escapeCSV(log.action || ''),
      escapeCSV(log.targetType || ''),
      escapeCSV(log.targetId || ''),
      escapeCSV(log.ip || ''),
      escapeCSV(log.userAgent || ''),
      escapeCSV(log.meta ? JSON.stringify(log.meta) : ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Export audit logs error:', err);
    return res.status(500).json({ message: 'Unable to export audit logs.' });
  }
};
