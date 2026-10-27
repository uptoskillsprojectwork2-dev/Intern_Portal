import mongoose from 'mongoose';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';

// Helper to resolve date range windows
export function resolveDateWindow(from, to, range = '6m') {
  const now = new Date();
  let startDate;
  let endDate = to ? new Date(to) : new Date(now);

  // Date-only filters are interpreted as UTC day boundaries.
  if (to && typeof to === 'string' && to.length === 10) {
    endDate.setUTCHours(23, 59, 59, 999);
  }

  if (from) {
    startDate = new Date(from);
    if (typeof from === 'string' && from.length === 10) {
      startDate.setUTCHours(0, 0, 0, 0);
    }
  } else {
    startDate = new Date(endDate);
    if (range === '7d') {
      startDate.setUTCDate(startDate.getUTCDate() - 7);
    } else if (range === '30d') {
      startDate.setUTCDate(startDate.getUTCDate() - 30);
    } else if (range === '12m') {
      startDate.setUTCMonth(startDate.getUTCMonth() - 12);
    } else if (range === 'all') {
      startDate = new Date(0);
    } else {
      // Default 6m
      startDate.setUTCMonth(startDate.getUTCMonth() - 6);
    }
  }

  // Previous period window for percentage change comparisons
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return { startDate, endDate, prevStartDate, prevEndDate };
}

async function getScopedInternIds(filters = {}, { includeDates = true } = {}) {
  const dateRange = resolveDateWindow(filters.from, filters.to, filters.range);
  const query = { role: 'intern' };
  if (filters.domain) query.domain = filters.domain;
  const teamLeaderId = filters.teamLeaderId || filters.teamLeader;
  if (teamLeaderId) {
    // teamLeaderId is canonical. The legacy ObjectId is used only for records
    // that have not yet been backfilled; email strings are never analytics keys.
    query.$or = [
      { 'internshipDetails.teamLeaderId': teamLeaderId },
      { 'internshipDetails.teamLeaderId': { $in: [null] }, 'internshipDetails.teamLeader': teamLeaderId }
    ];
  }
  if (includeDates) query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
  const interns = await User.find(query).select('_id');
  return interns.map(({ _id }) => _id);
}

async function getAssignedTeamLeaderIds(internIds) {
  if (!internIds.length) return [];
  const scope = { role: 'intern', _id: { $in: internIds } };
  const [canonical, legacy] = await Promise.all([
    User.distinct('internshipDetails.teamLeaderId', { ...scope, 'internshipDetails.teamLeaderId': { $ne: null } }),
    User.distinct('internshipDetails.teamLeader', { ...scope, 'internshipDetails.teamLeaderId': { $in: [null] }, 'internshipDetails.teamLeader': { $ne: null } })
  ]);
  return [...new Map([...canonical, ...legacy].filter(Boolean).map((id) => [String(id), id])).values()];
}

function scopedRequestMatch(filters, startDate, endDate, internIds) {
  return {
    requestedAt: { $gte: startDate, $lte: endDate },
    userId: { $in: internIds }
  };
}

// Percentiles use linear interpolation and durations are reported in hours.
export function calculatePercentiles(values) {
  if (!values || values.length === 0) {
    return { avg: 0, median: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Number((sum / sorted.length).toFixed(1));

  const getPercentile = (p) => {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  };

  const median = Number(getPercentile(50).toFixed(1));
  const p90 = Number(getPercentile(90).toFixed(1));

  return { avg, median, p90 };
}
const hoursBetweenDates = (start, end) => start && end && end >= start ? (end - start) / 3600000 : null;

/**
 * 1. Overview KPIs
 */
export async function getOverviewKPIs(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(
    filters.from,
    filters.to,
    filters.range
  );

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const internFilter = { _id: { $in: internIds } };
  const currentMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const currentMonthEnd = new Date();
  const previousMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1));
  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);
  const dateMatchCurrent = { requestedAt: { $gte: startDate, $lte: endDate } };
  const requestScope = { userId: { $in: internIds } };
  const currentMonthRequests = { requestedAt: { $gte: currentMonthStart, $lte: currentMonthEnd }, ...requestScope };
  const previousMonthRequests = { requestedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }, ...requestScope };
  const issuedThisMonth = {
    status: { $in: ['issued', 'finalized'] }, userId: { $in: internIds },
    $or: [
      { finalizedAt: { $gte: currentMonthStart, $lte: currentMonthEnd } },
      { finalizedAt: null, issuedDate: { $gte: currentMonthStart, $lte: currentMonthEnd } }
    ]
  };
  const issuedPreviousMonth = {
    status: { $in: ['issued', 'finalized'] }, userId: { $in: internIds },
    $or: [
      { finalizedAt: { $gte: previousMonthStart, $lte: previousMonthEnd } },
      { finalizedAt: null, issuedDate: { $gte: previousMonthStart, $lte: previousMonthEnd } }
    ]
  };
  const scopedLeaderIds = filters.domain || filters.teamLeader || filters.teamLeaderId
    ? await getAssignedTeamLeaderIds(internIds)
    : null;

  // Current period counts
  const [
    totalInterns,
    ongoingInterns,
    activeInterns,
    upcomingInterns,
    completedInterns,
    cancelledInterns,
    totalTeamLeaders,
    pendingRequests,
    approvedRequests,
    forwardedRequests,
    requestsThisMonth,
    certificatesIssuedThisMonth,
    totalApprovedCount,
    totalRejectedCount,
    prevRequestsCount,
    prevIssuedCertificates
  ] = await Promise.all([
    User.countDocuments(internFilter),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'ongoing' }),
    User.countDocuments({ ...internFilter, isArchived: { $ne: true }, 'internshipDetails.status': 'ongoing' }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'upcoming' }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'completed' }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'cancelled' }),
    User.countDocuments(scopedLeaderIds ? { _id: { $in: scopedLeaderIds }, role: 'teamleader' } : { role: 'teamleader' }),
    CertificateRequest.countDocuments({ status: 'pending', ...requestScope }),
    CertificateRequest.countDocuments({ status: 'approved', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'processing', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments(currentMonthRequests),
    Certificate.countDocuments(issuedThisMonth),
    CertificateRequest.countDocuments({ status: { $in: ['approved', 'completed'] }, ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'rejected', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments(previousMonthRequests),
    Certificate.countDocuments(issuedPreviousMonth)
  ]);

  const totalDecided = totalApprovedCount + totalRejectedCount;
  const approvalRate = totalDecided > 0 ? Number(((totalApprovedCount / totalDecided) * 100).toFixed(1)) : 0;
  const rejectionRate = totalDecided > 0 ? Number(((totalRejectedCount / totalDecided) * 100).toFixed(1)) : 0;

  // Turnaround calculation for current window
  const completedRequests = await CertificateRequest.find({
    status: 'completed',
    ...dateMatchCurrent,
    ...requestScope
  }).select('requestedAt updatedAt completedAt');

  const turnaroundHoursList = completedRequests
    .map((request) => hoursBetweenDates(request.requestedAt, request.completedAt || request.updatedAt))
    .filter((hours) => hours !== null && Number.isFinite(hours));

  const turnaroundStats = calculatePercentiles(turnaroundHoursList);

  // Percentage change calculations
  const calcChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  return {
    kpis: {
      totalInterns,
      ongoingInterns,
      activeInterns,
      upcomingInterns,
      completedInterns,
      cancelledInterns,
      totalTeamLeaders,
      pendingRequests,
      approvedRequests,
      forwardedRequests,
      requestsThisMonth,
      certificatesIssuedThisMonth,
      approvalRate,
      rejectionRate,
      avgTurnaroundHours: turnaroundStats.avg
    },
    changes: {
      requests: calcChange(requestsThisMonth, prevRequestsCount),
      certificates: calcChange(certificatesIssuedThisMonth, prevIssuedCertificates)
    },
    period: {
      startDate,
      endDate
    }
  };
}

/**
 * 2. Requests Trend
 */
export async function getRequestsTrend(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const groupBy = filters.groupBy || 'month';

  let formatStr = '%Y-%m';
  if (groupBy === 'day') formatStr = '%Y-%m-%d';
  if (groupBy === 'week') formatStr = '%G-W%V';

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const trendData = await CertificateRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: formatStr, date: '$requestedAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.period': 1 } }
  ]);

  // Aggregate into map of periods
  const periodsMap = {};
  const statuses = ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];

  trendData.forEach((item) => {
    const p = item._id.period;
    const s = item._id.status;
    if (!periodsMap[p]) {
      periodsMap[p] = { period: p, pending: 0, approved: 0, rejected: 0, processing: 0, completed: 0, cancelled: 0, total: 0 };
    }
    if (statuses.includes(s)) {
      periodsMap[p][s] = item.count;
    }
    periodsMap[p].total += item.count;
  });

  const raw = Object.values(periodsMap).sort((a, b) => a.period.localeCompare(b.period));
  const labels = raw.map((r) => r.period);

  const series = statuses.map((st) => ({
    status: st,
    name: st.charAt(0).toUpperCase() + st.slice(1),
    data: raw.map((r) => r[st] || 0)
  }));

  return { labels, series, raw };
}

/**
 * 3. Certificate Types Count & Breakdown
 */
export async function getCertificateTypes(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = {
    userId: { $in: internIds },
    status: { $in: ['issued', 'finalized'] },
    $or: [
      { finalizedAt: { $gte: startDate, $lte: endDate } },
      { finalizedAt: null, issuedDate: { $gte: startDate, $lte: endDate } }
    ]
  };

  const counts = await Certificate.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$certificateType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const total = counts.reduce((sum, item) => sum + item.count, 0);

  const breakdown = counts.map((item) => ({
    certificateType: item._id || 'Standard',
    count: item.count,
    percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0
  }));

  return { total, breakdown };
}

/**
 * 4. Turnaround Time Analysis (Average, Median, P90)
 */
export async function getTurnaroundStats(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const requests = await CertificateRequest.find({ requestedAt: { $gte: startDate, $lte: endDate }, userId: { $in: internIds } })
    .select('requestedAt forwardedAt reviewedAt status certificateId').lean();
  const hoursBetween = (start, end) => start && end && end >= start ? (end - start) / 3600000 : null;
  const values = (items) => items.filter((value) => value !== null && Number.isFinite(value));
  const tlTimes = requests.map((r) => hoursBetween(r.requestedAt, r.forwardedAt || (r.status === 'rejected' && !r.forwardedAt ? r.reviewedAt : null)));
  const adminTimes = requests.filter((r) => r.forwardedAt && r.reviewedAt && ['approved', 'rejected', 'completed'].includes(r.status))
    .map((r) => hoursBetween(r.forwardedAt, r.reviewedAt));
  const issuedRequests = requests.filter((r) => r.certificateId);
  const certificates = issuedRequests.length ? await Certificate.find({ _id: { $in: issuedRequests.map((r) => r.certificateId) } }).select('_id issuedDate finalizedAt status').lean() : [];
  const certificateById = new Map(certificates.map((c) => [String(c._id), c]));
  const generationTimes = [];
  const totalTimes = [];
  for (const request of issuedRequests) {
    const certificate = certificateById.get(String(request.certificateId));
    const isIssued = ['finalized', 'issued'].includes(certificate?.status);
    const issuedAt = isIssued ? (certificate.finalizedAt || certificate.issuedDate) : null;
    if (!issuedAt || !request.reviewedAt) continue;
    generationTimes.push(hoursBetween(request.reviewedAt, issuedAt));
    totalTimes.push(hoursBetween(request.requestedAt, issuedAt));
  }

  return {
    tlDecisionTime: calculatePercentiles(values(tlTimes)),
    adminDecisionTime: calculatePercentiles(values(adminTimes)),
    generationTime: calculatePercentiles(values(generationTimes)),
    totalTurnaround: calculatePercentiles(values(totalTimes)),
    // Compatibility keys used by existing dashboard labels.
    timeToTLReview: calculatePercentiles(values(tlTimes)),
    timeToAdminFinalize: calculatePercentiles(values(adminTimes))
  };
}

/**
 * 5. Team Leader Performance Table
 */
export async function getTeamLeadersPerformance(filters = {}) {
  const scopedInternIds = await getScopedInternIds(filters, { includeDates: false });
  const assignedLeaderIds = await getAssignedTeamLeaderIds(scopedInternIds);
  const leaderQuery = { role: 'teamleader', _id: { $in: assignedLeaderIds } };
  if (filters.teamLeader || filters.teamLeaderId) leaderQuery._id = filters.teamLeader || filters.teamLeaderId;
  const teamLeaders = await User.find(leaderQuery).select('_id fullName').lean();
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const interns = await User.find({ role: 'intern', _id: { $in: scopedInternIds } })
    .select('_id isArchived internshipDetails.teamLeaderId internshipDetails.teamLeader').lean();
  const leaderByInternId = new Map();
  const activeCountByLeader = new Map();
  for (const intern of interns) {
    const leaderId = intern.internshipDetails?.teamLeaderId || intern.internshipDetails?.teamLeader;
    if (!leaderId) continue;
    const key = String(leaderId);
    leaderByInternId.set(String(intern._id), key);
    if (!intern.isArchived) activeCountByLeader.set(key, (activeCountByLeader.get(key) || 0) + 1);
  }
  const requests = scopedInternIds.length
    ? await CertificateRequest.find({ userId: { $in: scopedInternIds }, requestedAt: { $gte: startDate, $lte: endDate } })
      .select('userId requestedAt reviewedAt forwardedAt status').lean()
    : [];
  const requestsByLeader = new Map();
  for (const request of requests) {
    const leaderId = leaderByInternId.get(String(request.userId));
    if (!leaderId) continue;
    if (!requestsByLeader.has(leaderId)) requestsByLeader.set(leaderId, []);
    requestsByLeader.get(leaderId).push(request);
  }

  const now = Date.now();
  const overdueDays = Number(filters.overdueDays) || 3;
  const performanceList = teamLeaders.map((leader) => {
    const leaderId = String(leader._id);
    const received = requestsByLeader.get(leaderId) || [];
    const forwardedCount = received.filter((request) => request.forwardedAt).length;
    const rejectedCount = received.filter((request) => request.status === 'rejected' && !request.forwardedAt && request.reviewedAt).length;
    const decided = received.filter((request) => request.forwardedAt || (request.status === 'rejected' && request.reviewedAt));
    const durations = decided.map((request) => hoursBetweenDates(request.requestedAt, request.forwardedAt || request.reviewedAt))
      .filter((hours) => hours !== null && Number.isFinite(hours));
    const pending = received.filter((request) => request.status === 'pending');
    const ages = pending.map((request) => (now - new Date(request.requestedAt).getTime()) / 86400000)
      .filter((age) => Number.isFinite(age) && age >= 0);
    return {
      id: leader._id,
      fullName: leader.fullName,
      internsAssigned: activeCountByLeader.get(leaderId) || 0,
      requestsReceived: received.length,
      requestsForwarded: forwardedCount,
      requestsRejected: rejectedCount,
      requestsReviewed: decided.length,
      pendingReviews: pending.length,
      avgReviewTimeHours: calculatePercentiles(durations).avg,
      rejectionRate: decided.length ? Number(((rejectedCount / decided.length) * 100).toFixed(1)) : 0,
      hasOverdueRequests: ages.some((age) => age > overdueDays),
      maxPendingDays: ages.length ? Number(Math.max(...ages).toFixed(1)) : 0
    };
  });

  return performanceList.sort((a, b) => b.pendingReviews - a.pendingReviews);
}

/**
 * 6. Domains & Departments Distribution
 */
export async function getDomainsDistribution(filters = {}) {
  const internIds = await getScopedInternIds(filters, { includeDates: false });

  const userDomainCounts = await User.aggregate([
    { $match: { role: 'intern', _id: { $in: internIds } } },
    {
      $group: {
        _id: '$domain',
        totalInterns: { $sum: 1 },
        activeInterns: {
          $sum: { $cond: [{ $and: [{ $eq: ['$internshipDetails.status', 'ongoing'] }, { $ne: ['$isArchived', true] }] }, 1, 0] }
        }
      }
    }
  ]);

  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const certDomainCounts = await Certificate.aggregate([
    {
      $match: {
        userId: { $in: internIds },
        status: { $in: ['issued', 'finalized'] },
        $or: [
          { finalizedAt: { $gte: startDate, $lte: endDate } },
          { finalizedAt: null, issuedDate: { $gte: startDate, $lte: endDate } }
        ]
      }
    }, {
      $group: {
        _id: '$domain',
        certificatesCount: { $sum: 1 }
      }
    }
  ]);

  const certMap = {};
  certDomainCounts.forEach((c) => {
    if (c._id) certMap[c._id] = c.certificatesCount;
  });

  const domains = userDomainCounts.map((d) => {
    const domainName = d._id || 'Unassigned';
    return {
      domain: domainName,
      totalInterns: d.totalInterns,
      activeInterns: d.activeInterns,
      certificatesCount: certMap[domainName] || 0
    };
  });

  return { domains };
}

/**
 * 7. Pipeline / Bottleneck Stages
 */
export async function getPipelineStages(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const stagesData = await CertificateRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const map = { pending: 0, approved: 0, processing: 0, completed: 0, rejected: 0, cancelled: 0 };
  stagesData.forEach((s) => {
    if (map[s._id] !== undefined) map[s._id] = s.count;
  });

  // Failed generations count (requests in processing/draft state or flagged)
  const generationCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const approvedRequests = await CertificateRequest.find({ status: 'approved', ...matchQuery }).select('certificateId updatedAt reviewedAt');
  const approvedCertificateIds = approvedRequests.map(({ certificateId }) => certificateId).filter(Boolean);
  const linkedCertificates = approvedCertificateIds.length ? await Certificate.find({ _id: { $in: approvedCertificateIds } }).select('_id status') : [];
  const linkedById = new Map(linkedCertificates.map((certificate) => [String(certificate._id), certificate.status]));
  const failedGenerations = approvedRequests.filter((request) => {
    const hasStoredCertificate = request.certificateId && linkedById.has(String(request.certificateId));
    const certificateStatus = hasStoredCertificate ? linkedById.get(String(request.certificateId)) : null;
    return (request.reviewedAt || request.updatedAt) < generationCutoff &&
      (!hasStoredCertificate || certificateStatus === 'draft');
  }).length;
  const awaitingFinalization = approvedRequests.filter((request) => linkedById.get(String(request.certificateId)) === 'draft').length;

  const pipeline = [
    { stage: 'With Team Leader', status: 'pending', count: map.pending },
    { stage: 'With Admin', status: 'processing', count: map.processing },
    { stage: 'Awaiting finalization', status: 'approved', count: awaitingFinalization },
    { stage: 'Completed & Issued', status: 'completed', count: map.completed },
    { stage: 'Rejected by Team Leader', status: 'rejected-tl', count: await CertificateRequest.countDocuments({ ...matchQuery, status: 'rejected', forwardedAt: null }) },
    { stage: 'Rejected by Admin', status: 'rejected-admin', count: await CertificateRequest.countDocuments({ ...matchQuery, status: 'rejected', forwardedAt: { $ne: null } }) },
    { stage: 'Cancelled', status: 'cancelled', count: map.cancelled }
  ];

  return { pipeline, failedGenerations };
}

/**
 * 8. Upcoming Completions
 */
export async function getUpcomingCompletions(days = 30, filters = {}) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);
  const futureDate = new Date(startDate);
  futureDate.setUTCDate(futureDate.getUTCDate() + Number(days));
  futureDate.setUTCHours(23, 59, 59, 999);
  if (filters.from || filters.to) {
    const selected = resolveDateWindow(filters.from, filters.to, filters.range);
    if (selected.startDate > startDate) startDate.setTime(selected.startDate.getTime());
    if (selected.endDate < futureDate) futureDate.setTime(selected.endDate.getTime());
  }

  const internFilter = {
    role: 'intern',
    'internshipDetails.status': 'ongoing', isArchived: { $ne: true },
    endDate: { $gte: startDate, $lte: futureDate }
  };
  if (filters.domain) internFilter.domain = filters.domain;
  const leaderId = filters.teamLeaderId || filters.teamLeader;
  if (leaderId) {
    internFilter.$or = [
      { 'internshipDetails.teamLeaderId': leaderId },
      { 'internshipDetails.teamLeaderId': { $in: [null] }, 'internshipDetails.teamLeader': leaderId }
    ];
  }
  const interns = await User.find(internFilter)
    .select('fullName domain endDate internshipDetails.teamLeaderId internshipDetails.teamLeader')
    .populate('internshipDetails.teamLeaderId', 'fullName')
    .populate('internshipDetails.teamLeader', 'fullName')
    .lean();
  const internIds = interns.map(({ _id }) => _id);
  const completionRequests = internIds.length
    ? await CertificateRequest.find({
      userId: { $in: internIds },
      certificateType: { $in: ['completion_certificate', 'internship_completion_certificate'] }
    })
      .select('userId status requestNumber requestedAt').sort({ requestedAt: -1 }).lean()
    : [];
  const requestByInternId = new Map();
  for (const request of completionRequests) {
    const key = String(request.userId);
    if (!requestByInternId.has(key)) requestByInternId.set(key, request);
  }

  const results = interns.map((intern) => {
    const request = requestByInternId.get(String(intern._id));
    const teamLeader = intern.internshipDetails?.teamLeaderId || intern.internshipDetails?.teamLeader;
    const daysRemaining = Math.ceil((new Date(intern.endDate) - now) / 86400000);
    return {
      id: intern._id,
      fullName: intern.fullName,
      domain: intern.domain || 'N/A',
      endDate: intern.endDate,
      daysRemaining,
      completionWindow: daysRemaining <= 7 ? 'next-7-days' : 'next-30-days',
      teamLeaderName: teamLeader?.fullName || 'Not assigned',
      hasRequestedCertificate: Boolean(request),
      certificateStatus: request?.status || 'Not Requested',
      requestNumber: request?.requestNumber || null
    };
  });

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * 9. Stuck Requests List
 */
export async function getStuckRequests(days = 3, filters = {}) {
  const cutoff = new Date(Date.now() - Number(days) * 86400000);

  const dateRange = filters.from || filters.to || filters.range
    ? resolveDateWindow(filters.from, filters.to, filters.range)
    : null;
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const requests = await CertificateRequest.find({
    status: { $in: ['pending', 'processing'] },
    ...(dateRange ? { requestedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate } } : {}),
    $or: [
      { status: 'pending', requestedAt: { $lte: cutoff } },
      { status: 'processing', forwardedAt: { $lte: cutoff } }
    ],
    userId: { $in: internIds }
  })
    .populate('userId', 'fullName domain')
    .populate('reviewedBy', 'fullName')
    .populate('certificateId', '_id')
    .sort({ requestedAt: 1 });

  const now = new Date();

  return requests.map((req) => {
    const daysPending = Number(((now - new Date(req.requestedAt)) / (1000 * 60 * 60 * 24)).toFixed(1));

    return {
      id: req._id,
      requestNumber: req.requestNumber,
      internName: req.userId?.fullName || 'Unknown Intern',
      domain: req.userId?.domain || 'N/A',
      certificateType: req.certificateType,
      requestedAt: req.requestedAt,
      status: req.status,
      daysPending: req.status === 'processing' && req.forwardedAt
        ? Number(((now - new Date(req.forwardedAt)) / 86400000).toFixed(1)) : daysPending,
      stage: req.status === 'pending' ? 'Team Leader' : 'Admin',
      reviewedBy: req.reviewedBy?.fullName || 'Pending TL Review',
      reviewLink: req.certificateId
          ? `/admin/certificates/${req.certificateId._id || req.certificateId}/review`
          : 'requests-queue'
    };
  });
}

export async function getFilteredRequests({ status, reviewStage, certificateType, page = 1, limit = 25 } = {}, filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const match = { userId: { $in: internIds }, requestedAt: { $gte: startDate, $lte: endDate } };
  if (status && ['pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) match.status = status;
  if (reviewStage === 'team-leader') Object.assign(match, { status: 'rejected', forwardedAt: null });
  if (reviewStage === 'admin') Object.assign(match, { status: 'rejected', forwardedAt: { $ne: null } });
  if (certificateType) match.certificateType = certificateType;
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
  const [requests, total] = await Promise.all([
    CertificateRequest.find(match).populate('userId', 'fullName domain').sort({ requestedAt: -1 })
      .skip((currentPage - 1) * pageSize).limit(pageSize).lean(),
    CertificateRequest.countDocuments(match)
  ]);
  return { requests: requests.map((request) => ({
    id: request._id, requestNumber: request.requestNumber, status: request.status,
    certificateType: request.certificateType, requestedAt: request.requestedAt,
    intern: request.userId ? { id: request.userId._id, fullName: request.userId.fullName, domain: request.userId.domain } : null
  })), page: currentPage, limit: pageSize, total, pages: Math.ceil(total / pageSize) };
}
