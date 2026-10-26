import XLSX from 'xlsx';
import {
  getOverviewKPIs,
  getRequestsTrend,
  getCertificateTypes,
  getTurnaroundStats,
  getTeamLeadersPerformance,
  getDomainsDistribution,
  getPipelineStages,
  getUpcomingCompletions,
  getStuckRequests,
  getFilteredRequests
} from '../services/adminAnalytics.service.js';
import { getAnalyticsCacheVersion, getCache, setCache } from '../utils/redisCache.js';
import { logAudit } from '../utils/auditLogger.js';

const inFlightAnalytics = new Map();

const readFilters = (query) => ({
  from: query.from,
  to: query.to,
  range: query.range,
  domain: query.domain,
  teamLeaderId: query.teamLeaderId || query.teamLeader,
  groupBy: query.groupBy || 'month',
  overdueDays: query.overdueDays ? Number(query.overdueDays) : undefined
});

export const buildAnalyticsCacheKey = (widget, query = {}, extras = {}) => {
  const filters = readFilters(query);
  const normalized = {
    from: filters.from || null,
    to: filters.to || null,
    range: filters.range || '6m',
    domain: filters.domain || null,
    teamLeaderId: filters.teamLeaderId || null,
    groupBy: filters.groupBy,
    days: query.days ? Number(query.days) : null,
    overdueDays: query.overdueDays ? Number(query.overdueDays) : null,
    status: query.status || null,
    reviewStage: query.reviewStage || null,
    certificateType: query.certificateType || null,
    page: query.page ? Number(query.page) : null,
    limit: query.limit ? Number(query.limit) : null,
    ...extras,
    generation: getAnalyticsCacheVersion()
  };
  return `analytics:${widget}:${JSON.stringify(normalized)}`;
};

async function fetchWithCache(cacheKey, ttl, fetcherFn) {
  try {
    const cached = await getCache(cacheKey);
    if (cached !== null) return cached;
  } catch { /* Cache outages must not make Analytics unavailable. */ }

  if (inFlightAnalytics.has(cacheKey)) return inFlightAnalytics.get(cacheKey);
  const cacheVersion = getAnalyticsCacheVersion();
  const pending = (async () => {
    const data = await fetcherFn();
    if (cacheVersion === getAnalyticsCacheVersion()) {
      try { await setCache(cacheKey, data, ttl); } catch { /* Cache writes are best effort. */ }
    }
    return data;
  })();
  inFlightAnalytics.set(cacheKey, pending);
  try { return await pending; }
  finally { if (inFlightAnalytics.get(cacheKey) === pending) inFlightAnalytics.delete(cacheKey); }
}

const fail = (res, message, error) => {
  console.error(`[admin-analytics] ${message}`, error);
  return res.status(500).json({ message });
};

async function sendWidget(res, widget, req, ttl, fetcher) {
  const data = await fetchWithCache(buildAnalyticsCacheKey(widget, req.query), ttl, () => fetcher(readFilters(req.query)));
  return res.status(200).json({ success: true, data });
}

export async function getOverview(req, res) {
  try { return await sendWidget(res, 'overview', req, 180, getOverviewKPIs); }
  catch (err) { return fail(res, 'Error retrieving overview analytics', err); }
}

export async function getTrend(req, res) {
  try { return await sendWidget(res, 'trend', req, 300, getRequestsTrend); }
  catch (err) { return fail(res, 'Error retrieving requests trend', err); }
}

export async function getTypes(req, res) {
  try { return await sendWidget(res, 'types', req, 300, getCertificateTypes); }
  catch (err) { return fail(res, 'Error retrieving certificate types analytics', err); }
}

export async function getTurnaround(req, res) {
  try { return await sendWidget(res, 'turnaround', req, 300, getTurnaroundStats); }
  catch (err) { return fail(res, 'Error retrieving turnaround time analytics', err); }
}

export async function getTeamLeaders(req, res) {
  try { return await sendWidget(res, 'teamleaders', req, 180, getTeamLeadersPerformance); }
  catch (err) { return fail(res, 'Error retrieving team leader analytics', err); }
}

export async function getDomains(req, res) {
  try { return await sendWidget(res, 'domains', req, 300, getDomainsDistribution); }
  catch (err) { return fail(res, 'Error retrieving domain analytics', err); }
}

export async function getPipeline(req, res) {
  try { return await sendWidget(res, 'pipeline', req, 180, getPipelineStages); }
  catch (err) { return fail(res, 'Error retrieving pipeline analytics', err); }
}

export async function getUpcoming(req, res) {
  try {
    const days = Number(req.query.days || 30);
    const data = await fetchWithCache(buildAnalyticsCacheKey('upcoming', req.query, { days }), 180,
      () => getUpcomingCompletions(days, readFilters(req.query)));
    return res.status(200).json({ success: true, data });
  } catch (err) { return fail(res, 'Error retrieving upcoming completions', err); }
}

export async function getStuck(req, res) {
  try {
    const days = Number(req.query.days || 3);
    const data = await fetchWithCache(buildAnalyticsCacheKey('stuck', req.query, { days }), 180,
      () => getStuckRequests(days, readFilters(req.query)));
    return res.status(200).json({ success: true, data });
  } catch (err) { return fail(res, 'Error retrieving stuck requests', err); }
}

export async function getRequests(req, res) {
  try {
    const filters = readFilters(req.query);
    const params = { status: req.query.status, reviewStage: req.query.reviewStage, certificateType: req.query.certificateType, page: req.query.page, limit: req.query.limit };
    const data = await fetchWithCache(buildAnalyticsCacheKey('requests', req.query, params), 120,
      () => getFilteredRequests(params, filters));
    return res.status(200).json({ success: true, data });
  } catch (err) { return fail(res, 'Error retrieving requests', err); }
}

function toExportRows(type, data) {
  if (type === 'overview') return Object.entries(data.kpis).map(([metric, value]) => ({ metric, value }));
  if (type === 'requests-trend') return data.raw;
  if (type === 'certificate-types') return data.breakdown;
  if (type === 'turnaround') return Object.entries(data).map(([stage, stats]) => ({ stage, ...stats }));
  if (type === 'team-leaders') return data;
  if (type === 'domains') return data.domains;
  if (type === 'pipeline') return [...data.pipeline, { stage: 'Failed draft generation (retry available)', status: 'failed-generation', count: data.failedGenerations }];
  if (type === 'stuck-requests' || type === 'upcoming-completions') return data;
  return [];
}

function safeSpreadsheetValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return JSON.stringify(value);
  }
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

export function rowsToCsv(rows) {
  if (!rows.length) return 'No data\r\n';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => `"${String(safeSpreadsheetValue(value) ?? '').replaceAll('"', '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
}

export async function exportAnalyticsCSV(req, res) {
  try {
    const { type = 'overview', format = 'csv' } = req.query;
    const filters = readFilters(req.query);
    const exports = {
      overview: () => getOverviewKPIs(filters),
      'requests-trend': () => getRequestsTrend(filters),
      'certificate-types': () => getCertificateTypes(filters),
      turnaround: () => getTurnaroundStats(filters),
      'team-leaders': () => getTeamLeadersPerformance(filters),
      domains: () => getDomainsDistribution(filters),
      pipeline: () => getPipelineStages(filters),
      'stuck-requests': () => getStuckRequests(Number(req.query.days || 3), filters),
      stuck: () => getStuckRequests(Number(req.query.days || 3), filters),
      'upcoming-completions': () => getUpcomingCompletions(Number(req.query.days || 30), filters)
    };
    const report = exports[type];
    if (!report) return res.status(400).json({ message: 'Unsupported analytics export type' });
    const data = await report();
    const rows = toExportRows(type === 'stuck' ? 'stuck-requests' : type, data)
      .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeSpreadsheetValue(value)])));
    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    const filename = `uptoskill_analytics_${type}_${new Date().toISOString().slice(0, 10)}.${extension}`;
    let content;

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, type.slice(0, 31));
      content = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      content = `\uFEFF${rowsToCsv(rows)}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    }

    await logAudit({
      userId: req.user.id,
      action: 'EXPORT',
      entityType: 'Analytics',
      description: { type, format, from: filters.from || null, to: filters.to || null, range: filters.range || null, domain: filters.domain || null, teamLeaderId: filters.teamLeaderId || null },
      req
    });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  } catch (err) {
    return fail(res, 'Error exporting analytics', err);
  }
}
