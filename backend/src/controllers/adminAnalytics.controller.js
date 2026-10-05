import mongoose from "mongoose";
import XLSX from "xlsx";
import User from "../models/User.js";
import CertificateRequest from "../models/CertificateRequest.js";
import Certificate from "../models/Certificate.js";
import Department from "../models/Department.js";
import AuditLog from "../models/AuditLog.js";

const DAY = 24 * 60 * 60 * 1000;
const VALID_STATUSES = ["pending", "approved", "rejected", "processing", "completed", "cancelled"];

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${label} date.`);
    error.status = 400;
    throw error;
  }
  return date;
}

function getFilters(query = {}) {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");
  if (from && to && from > to) {
    const error = new Error("The from date must be before or equal to the to date.");
    error.status = 400;
    throw error;
  }
  const rawDays = Number.parseInt(query.overdueDays ?? "7", 10);
  return {
    from,
    to,
    domain: typeof query.domain === "string" ? query.domain.trim() : "",
    teamLeader: typeof query.teamLeader === "string" ? query.teamLeader.trim() : "",
    overdueDays: Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 365) : 7,
  };
}

function dateMatch(field, { from, to }) {
  const match = {};
  if (from || to) {
    match[field] = {};
    if (from) match[field].$gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      match[field].$lte = end;
    }
  }
  return match;
}

async function getLeaderEmail(teamLeader) {
  if (!teamLeader) return "";
  const validId = mongoose.isValidObjectId(teamLeader);
  const leader = await User.findOne({
    role: "teamleader",
    ...(validId ? { _id: teamLeader } : { email: teamLeader.toLowerCase() }),
  }).select("email").lean();
  return leader?.email?.toLowerCase() || "__no_matching_team_leader__";
}

async function buildScope(filters) {
  const leaderEmail = await getLeaderEmail(filters.teamLeader);
  const userMatch = { role: "intern", ...dateMatch("createdAt", filters) };
  const requestMatch = { ...dateMatch("requestedAt", filters) };
  const certificateMatch = { ...dateMatch("issuedDate", filters) };
  if (filters.domain) {
    userMatch.domain = filters.domain;
    certificateMatch.domain = filters.domain;
  }
  if (filters.teamLeader) userMatch["internshipDetails.teamleaderEmail"] = leaderEmail;
  if (filters.teamLeader || filters.domain) {
    const scopedUsers = await User.find({
      role: "intern",
      ...(filters.domain ? { domain: filters.domain } : {}),
      ...(filters.teamLeader ? { "internshipDetails.teamleaderEmail": leaderEmail } : {}),
    }).select("_id").lean();
    requestMatch.userId = { $in: scopedUsers.map((user) => user._id) };
    certificateMatch.userId = { $in: scopedUsers.map((user) => user._id) };
  }
  return { userMatch, requestMatch, certificateMatch };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return Math.round(sorted[lower] / DAY * 10) / 10;
  return Math.round((((sorted[lower] * (upper - index)) + (sorted[upper] * (index - lower)) ) / DAY) * 10) / 10;
}

function durationStats(values) {
  if (!values.length) return { averageDays: 0, medianDays: 0, p90Days: 0, sampleSize: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    averageDays: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length / DAY) * 10) / 10,
    medianDays: percentile(values, 0.5),
    p90Days: percentile(values, 0.9),
    sampleSize: values.length,
  };
}

const asDays = (ms) => Math.max(0, ms / DAY);

export async function getAnalyticsOverview(req, res) {
  try {
    const filters = getFilters(req.query);
    const { userMatch, requestMatch, certificateMatch } = await buildScope(filters);
    const [interns, teamLeaders, requests, issuedCertificates, allRequests] = await Promise.all([
      User.find(userMatch).select("internshipDetails.status").lean(),
      User.countDocuments({ role: "teamleader", ...dateMatch("createdAt", filters) }),
      CertificateRequest.find(requestMatch).select("status requestedAt reviewedAt").lean(),
      Certificate.countDocuments({ ...certificateMatch, status: "issued" }),
      CertificateRequest.find({ ...requestMatch, status: { $in: ["approved", "completed", "rejected"] } }).select("status").lean(),
    ]);
    const active = interns.filter((user) => user.internshipDetails?.status === "ongoing").length;
    const pending = requests.filter((request) => request.status === "pending").length;
    const approvedOrRejected = allRequests.length;
    const approved = allRequests.filter((request) => ["approved", "completed"].includes(request.status)).length;
    const turnaround = requests.filter((request) => request.requestedAt && request.reviewedAt)
      .map((request) => asDays(new Date(request.reviewedAt) - new Date(request.requestedAt)));
    res.json({
      kpis: {
        totalInterns: interns.length,
        activeInterns: active,
        upcomingInterns: interns.filter((user) => user.internshipDetails?.status === "upcoming").length,
        completedInterns: interns.filter((user) => user.internshipDetails?.status === "completed").length,
        cancelledInterns: interns.filter((user) => user.internshipDetails?.status === "cancelled").length,
        totalTeamLeaders: teamLeaders,
        pendingRequests: pending,
        requestsInPeriod: requests.length,
        certificatesIssuedInPeriod: issuedCertificates,
        approvalRate: approvedOrRejected ? Math.round((approved / approvedOrRejected) * 100) : 0,
        rejectionRate: approvedOrRejected ? Math.round((allRequests.filter((request) => request.status === "rejected").length / approvedOrRejected) * 100) : 0,
        averageTurnaroundDays: turnaround.length ? Math.round((turnaround.reduce((sum, value) => sum + value, 0) / turnaround.length) * 10) / 10 : 0,
      },
      filters: { from: filters.from, to: filters.to },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load analytics overview." });
  }
}

export async function getRequestsTrend(req, res) {
  try {
    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const requestedRange = req.query.range || "6m";
    const groupBy = req.query.groupBy === "week" ? "week" : req.query.groupBy === "day" ? "day" : "month";
    let start = filters.from;
    if (!start && !filters.to) {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      if (requestedRange === "7d") start.setDate(start.getDate() - 6);
      else if (requestedRange === "30d") start.setDate(start.getDate() - 29);
      else start.setMonth(start.getMonth() - 5, 1);
      requestMatch.requestedAt = { ...(requestMatch.requestedAt || {}), $gte: start };
    }
    const dateFormat = groupBy === "day" ? "%Y-%m-%d" : groupBy === "week" ? "%G-W%V" : "%Y-%m";
    const rows = await CertificateRequest.aggregate([
      { $match: requestMatch },
      { $group: { _id: { period: { $dateToString: { format: dateFormat, date: "$requestedAt" } }, status: "$status" }, count: { $sum: 1 } } },
      { $sort: { "_id.period": 1 } },
    ]);
    const periods = [...new Set(rows.map((row) => row._id.period))];
    const series = VALID_STATUSES.map((status) => ({ name: status, data: periods.map((period) => rows.find((row) => row._id.period === period && row._id.status === status)?.count || 0) }));
    res.json({ labels: periods, series });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load request trends." });
  }
}

export async function getCertificateTypes(req, res) {
  try {
    const filters = getFilters(req.query);
    const { certificateMatch } = await buildScope(filters);
    const rows = await Certificate.aggregate([
      { $match: certificateMatch },
      { $group: { _id: "$certificateType", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.json({ items: rows.map((row) => ({ name: row._id || "Unspecified", value: row.count })) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load certificate types." });
  }
}

export async function getTurnaround(req, res) {
  try {
    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const requests = await CertificateRequest.find({ $and: [requestMatch, { requestedAt: { $exists: true }, reviewedAt: { $exists: true } }] }).select("requestedAt reviewedAt status").lean();
    const durations = requests.map((request) => Math.max(0, new Date(request.reviewedAt) - new Date(request.requestedAt)));
    res.json({ review: durationStats(durations), stages: [{ name: "Request to review", ...durationStats(durations) }] });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to calculate turnaround." });
  }
}

export async function getTeamLeaderPerformance(req, res) {
  try {
    const filters = getFilters(req.query);
    const teamLeaders = await User.find({ role: "teamleader" }).select("fullName email").lean();
    const output = await Promise.all(teamLeaders.map(async (leader) => {
      const internFilter = { role: "intern", "internshipDetails.teamleaderEmail": leader.email.toLowerCase() };
      if (filters.domain) internFilter.domain = filters.domain;
      const interns = await User.find(internFilter).select("_id").lean();
      const ids = interns.map((intern) => intern._id);
      const requestFilter = { userId: { $in: ids }, ...dateMatch("requestedAt", filters) };
      const requests = await CertificateRequest.find(requestFilter).select("status requestedAt reviewedAt").lean();
      const durations = requests.filter((item) => item.reviewedAt && item.requestedAt).map((item) => new Date(item.reviewedAt) - new Date(item.requestedAt));
      const cutoff = Date.now() - filters.overdueDays * DAY;
      const overdue = requests.filter((item) => item.status === "pending" && new Date(item.requestedAt).getTime() < cutoff).length;
      const decided = requests.filter((item) => ["completed", "rejected"].includes(item.status)).length;
      const rejected = requests.filter((item) => item.status === "rejected").length;
      return {
        id: String(leader._id), fullName: leader.fullName, email: leader.email,
        internsAssigned: interns.length, requestsReviewed: requests.filter((item) => item.reviewedAt).length,
        pendingReviews: requests.filter((item) => item.status === "pending").length,
        overdueRequests: overdue,
        averageReviewDays: durations.length ? Math.round(durations.reduce((sum, item) => sum + item, 0) / durations.length / DAY * 10) / 10 : 0,
        rejectionRate: decided ? Math.round(rejected / decided * 100) : 0,
      };
    }));
    const sorted = output.filter((leader) => !filters.teamLeader || leader.id === filters.teamLeader || leader.email.toLowerCase() === filters.teamLeader.toLowerCase())
      .sort((a, b) => b.overdueRequests - a.overdueRequests || b.pendingReviews - a.pendingReviews || a.fullName.localeCompare(b.fullName));
    res.json({ items: sorted, overdueDays: filters.overdueDays });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load team leader performance." });
  }
}

export async function getDomainAnalytics(req, res) {
  try {
    const filters = getFilters(req.query);
    const { userMatch } = await buildScope({ ...filters, teamLeader: "" });
    const rows = await User.aggregate([
      { $match: userMatch },
      { $group: { _id: { $ifNull: ["$domain", "Unassigned"] }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    const departments = await Department.find({ isActive: true }).select("departmentName departmentCode").lean();
    res.json({ items: rows.map((row) => ({ name: row._id || "Unassigned", value: row.count })), departments });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load domain analytics." });
  }
}

export async function getAnalyticsPipeline(req, res) {
  try {
    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const rows = await CertificateRequest.aggregate([
      { $match: requestMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const countByStatus = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    res.json({ items: [
      { name: "Pending", status: "pending", value: countByStatus.pending || 0 },
      { name: "TL approved", status: "approved", value: countByStatus.approved || 0 },
      { name: "Processing", status: "processing", value: countByStatus.processing || 0 },
      { name: "Completed", status: "completed", value: countByStatus.completed || 0 },
      { name: "Rejected", status: "rejected", value: countByStatus.rejected || 0 },
      { name: "Cancelled", status: "cancelled", value: countByStatus.cancelled || 0 },
    ] });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load request pipeline." });
  }
}

export async function getStuckRequests(req, res) {
  try {
    const filters = getFilters(req.query);
    const { requestMatch } = await buildScope(filters);
    const cutoff = new Date(Date.now() - filters.overdueDays * DAY);
    const requests = await CertificateRequest.find({ $and: [requestMatch, { status: "pending", requestedAt: { $lt: cutoff } }] })
      .populate("userId", "fullName email domain internshipDetails.teamleaderEmail")
      .sort({ requestedAt: 1 }).limit(100).lean();
    res.json({ items: requests.map((item) => ({
      id: String(item._id), requestNumber: item.requestNumber, certificateType: item.certificateType,
      status: item.status, requestedAt: item.requestedAt,
      internName: item.userId?.fullName || "Unknown intern", internEmail: item.userId?.email || "",
      domain: item.userId?.domain || "Unassigned", teamLeaderEmail: item.userId?.internshipDetails?.teamleaderEmail || "",
      waitingDays: Math.floor((Date.now() - new Date(item.requestedAt).getTime()) / DAY),
    })) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load stuck requests." });
  }
}

export async function getUpcomingCompletions(req, res) {
  try {
    const filters = getFilters(req.query);
    const days = Math.min(Math.max(Number.parseInt(req.query.days || "30", 10) || 30, 1), 90);
    const now = new Date();
    const end = new Date(now.getTime() + days * DAY);
    const match = { role: "intern", endDate: { $gte: now, $lte: end } };
    if (filters.domain) match.domain = filters.domain;
    if (filters.teamLeader) match["internshipDetails.teamleaderEmail"] = await getLeaderEmail(filters.teamLeader);
    const interns = await User.find(match).select("fullName email domain endDate internshipDetails.teamleaderEmail").sort({ endDate: 1 }).lean();
    const ids = interns.map((item) => item._id);
    const requested = await CertificateRequest.distinct("userId", { userId: { $in: ids } });
    const requestedSet = new Set(requested.map(String));
    res.json({ items: interns.map((item) => ({ id: String(item._id), fullName: item.fullName, email: item.email, domain: item.domain || "Unassigned", endDate: item.endDate, daysRemaining: Math.ceil((new Date(item.endDate) - now) / DAY), hasRequestedCertificate: requestedSet.has(String(item._id)) })) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Unable to load upcoming completions." });
  }
}

const EXPORTS = {
  overview: getAnalyticsOverview,
  "requests-trend": getRequestsTrend,
  "certificate-types": getCertificateTypes,
  turnaround: getTurnaround,
  "team-leaders": getTeamLeaderPerformance,
  domains: getDomainAnalytics,
  pipeline: getAnalyticsPipeline,
  "stuck-requests": getStuckRequests,
  "upcoming-completions": getUpcomingCompletions,
};

export async function exportAnalytics(req, res) {
  try {
    const type = String(req.query.type || "");
    const handler = EXPORTS[type];
    if (!handler) return res.status(400).json({ message: "Unsupported export type." });
    const mockRes = {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.payload = data; return this; },
    };
    await handler({ ...req, query: req.query }, mockRes);
    if (mockRes.statusCode >= 400) return res.status(mockRes.statusCode).json(mockRes.payload);
    const payload = mockRes.payload || {};
    const rows = Array.isArray(payload.items) ? payload.items : payload.kpis ? [payload.kpis] : payload.labels ? payload.labels.map((label, index) => ({ label, ...Object.fromEntries((payload.series || []).map((series) => [series.name, series.data[index] || 0])) })) : payload.review ? [payload.review] : [];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ message: "No data for selected filters" }]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Analytics");
    const format = String(req.query.format || "csv").toLowerCase() === "xlsx" ? "xlsx" : "csv";
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: format });
    await AuditLog.create({
      userId: req.user?.id,
      action: "analytics_export",
      entityType: "admin_analytics",
      description: `Exported ${type} analytics as ${format.toUpperCase()}`,
      ipAddress: req.ip,
      userAgent: req.get?.("user-agent") || "",
    });
    res.setHeader("Content-Disposition", `attachment; filename="admin-analytics-${type}.${format}"`);
    res.setHeader("Content-Type", format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8");
    return res.send(buffer);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Unable to export analytics." });
  }
}
