import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditLogger.js';

const MAX_PAGE_SIZE = 100;
const parseDate = (value) => {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date;
};

function buildFilters(query) {
  const filter = {};
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from === undefined || to === undefined) throw new Error('Invalid date filter');
  if (from && to && from > to) throw new Error('Start date must be before end date');
  if (to) to.setUTCHours(23, 59, 59, 999);
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  for (const key of ['action', 'actorRole', 'targetType']) {
    if (query[key]) filter[key] = String(query[key]).trim().slice(0, 120);
  }
  if (query.actorId) {
    if (!/^[a-f\d]{24}$/i.test(query.actorId)) throw new Error('Invalid actorId');
    filter.actorId = query.actorId;
  }
  return filter;
}

export async function getAuditLogs(req, res) {
  let filter;
  try {
    filter = buildFilters(req.query);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid audit filters' });
  }
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    return res.status(400).json({ message: `Page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}` });
  }
  try {
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('actorId', 'fullName email role').lean(),
      AuditLog.countDocuments(filter),
    ]);
    return res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Audit log query failed:', error.message);
    return res.status(500).json({ message: 'Unable to load audit logs' });
  }
}

const csvCell = (value) => {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function exportAuditLogs(req, res) {
  let filter;
  try {
    filter = buildFilters(req.query);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid audit filters' });
  }
  try {
    const logs = await AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).limit(10000)
      .populate('actorId', 'fullName email role').lean();
    await logAudit({ userId: req.user.id, action: 'EXPORT_AUDIT_LOGS', targetType: 'AuditLog', meta: { filters: filter, exportedCount: logs.length }, req });
    const columns = ['timestamp', 'actor', 'actorEmail', 'actorRole', 'action', 'targetType', 'targetId', 'description', 'metadata', 'ipAddress', 'userAgent'];
    const rows = logs.map((log) => [
      log.createdAt?.toISOString(), log.actorId?.fullName || (log.actorRole === 'system' ? 'System' : ''),
      log.actorId?.email || '', log.actorRole, log.action, log.targetType, log.targetId?.toString() || '',
      log.description, log.meta, log.ipAddress || log.ip, log.userAgent,
    ]);
    const csv = `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Audit log export failed:', error.message);
    return res.status(500).json({ message: 'Unable to export audit logs' });
  }
}
