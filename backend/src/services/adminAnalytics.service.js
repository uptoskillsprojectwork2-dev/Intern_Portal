import mongoose from 'mongoose';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';

/* ═══════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Resolve a date window from filter parameters.
 * Returns { startDate, endDate, prevStartDate, prevEndDate }.
 */
export function resolveDateWindow(from, to, range = '6m') {
  const now = new Date();
  let startDate;
  let endDate = to ? new Date(to) : new Date(now);

  // Set end of day for endDate if only date string was provided
  if (to && typeof to === 'string' && to.length === 10) {
    endDate.setHours(23, 59, 59, 999);
  }

  if (from) {
    startDate = new Date(from);
    if (typeof from === 'string' && from.length === 10) {
      startDate.setHours(0, 0, 0, 0);
    }
  } else {
    startDate = new Date(endDate);
    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === '12m') {
      startDate.setMonth(startDate.getMonth() - 12);
    } else if (range === 'all') {
      startDate = new Date(0);
    } else {
      // Default 6m
      startDate.setMonth(startDate.getMonth() - 6);
    }
  }

  // Previous period window for percentage change comparisons
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return { startDate, endDate, prevStartDate, prevEndDate };
}

/**
 * Normalise the teamLeader / teamLeaderId filter parameter.
 */
function resolveTeamLeaderFilter(filters = {}) {
  return filters.teamLeaderId || filters.teamLeader || null;
}

/**
 * Build a scoped list of intern ObjectIds based on filters.
 * Does NOT include a date constraint on intern.createdAt by default.
 */
async function getScopedInternIds(filters = {}, { includeDates = false } = {}) {
  const dateRange = resolveDateWindow(filters.from, filters.to, filters.range);
  const query = { role: 'intern' };
  if (filters.domain) query.domain = filters.domain;
  const tl = resolveTeamLeaderFilter(filters);
  if (tl) query['internshipDetails.teamLeader'] = tl;
  if (includeDates) query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
  const interns = await User.find(query).select('_id');
  return interns.map(({ _id }) => _id);
}

/**
 * Build a $match clause for requests scoped to intern IDs and a date window.
 */
function scopedRequestMatch(filters, startDate, endDate, internIds) {
  return {
    requestedAt: { $gte: startDate, $lte: endDate },
    userId: { $in: internIds }
  };
}

/**
 * Calculate avg, median and 90th percentile from an array of numeric values.
 * Runs in Node (no MongoDB 7.0+ required).
 */
function calculatePercentiles(values) {
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

/* ═══════════════════════════════════════════════════════════════════
   1. OVERVIEW KPIs
   ═══════════════════════════════════════════════════════════════════ */

export async function getOverviewKPIs(filters = {}) {
  const { startDate, endDate, prevStartDate, prevEndDate } = resolveDateWindow(
    filters.from,
    filters.to,
    filters.range
  );

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const scopedLeaderIds = filters.domain || resolveTeamLeaderFilter(filters)
    ? await User.distinct('internshipDetails.teamLeader', { role: 'intern', _id: { $in: internIds }, 'internshipDetails.teamLeader': { $ne: null } })
    : null;

  const dateMatchCurrent = { requestedAt: { $gte: startDate, $lte: endDate } };
  const dateMatchPrev = { requestedAt: { $gte: prevStartDate, $lte: prevEndDate } };
  const requestScope = { userId: { $in: internIds } };

  // Current period counts
  const [
    totalInterns,
    activeInterns,
    upcomingInterns,
    completedInterns,
    cancelledInterns,
    totalTeamLeaders,
    pendingRequests,
    processingRequests,
    requestsThisMonth,
    certificatesIssuedThisMonth,
    totalApprovedOrCompleted,
    totalRejectedCount,
    prevRequestsCount,
    prevIssuedCertificates
  ] = await Promise.all([
    // Total interns (all, not just non-archived — historical count)
    User.countDocuments({ _id: { $in: internIds } }),
    // Active: ongoing and NOT archived
    User.countDocuments({ _id: { $in: internIds }, 'internshipDetails.status': 'ongoing', isArchived: { $ne: true } }),
    User.countDocuments({ _id: { $in: internIds }, 'internshipDetails.status': 'upcoming' }),
    User.countDocuments({ _id: { $in: internIds }, 'internshipDetails.status': 'completed' }),
    User.countDocuments({ _id: { $in: internIds }, 'internshipDetails.status': 'cancelled' }),
    User.countDocuments(scopedLeaderIds ? { _id: { $in: scopedLeaderIds }, role: 'teamleader' } : { role: 'teamleader' }),
    CertificateRequest.countDocuments({ status: 'pending', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'processing', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchCurrent, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      userId: { $in: internIds },
      $or: [
        { finalizedAt: { $gte: startDate, $lte: endDate } },
        { finalizedAt: null, issuedDate: { $gte: startDate, $lte: endDate } }
      ]
    }),
    // Approval rate: (approved + completed) / (approved + completed + rejected)
    CertificateRequest.countDocuments({ status: { $in: ['approved', 'completed'] }, ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'rejected', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchPrev, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      userId: { $in: internIds },
      $or: [
        { finalizedAt: { $gte: prevStartDate, $lte: prevEndDate } },
        { finalizedAt: null, issuedDate: { $gte: prevStartDate, $lte: prevEndDate } }
      ]
    })
  ]);

  const totalDecided = totalApprovedOrCompleted + totalRejectedCount;
  const approvalRate = totalDecided > 0 ? Number(((totalApprovedOrCompleted / totalDecided) * 100).toFixed(1)) : 0;
  const rejectionRate = totalDecided > 0 ? Number(((totalRejectedCount / totalDecided) * 100).toFixed(1)) : 0;

  // Turnaround calculation for current window
  const completedRequests = await CertificateRequest.find({
    status: 'completed',
    ...dateMatchCurrent,
    ...requestScope
  }).select('requestedAt updatedAt completedAt');

  const turnaroundHoursList = completedRequests
    .filter((r) => r.requestedAt && (r.completedAt || r.updatedAt))
    .map((r) => ((r.completedAt || r.updatedAt) - r.requestedAt) / (1000 * 60 * 60))
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  const turnaroundStats = calculatePercentiles(turnaroundHoursList);

  // Percentage change calculations
  const calcChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  return {
    kpis: {
      totalInterns,
      activeInterns,
      upcomingInterns,
      completedInterns,
      cancelledInterns,
      totalTeamLeaders,
      pendingRequests,
      forwardedRequests: processingRequests,
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

/* ═══════════════════════════════════════════════════════════════════
   2. REQUESTS TREND
   ═══════════════════════════════════════════════════════════════════ */

export async function getRequestsTrend(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const groupBy = filters.groupBy || 'month';

  let formatStr = '%Y-%m';
  if (groupBy === 'day') formatStr = '%Y-%m-%d';
  if (groupBy === 'week') formatStr = '%Y-W%V';

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

/* ═══════════════════════════════════════════════════════════════════
   3. CERTIFICATE TYPES
   ═══════════════════════════════════════════════════════════════════ */

export async function getCertificateTypes(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const counts = await CertificateRequest.aggregate([
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

/* ═══════════════════════════════════════════════════════════════════
   4. TURNAROUND TIME ANALYSIS
   Stages:
   - TL decision time: forwardedAt - requestedAt (forwarded requests)
                        OR reviewedAt - requestedAt (TL rejections, no forwardedAt)
   - Admin decision time: reviewedAt - forwardedAt (Admin approved/rejected)
   - Generation time: Certificate.issuedDate - request.reviewedAt
   - Total turnaround: Certificate.issuedDate - requestedAt
   ═══════════════════════════════════════════════════════════════════ */

export async function getTurnaroundStats(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });

  const [facet = { review: [], finalize: [], total: [] }] = await CertificateRequest.aggregate([
    { $match: { requestedAt: { $gte: startDate, $lte: endDate }, userId: { $in: internIds } } },
    { $set: { reviewDate: { $ifNull: ['$forwardedAt', '$reviewedAt'] }, completedDate: { $ifNull: ['$completedAt', '$updatedAt'] } } },
    {
      $facet: {
        review: [
          { $match: { reviewDate: { $ne: null } } },
          { $set: { seconds: { $dateDiff: { startDate: '$requestedAt', endDate: '$reviewDate', unit: 'second' } } } },
          { $match: { seconds: { $gte: 0 } } },
          { $project: { hours: { $divide: ['$seconds', 3600] } } }
        ],
        finalize: [
          { $match: { status: 'completed', reviewDate: { $ne: null }, completedDate: { $ne: null } } },
          { $set: { seconds: { $dateDiff: { startDate: '$reviewDate', endDate: '$completedDate', unit: 'second' } } } },
          { $match: { seconds: { $gte: 0 } } },
          { $project: { hours: { $divide: ['$seconds', 3600] } } }
        ],
        total: [
          { $match: { status: 'completed', completedDate: { $ne: null } } },
          { $set: { seconds: { $dateDiff: { startDate: '$requestedAt', endDate: '$completedDate', unit: 'second' } } } },
          { $match: { seconds: { $gte: 0 } } },
          { $project: { hours: { $divide: ['$seconds', 3600] } } }
        ]
      }
    }
  ]);

  const values = (rows = []) => rows.map(({ hours }) => hours).filter((h) => Number.isFinite(h) && h >= 0);

  const timeToTLReview = calculatePercentiles(values(facet.review));
  const timeToAdminFinalize = calculatePercentiles(values(facet.finalize));
  const totalTurnaround = calculatePercentiles(values(facet.total));

  return {
    timeToTLReview,
    timeToAdminFinalize,
    totalTurnaround,
    tlDecisionTime: timeToTLReview,
    adminDecisionTime: timeToAdminFinalize,
    generationTime: calculatePercentiles([])
  };
}

/* ═══════════════════════════════════════════════════════════════════
   5. TEAM LEADER PERFORMANCE TABLE
   ═══════════════════════════════════════════════════════════════════ */

export async function getTeamLeadersPerformance(filters = {}) {
  const scopedInternIds = await getScopedInternIds(filters, { includeDates: false });
  const assignedLeaderIds = await User.distinct('internshipDetails.teamLeader', {
    role: 'intern', _id: { $in: scopedInternIds }, 'internshipDetails.teamLeader': { $ne: null }
  });
  const leaderQuery = { role: 'teamleader', _id: { $in: assignedLeaderIds } };
  const tl = resolveTeamLeaderFilter(filters);
  if (tl) leaderQuery._id = tl;
  const teamLeaders = await User.find(leaderQuery).select('_id fullName email');
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const overdueLimit = Number(filters.overdueDays) || 3;

  const performanceList = await Promise.all(
    teamLeaders.map(async (tl) => {
      const internsAssigned = await User.countDocuments({
        role: 'intern',
        'internshipDetails.teamLeader': tl._id,
        _id: { $in: scopedInternIds }
      });

      // Requests from interns assigned to this TL
      const assignedInterns = await User.find({
        role: 'intern',
        'internshipDetails.teamLeader': tl._id,
        _id: { $in: scopedInternIds }
      }).select('_id');

      const assignedInternIds = assignedInterns.map((i) => i._id);

      // All requests for this TL's interns in the date window
      const tlRequests = await CertificateRequest.find({
        userId: { $in: assignedInternIds },
        requestedAt: { $gte: startDate, $lte: endDate }
      }).select('requestedAt reviewedAt forwardedAt forwardedBy status');

      const totalReceived = tlRequests.length;
      const forwarded = tlRequests.filter(r => r.forwardedAt).length;
      const rejected = tlRequests.filter(r => r.status === 'rejected' && !r.forwardedAt).length;
      const pending = tlRequests.filter(r => r.status === 'pending').length;

      // TL decision durations
      const reviewDurations = tlRequests
        .filter((r) => r.requestedAt && (r.forwardedAt || (r.status === 'rejected' && r.reviewedAt)))
        .map((r) => ((r.forwardedAt || r.reviewedAt) - r.requestedAt) / (1000 * 60 * 60))
        .filter((hours) => Number.isFinite(hours) && hours >= 0);

      const avgReviewTimeHours = calculatePercentiles(reviewDurations).avg;
      const decided = forwarded + rejected;
      const rejectionRate = decided > 0 ? Number(((rejected / decided) * 100).toFixed(1)) : 0;

      // Pending requests check for overdue
      const pendingRequests = tlRequests.filter(r => r.status === 'pending');
      const now = new Date();
      let maxPendingDays = 0;
      let hasOverdueRequests = false;

      pendingRequests.forEach((req) => {
        const days = (now - new Date(req.requestedAt)) / (1000 * 60 * 60 * 24);
        if (days > maxPendingDays) maxPendingDays = Number(days.toFixed(1));
        if (days >= overdueLimit) hasOverdueRequests = true;
      });

      return {
        id: tl._id,
        fullName: tl.fullName,
        email: tl.email,
        internsAssigned,
        requestsReceived: totalReceived,
        forwarded,
        rejected,
        pendingReviews: pending,
        requestsReviewed: decided,
        avgReviewTimeHours,
        rejectionRate,
        hasOverdueRequests,
        maxPendingDays
      };
    })
  );

  return performanceList.sort((a, b) => b.pendingReviews - a.pendingReviews);
}

/* ═══════════════════════════════════════════════════════════════════
   6. DOMAINS DISTRIBUTION
   Domain comes from User.domain. No Department collection needed.
   ═══════════════════════════════════════════════════════════════════ */

export async function getDomainsDistribution(filters = {}) {
  const internIds = await getScopedInternIds(filters);

  const userDomainCounts = await User.aggregate([
    { $match: { role: 'intern', _id: { $in: internIds } } },
    {
      $group: {
        _id: '$domain',
        totalInterns: { $sum: 1 },
        activeInterns: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$internshipDetails.status', 'ongoing'] },
                { $ne: ['$isArchived', true] }
              ]},
              1,
              0
            ]
          }
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

/* ═══════════════════════════════════════════════════════════════════
   7. PIPELINE / BOTTLENECK STAGES
   Maps to real statuses:
   - With Team Leader: status = pending
   - With Admin: status = processing
   - Awaiting finalization: status = approved with a draft certificate
   - Failed generation: status = approved, >1 hour old, no cert or no draft
   - Completed: status = completed
   - Rejected by TL: status = rejected AND no forwardedAt
   - Rejected by Admin: status = rejected AND forwardedAt exists
   ═══════════════════════════════════════════════════════════════════ */

export async function getPipelineStages(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  // Use $facet to split rejected into TL vs Admin in a single pipeline
  const [facet = {}] = await CertificateRequest.aggregate([
    { $match: matchQuery },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        rejectedByTL: [
          { $match: { status: 'rejected', $or: [{ forwardedAt: null }, { forwardedAt: { $exists: false } }] } },
          { $count: 'count' }
        ],
        rejectedByAdmin: [
          { $match: { status: 'rejected', forwardedAt: { $ne: null, $exists: true } } },
          { $count: 'count' }
        ],
        awaitingFinalization: [
          { $match: { status: 'approved', certificateId: { $ne: null } } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const statusMap = { pending: 0, approved: 0, processing: 0, completed: 0, rejected: 0, cancelled: 0 };
  (facet.byStatus || []).forEach((s) => {
    if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
  });

  const rejByTL = facet.rejectedByTL?.[0]?.count || 0;
  const rejByAdmin = facet.rejectedByAdmin?.[0]?.count || 0;
  const awaitingFinalization = facet.awaitingFinalization?.[0]?.count || 0;

  // Failed generations: approved > 1 hour, no certificate or only draft
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const failedGenerations = await CertificateRequest.countDocuments({
    status: 'approved',
    $or: [{ certificateId: null }, { certificateId: { $exists: false } }],
    ...matchQuery,
    requestedAt: { $gte: startDate, $lte: endDate },
    updatedAt: { $lt: oneHourAgo }
  });

  const pipeline = [
    { stage: 'With Team Leader', status: 'pending', count: statusMap.pending },
    { stage: 'With Admin', status: 'processing', count: statusMap.processing },
    { stage: 'Awaiting Finalization', status: 'approved', count: awaitingFinalization },
    { stage: 'Completed', status: 'completed', count: statusMap.completed },
    { stage: 'Rejected by TL', status: 'rejected-tl', count: rejByTL },
    { stage: 'Rejected by Admin', status: 'rejected-admin', count: rejByAdmin },
    { stage: 'Cancelled', status: 'cancelled', count: statusMap.cancelled }
  ];

  return { pipeline, failedGenerations };
}

/* ═══════════════════════════════════════════════════════════════════
   8. UPCOMING COMPLETIONS
   ═══════════════════════════════════════════════════════════════════ */

export async function getUpcomingCompletions(days = 30, filters = {}) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  let futureDate = new Date(startDate);
  if (filters.range === 'custom' && filters.from && filters.to) {
    const range = resolveDateWindow(filters.from, filters.to, filters.range);
    if (range.startDate > startDate) startDate.setTime(range.startDate.getTime());
    futureDate = range.endDate;
  } else if (filters.range && filters.range !== 'all') {
    const months = filters.range === '6m' ? 6 : filters.range === '12m' ? 12 : 0;
    const rangeDays = filters.range === '7d' ? 7 : filters.range === '30d' ? 30 : null;
    if (months) futureDate.setMonth(futureDate.getMonth() + months);
    else if (rangeDays) futureDate.setDate(futureDate.getDate() + rangeDays);
    else futureDate.setDate(futureDate.getDate() + Number(days));
  } else {
    futureDate.setDate(futureDate.getDate() + Number(days));
  }

  const internFilter = {
    role: 'intern',
    'internshipDetails.status': { $nin: ['completed', 'cancelled'] },
    isArchived: { $ne: true },
    endDate: { $gte: startDate, $lte: futureDate }
  };
  if (filters.domain) internFilter.domain = filters.domain;
  const tl = resolveTeamLeaderFilter(filters);
  if (tl) internFilter['internshipDetails.teamLeader'] = tl;
  const interns = await User.find(internFilter).populate('internshipDetails.teamLeader', 'fullName email');

  const results = await Promise.all(
    interns.map(async (intern) => {
      const request = await CertificateRequest.findOne({ userId: intern._id }).select('status requestNumber requestedAt').sort({ requestedAt: -1 });

      return {
        id: intern._id,
        fullName: intern.fullName,
        email: intern.email,
        domain: intern.domain || 'N/A',
        endDate: intern.endDate,
        daysRemaining: Math.ceil((new Date(intern.endDate) - now) / (1000 * 60 * 60 * 24)),
        teamLeaderName: intern.internshipDetails?.teamLeader?.fullName || 'Not assigned',
        hasRequestedCertificate: !!request,
        certificateStatus: request ? request.status : 'Not Requested',
        requestNumber: request ? request.requestNumber : null
      };
    })
  );

  // Count those with no completion certificate request
  const withoutRequest = results.filter(r => !r.hasRequestedCertificate).length;

  return {
    interns: results.sort((a, b) => a.daysRemaining - b.daysRemaining),
    summary: {
      total: results.length,
      within7Days: results.filter(r => r.daysRemaining <= 7).length,
      within30Days: results.filter(r => r.daysRemaining <= 30).length,
      withoutCertificateRequest: withoutRequest
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   9. STUCK / OVERDUE REQUESTS
   Overdue: pending with TL for > N days,
            OR processing with Admin for > N days.
   ═══════════════════════════════════════════════════════════════════ */

export async function getStuckRequests(days = 3, filters = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const dateRange = filters.from || filters.to || filters.range
    ? resolveDateWindow(filters.from, filters.to, filters.range)
    : null;
  const internIds = await getScopedInternIds(filters, { includeDates: false });

  // Stuck = pending with TL OR processing with Admin, older than cutoff
  const requests = await CertificateRequest.find({
    status: { $in: ['pending', 'processing'] },
    requestedAt: {
      ...(dateRange ? { $gte: dateRange.startDate, $lte: new Date(Math.min(cutoff.getTime(), dateRange.endDate.getTime())) } : { $lte: cutoff })
    },
    userId: { $in: internIds }
  })
    .populate('userId', 'fullName email domain')
    .populate('reviewedBy', 'fullName email')
    .populate('forwardedBy', 'fullName email')
    .sort({ requestedAt: 1 });

  const now = new Date();

  return requests.map((req) => {
    const daysPending = Number(((now - new Date(req.requestedAt)) / (1000 * 60 * 60 * 24)).toFixed(1));
    const stuckWith = req.status === 'pending' ? 'Team Leader' : 'Admin';

    return {
      id: req._id,
      requestNumber: req.requestNumber,
      internName: req.userId?.fullName || 'Unknown Intern',
      internEmail: req.userId?.email || 'N/A',
      domain: req.userId?.domain || 'N/A',
      certificateType: req.certificateType,
      requestedAt: req.requestedAt,
      status: req.status,
      stuckWith,
      daysPending,
      reviewedBy: req.reviewedBy?.fullName || null,
      forwardedBy: req.forwardedBy?.fullName || null,
      reviewLink: req.status === 'processing'
        ? `/admin/certificates/${req._id}/review`
        : null
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════
   10. FILTERED REQUEST LIST (for chart segment clicks)
   GET /api/admin/requests?status=&page=&limit=
   ═══════════════════════════════════════════════════════════════════ */

export async function getFilteredRequests(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });

  const query = {
    requestedAt: { $gte: startDate, $lte: endDate },
    userId: { $in: internIds }
  };

  if (filters.status) query.status = filters.status;

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [requests, totalCount] = await Promise.all([
    CertificateRequest.find(query)
      .populate('userId', 'fullName email domain')
      .populate('forwardedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CertificateRequest.countDocuments(query)
  ]);

  return {
    requests: requests.map(r => ({
      id: r._id,
      requestNumber: r.requestNumber,
      internName: r.userId?.fullName || 'Unknown',
      internEmail: r.userId?.email || 'N/A',
      domain: r.userId?.domain || 'N/A',
      certificateType: r.certificateType,
      status: r.status,
      requestedAt: r.requestedAt,
      forwardedAt: r.forwardedAt,
      reviewedAt: r.reviewedAt,
      completedAt: r.completedAt,
      forwardedBy: r.forwardedBy?.fullName || null,
      reviewedBy: r.reviewedBy?.fullName || null
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}
