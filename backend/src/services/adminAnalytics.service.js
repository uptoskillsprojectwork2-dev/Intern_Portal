import mongoose from 'mongoose';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import Department from '../models/Department.js';

// Helper to resolve date range windows
export function resolveDateWindow(from, to, range = '6m') {
  const now = new Date();
  let startDate;
  let endDate = to ? new Date(to) : new Date(now);

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

  // Previous period window for comparison
  const durationMs = Math.max(endDate.getTime() - startDate.getTime(), 24 * 3600 * 1000);
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return { startDate, endDate, prevStartDate, prevEndDate };
}

// Scoped intern IDs based on domain and teamLeaderId filters
export async function getScopedInternIds(filters = {}, { includeDates = false } = {}) {
  const query = { role: 'intern' };
  if (filters.domain) query.domain = filters.domain;

  const tlId = filters.teamLeaderId || filters.teamLeader;
  if (tlId) {
    query['internshipDetails.teamLeader'] = tlId;
  }

  if (includeDates) {
    const dateRange = resolveDateWindow(filters.from, filters.to, filters.range);
    query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
  }

  const interns = await User.find(query).select('_id');
  return interns.map(({ _id }) => _id);
}

function scopedRequestMatch(filters, startDate, endDate, internIds) {
  const match = {
    requestedAt: { $gte: startDate, $lte: endDate }
  };
  if (internIds && internIds.length > 0) {
    match.userId = { $in: internIds };
  }
  return match;
}

// Percentile helper function
export function calculatePercentiles(values) {
  if (!values || values.length === 0) {
    return { avg: 0, median: 0, p90: 0 };
  }
  const cleanValues = values
    .filter((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0);

  if (cleanValues.length === 0) {
    return { avg: 0, median: 0, p90: 0 };
  }

  const sorted = [...cleanValues].sort((a, b) => a - b);
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

/**
 * 1. Overview KPIs
 */
export async function getOverviewKPIs(filters = {}) {
  const { startDate, endDate, prevStartDate, prevEndDate } = resolveDateWindow(
    filters.from,
    filters.to,
    filters.range
  );

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const tlId = filters.teamLeaderId || filters.teamLeader;

  const baseInternQuery = {
    role: 'intern',
    ...(internIds.length ? { _id: { $in: internIds } } : {})
  };

  if (filters.domain) baseInternQuery.domain = filters.domain;
  if (tlId) {
    baseInternQuery['internshipDetails.teamLeader'] = tlId;
  }

  const requestScope = internIds.length ? { userId: { $in: internIds } } : {};
  const dateMatchCurrent = { requestedAt: { $gte: startDate, $lte: endDate } };
  const dateMatchPrev = { requestedAt: { $gte: prevStartDate, $lte: prevEndDate } };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    totalInterns,
    activeInterns,
    upcomingInterns,
    completedInterns,
    cancelledInterns,
    totalTeamLeaders,
    pendingRequests,
    forwardedRequests,
    requestsThisMonth,
    certificatesIssuedThisMonth,
    totalApprovedCount,
    totalCompletedCount,
    totalRejectedCount,
    prevRequestsCount,
    prevIssuedCertificates
  ] = await Promise.all([
    User.countDocuments(baseInternQuery),
    User.countDocuments({
      ...baseInternQuery,
      'internshipDetails.status': 'ongoing',
      isArchived: { $ne: true }
    }),
    User.countDocuments({ ...baseInternQuery, 'internshipDetails.status': 'upcoming' }),
    User.countDocuments({ ...baseInternQuery, 'internshipDetails.status': 'completed' }),
    User.countDocuments({ ...baseInternQuery, 'internshipDetails.status': 'cancelled' }),
    User.countDocuments(
      tlId && mongoose.Types.ObjectId.isValid(tlId)
        ? { role: 'teamleader', _id: new mongoose.Types.ObjectId(tlId) }
        : { role: 'teamleader' }
    ),
    CertificateRequest.countDocuments({ status: 'pending', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'processing', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchCurrent, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      ...(internIds.length ? { userId: { $in: internIds } } : {}),
      $or: [
        { issuedAt: { $gte: startDate, $lte: endDate } },
        { finalizedAt: { $gte: startDate, $lte: endDate } },
        { issuedDate: { $gte: startDate, $lte: endDate } }
      ]
    }),
    CertificateRequest.countDocuments({ status: 'approved', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'completed', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'rejected', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchPrev, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      ...(internIds.length ? { userId: { $in: internIds } } : {}),
      $or: [
        { issuedAt: { $gte: prevStartDate, $lte: prevEndDate } },
        { finalizedAt: { $gte: prevStartDate, $lte: prevEndDate } },
        { issuedDate: { $gte: prevStartDate, $lte: prevEndDate } }
      ]
    })
  ]);

  const totalDecided = totalApprovedCount + totalCompletedCount + totalRejectedCount;
  const approvalRate = totalDecided > 0
    ? Number((((totalApprovedCount + totalCompletedCount) / totalDecided) * 100).toFixed(1))
    : 0;
  const rejectionRate = totalDecided > 0
    ? Number(((totalRejectedCount / totalDecided) * 100).toFixed(1))
    : 0;

  // Turnaround calculation for completed requests
  const findQuery = CertificateRequest.find({
    status: 'completed',
    ...dateMatchCurrent,
    ...requestScope
  });
  const completedRequests = typeof findQuery.select === 'function'
    ? await findQuery.select('requestedAt completedAt updatedAt')
    : await findQuery;

  const turnaroundHoursList = (Array.isArray(completedRequests) ? completedRequests : [])
    .map((r) => {
      const end = r.completedAt || r.updatedAt;
      if (!end || !r.requestedAt) return null;
      return (new Date(end).getTime() - new Date(r.requestedAt).getTime()) / (1000 * 60 * 60);
    })
    .filter((h) => typeof h === 'number' && Number.isFinite(h) && h >= 0);

  const turnaroundStats = calculatePercentiles(turnaroundHoursList);

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
      forwardedRequests,
      approvedRequests: totalApprovedCount,
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
 * 2. Requests Trend Over Time
 */
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

  const periodsMap = {};
  const statuses = ['pending', 'processing', 'approved', 'completed', 'rejected', 'cancelled'];

  (Array.isArray(trendData) ? trendData : []).forEach((item) => {
    const p = item._id?.period;
    const s = item._id?.status;
    if (!p) return;
    if (!periodsMap[p]) {
      periodsMap[p] = {
        period: p,
        pending: 0,
        processing: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        total: 0
      };
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

  const rawCounts = Array.isArray(counts) ? counts : [];
  const total = rawCounts.reduce((sum, item) => sum + item.count, 0);

  const breakdown = rawCounts.map((item) => ({
    certificateType: item._id || 'Standard',
    count: item.count,
    percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0
  }));

  const labels = breakdown.map((b) => b.certificateType);
  const series = breakdown.map((b) => b.count);

  return { total, breakdown, labels, series };
}

/**
 * 4. Turnaround Time Analysis (Average, Median, P90)
 * Uses Mongo aggregation pipeline ($match, $set, $facet, $dateDiff)
 */
export async function getTurnaroundStats(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });

  const [facet = { review: [], finalize: [], total: [] }] = await CertificateRequest.aggregate([
    {
      $match: {
        requestedAt: { $gte: startDate, $lte: endDate },
        ...(internIds.length ? { userId: { $in: internIds } } : {})
      }
    },
    {
      $set: {
        reviewDate: { $ifNull: ['$forwardedAt', '$reviewedAt'] },
        completedDate: { $ifNull: ['$completedAt', '$updatedAt'] }
      }
    },
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

  const values = (rows) => (Array.isArray(rows) ? rows.map(({ hours }) => hours) : []);
  const tlStats = calculatePercentiles(values(facet.review));
  const adminStats = calculatePercentiles(values(facet.finalize));
  const totalStats = calculatePercentiles(values(facet.total));

  return {
    timeToTLReview: tlStats,
    timeToAdminFinalize: adminStats,
    totalTurnaround: totalStats,
    tlDecisionTime: tlStats,
    adminDecisionTime: adminStats,
    generationTime: adminStats,
    stages: [
      { key: 'tlDecisionTime', name: 'Team Leader Decision', ...tlStats },
      { key: 'adminDecisionTime', name: 'Admin Decision', ...adminStats },
      { key: 'generationTime', name: 'Certificate Generation', ...adminStats },
      { key: 'totalTurnaround', name: 'Total Turnaround', ...totalStats }
    ]
  };
}

/**
 * 5. Team Leader Performance Table
 */
export async function getTeamLeadersPerformance(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const tlFilter = { role: 'teamleader' };
  const filterTlId = filters.teamLeaderId || filters.teamLeader;

  if (filterTlId && mongoose.Types.ObjectId.isValid(filterTlId)) {
    tlFilter._id = new mongoose.Types.ObjectId(filterTlId);
  }

  let leaderQuery = User.find(tlFilter).select('_id fullName email');
  if (typeof leaderQuery.sort === 'function') {
    leaderQuery = leaderQuery.sort({ fullName: 1 });
  }
  const teamLeaders = (await leaderQuery) || [];
  const now = new Date();
  const overdueLimitDays = 3;

  const performanceList = await Promise.all(
    teamLeaders.map(async (tl) => {
      const internFilter = {
        role: 'intern',
        $or: [
          { 'internshipDetails.teamLeader': tl._id },
          { 'internshipDetails.teamLeaderId': tl._id }
        ]
      };
      if (filters.domain) internFilter.domain = filters.domain;

      let internQuery = User.find(internFilter).select('_id');
      const assignedInterns = (await internQuery) || [];
      const assignedInternIds = assignedInterns.map((i) => i._id);
      const internsAssigned = assignedInternIds.length;

      let reqQuery = CertificateRequest.find({
        userId: { $in: assignedInternIds },
        requestedAt: { $gte: startDate, $lte: endDate }
      }).select('requestedAt forwardedAt reviewedAt status');
      const allRequests = (await reqQuery) || [];
      const requestsReceived = allRequests.length;

      const forwardedCount = allRequests.filter((r) => r.forwardedAt).length;
      const rejectedCount = allRequests.filter(
        (r) => r.status === 'rejected' && !r.forwardedAt
      ).length;

      let pendingQuery = CertificateRequest.find({
        userId: { $in: assignedInternIds },
        status: 'pending'
      }).select('requestedAt');
      const pendingRequests = (await pendingQuery) || [];
      const pendingCount = pendingRequests.length;

      const decisionDurations = allRequests
        .map((r) => {
          const reqTime = r.requestedAt ? new Date(r.requestedAt).getTime() : null;
          if (r.forwardedAt && reqTime) {
            return (new Date(r.forwardedAt).getTime() - reqTime) / (1000 * 60 * 60);
          }
          if (r.status === 'rejected' && !r.forwardedAt && r.reviewedAt && reqTime) {
            return (new Date(r.reviewedAt).getTime() - reqTime) / (1000 * 60 * 60);
          }
          return null;
        })
        .filter((h) => typeof h === 'number' && Number.isFinite(h) && h >= 0);

      const avgReviewTimeHours = calculatePercentiles(decisionDurations).avg;
      const decidedByTL = forwardedCount + rejectedCount;
      const rejectionRate = decidedByTL > 0
        ? Number(((rejectedCount / decidedByTL) * 100).toFixed(1))
        : 0;

      let maxPendingDays = 0;
      let hasOverdueRequests = false;

      pendingRequests.forEach((req) => {
        if (!req.requestedAt) return;
        const days = (now.getTime() - new Date(req.requestedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (days > maxPendingDays) maxPendingDays = Number(days.toFixed(1));
        if (days >= overdueLimitDays) hasOverdueRequests = true;
      });

      return {
        id: tl._id,
        fullName: tl.fullName,
        email: tl.email,
        internsAssigned,
        requestsReceived,
        forwarded: forwardedCount,
        rejected: rejectedCount,
        requestsReviewed: decidedByTL,
        pendingReviews: pendingCount,
        avgReviewTimeHours,
        rejectionRate,
        hasOverdueRequests,
        maxPendingDays
      };
    })
  );

  return performanceList.sort((a, b) => b.pendingReviews - a.pendingReviews);
}

/**
 * 6. Domains Distribution
 */
export async function getDomainsDistribution(filters = {}) {
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  let departments = [];
  try {
    departments = await Department.find({ isActive: true }).select('departmentCode departmentName');
  } catch {
    departments = [];
  }

  const matchQuery = {
    role: 'intern',
    ...(internIds.length ? { _id: { $in: internIds } } : {})
  };

  const userDomainCounts = await User.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $ifNull: ['$domain', 'Unassigned'] },
        totalInterns: { $sum: 1 },
        activeInterns: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$internshipDetails.status', 'ongoing'] },
                  { $ne: ['$isArchived', true] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { totalInterns: -1 } }
  ]);

  const certMatch = {
    status: { $in: ['issued', 'finalized'] },
    ...(internIds.length ? { userId: { $in: internIds } } : {}),
    $or: [
      { issuedAt: { $gte: startDate, $lte: endDate } },
      { finalizedAt: { $gte: startDate, $lte: endDate } },
      { issuedDate: { $gte: startDate, $lte: endDate } }
    ]
  };

  const certDomainCounts = await Certificate.aggregate([
    { $match: certMatch },
    {
      $group: {
        _id: { $ifNull: ['$domain', 'Unassigned'] },
        certificatesCount: { $sum: 1 }
      }
    }
  ]);

  const certMap = {};
  (Array.isArray(certDomainCounts) ? certDomainCounts : []).forEach((c) => {
    if (c._id) certMap[c._id] = c.certificatesCount;
  });

  const domains = (Array.isArray(userDomainCounts) ? userDomainCounts : []).map((d) => {
    const domainName = d._id || 'Unassigned';
    return {
      domain: domainName,
      totalInterns: d.totalInterns,
      activeInterns: d.activeInterns,
      certificatesCount: certMap[domainName] || 0
    };
  });

  const labels = domains.map((d) => d.domain);
  const series = [
    { name: 'Total Interns', data: domains.map((d) => d.totalInterns) },
    { name: 'Active Interns', data: domains.map((d) => d.activeInterns) },
    { name: 'Certificates Issued', data: domains.map((d) => d.certificatesCount) }
  ];

  return { departments: departments || [], domains, labels, series };
}

/**
 * 7. Pipeline / Bottleneck Stages
 */
export async function getPipelineStages(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const reqQuery = CertificateRequest.find(matchQuery)
    .populate('certificateId', '_id status')
    .select('status requestedAt forwardedAt certificateId updatedAt');
  const requests = (await reqQuery) || [];

  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  let withTeamLeader = 0;
  let withAdmin = 0;
  let awaitingFinalization = 0;
  let failedGeneration = 0;
  let completed = 0;
  let rejectedByTL = 0;
  let rejectedByAdmin = 0;
  let cancelled = 0;

  requests.forEach((req) => {
    switch (req.status) {
      case 'pending':
        withTeamLeader += 1;
        break;
      case 'processing':
        withAdmin += 1;
        break;
      case 'completed':
        completed += 1;
        break;
      case 'rejected':
        if (req.forwardedAt) {
          rejectedByAdmin += 1;
        } else {
          rejectedByTL += 1;
        }
        break;
      case 'cancelled':
        cancelled += 1;
        break;
      case 'approved': {
        const hasDraft = req.certificateId && req.certificateId.status === 'draft';
        const isOlderThan1h = req.requestedAt && (now - new Date(req.requestedAt).getTime() > oneHourMs);

        if (hasDraft) {
          awaitingFinalization += 1;
        } else if (!req.certificateId || isOlderThan1h) {
          failedGeneration += 1;
        } else {
          awaitingFinalization += 1;
        }
        break;
      }
      default:
        break;
    }
  });

  const pipeline = [
    { stage: 'With Team Leader', status: 'pending', count: withTeamLeader },
    { stage: 'With Admin', status: 'processing', count: withAdmin },
    { stage: 'Awaiting finalization', status: 'approved', count: awaitingFinalization },
    { stage: 'Failed generation', status: 'failed_generation', count: failedGeneration },
    { stage: 'Completed', status: 'completed', count: completed },
    { stage: 'Rejected by TL', status: 'rejected_tl', count: rejectedByTL },
    { stage: 'Rejected by Admin', status: 'rejected_admin', count: rejectedByAdmin }
  ];

  return {
    pipeline,
    failedGenerations: failedGeneration,
    breakdown: {
      withTeamLeader,
      withAdmin,
      awaitingFinalization,
      failedGeneration,
      completed,
      rejectedByTL,
      rejectedByAdmin,
      cancelled
    }
  };
}

/**
 * 8. Upcoming Completions
 */
export async function getUpcomingCompletions(days = 30, filters = {}) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  const futureDate = new Date(startDate);
  futureDate.setDate(futureDate.getDate() + Number(days));
  futureDate.setHours(23, 59, 59, 999);

  const internFilter = {
    role: 'intern',
    'internshipDetails.status': 'ongoing',
    isArchived: { $ne: true },
    endDate: { $gte: startDate, $lte: futureDate }
  };

  if (filters.domain) internFilter.domain = filters.domain;
  const tlId = filters.teamLeaderId || filters.teamLeader;
  if (tlId) {
    internFilter['internshipDetails.teamLeader'] = tlId;
  }

  const interns = (await User.find(internFilter).populate('internshipDetails.teamLeader', 'fullName email').sort({ endDate: 1 })) || [];

  const results = await Promise.all(
    interns.map(async (intern) => {
      const completionReq = await CertificateRequest.findOne({
        userId: intern._id,
        certificateType: {
          $in: [
            'completion_certificate',
            'internship_completion_certificate',
            'completion'
          ]
        }
      }).select('status requestNumber requestedAt');

      const latestReq = completionReq || await CertificateRequest.findOne({
        userId: intern._id
      }).select('status requestNumber requestedAt');

      const daysRemaining = Math.ceil(
        (new Date(intern.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: intern._id,
        fullName: intern.fullName,
        email: intern.email,
        domain: intern.domain || 'N/A',
        endDate: intern.endDate,
        daysRemaining: Math.max(0, daysRemaining),
        teamLeaderName: intern.internshipDetails?.teamLeader?.fullName || 'Not assigned',
        hasRequestedCertificate: !!latestReq,
        hasCompletionRequest: !!completionReq,
        certificateStatus: completionReq ? completionReq.status : (latestReq ? latestReq.status : 'Not Requested'),
        requestNumber: completionReq?.requestNumber || latestReq?.requestNumber || null
      };
    })
  );

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * 9. Stuck Requests List
 */
export async function getStuckRequests(days = 3, filters = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const internIds = await getScopedInternIds(filters, { includeDates: false });

  const query = {
    status: { $in: ['pending', 'processing'] },
    requestedAt: { $lte: cutoff },
    ...(internIds.length ? { userId: { $in: internIds } } : {})
  };

  const requests = (await CertificateRequest.find(query)
    .populate('userId', 'fullName email domain internshipDetails')
    .populate('reviewedBy', 'fullName email')
    .populate('forwardedBy', 'fullName email')
    .populate('certificateId', '_id')
    .sort({ requestedAt: 1 })) || [];

  const now = new Date();

  return requests.map((req) => {
    const daysPending = Number(
      ((now.getTime() - new Date(req.requestedAt).getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)
    );

    const stage = req.status === 'pending' ? 'With Team Leader' : 'With Admin';

    return {
      id: req._id,
      requestNumber: req.requestNumber,
      internName: req.userId?.fullName || 'Unknown Intern',
      internEmail: req.userId?.email || 'N/A',
      domain: req.userId?.domain || 'N/A',
      certificateType: req.certificateType,
      requestedAt: req.requestedAt,
      status: req.status,
      stage,
      daysPending,
      reviewedBy: req.status === 'processing'
        ? (req.forwardedBy?.fullName ? `Forwarded by ${req.forwardedBy.fullName}` : 'With Admin')
        : 'Pending TL Review',
      reviewLink: req.status === 'processing'
        ? '/admin/forwarded-requests'
        : (req.certificateId
            ? `/admin/certificates/${req.certificateId._id || req.certificateId}/review`
            : null)
    };
  });
}
