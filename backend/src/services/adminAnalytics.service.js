import Redis from 'ioredis';
import * as XLSX from 'xlsx';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import AuditLog from '../models/AuditLog.js';

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];
const PIPELINE_LABELS = ['Pending', 'TL/Admin Approved', 'Processing', 'Completed', 'Rejected', 'Cancelled'];
const RANGE_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '6m': 180,
};

const getRedisClient = () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    return new Redis(url);
  } catch (error) {
    console.warn('Redis unavailable for analytics cache:', error.message);
    return null;
  }
};

let redisInstance = null;

export const getAnalyticsRedis = () => {
  if (!redisInstance && process.env.REDIS_URL) {
    redisInstance = getRedisClient();
    if (redisInstance) {
      redisInstance.on('error', () => {
        redisInstance = null;
      });
    }
  }

  return redisInstance;
};

export const clearAnalyticsCache = async () => {
  const redis = getAnalyticsRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys('admin:analytics:*');
    if (keys.length) await redis.del(...keys);
  } catch (error) {
    console.warn('Failed to clear analytics cache:', error.message);
  }
};

export const withAnalyticsCache = async (cacheKey, ttlSeconds, handler) => {
  const redis = getAnalyticsRedis();
  if (!redis) return handler();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const value = await handler();
    await redis.set(cacheKey, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  } catch (error) {
    console.warn('Analytics cache failed, falling back to live data:', error.message);
    return handler();
  }
};

export const toSafeInt = (value) => Number.isFinite(value) ? Number(value) : 0;

export const resolveRange = (query = {}) => {
  const now = new Date();
  const normalizedRange = String(query.range || '30d').trim().toLowerCase();

  if (query.from || query.to) {
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    if (query.from && Number.isNaN(fromDate.getTime())) {
      throw new Error('Invalid from date');
    }
    if (query.to && Number.isNaN(toDate.getTime())) {
      throw new Error('Invalid to date');
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new Error('from date must be before or equal to to date');
    }

    return {
      from: fromDate || new Date(new Date(now).setDate(now.getDate() - 30)),
      to: toDate || new Date(),
      range: normalizedRange,
    };
  }

  if (!(normalizedRange in RANGE_TO_DAYS)) {
    throw new Error('Invalid range. Use 7d, 30d or 6m.');
  }

  const days = RANGE_TO_DAYS[normalizedRange];
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - days);

  return {
    from: fromDate,
    to: new Date(),
    range: normalizedRange,
  };
};

export const buildRequestDateMatch = (from, to) => ({
  requestedAt: {
    $gte: from,
    $lte: to,
  },
});

export const buildUserDateMatch = (from, to) => ({
  createdAt: {
    $gte: from,
    $lte: to,
  },
});

export const applyDomainAndTeamLeaderFilters = (match = {}, { domain, teamLeader } = {}) => {
  const nextMatch = { ...match };

  if (domain) {
    nextMatch.domain = domain;
  }

  if (teamLeader) {
    const trimmed = String(teamLeader).trim();
    if (trimmed) {
      nextMatch.$or = [
        { 'internshipDetails.teamleaderEmail': trimmed.toLowerCase() },
        { email: trimmed.toLowerCase() },
        { _id: trimmed },
      ];
    }
  }

  return nextMatch;
};

export const buildRequestLookupFilters = ({ domain, teamLeader } = {}) => {
  const match = {};

  if (domain) {
    match['user.domain'] = domain;
  }

  if (teamLeader) {
    const trimmed = String(teamLeader).trim().toLowerCase();
    match.$or = [
      { 'user.email': trimmed },
      { 'user.internshipDetails.teamleaderEmail': trimmed },
    ];
  }

  return match;
};

export const getMedian = (values) => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
};

export const getP90 = (values) => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((0.9 * sorted.length)) - 1);
  return sorted[index];
};

export const getTrendSeries = (rows, labels) => {
  const seriesMap = {
    pending: [],
    approved: [],
    rejected: [],
    processing: [],
    completed: [],
    cancelled: [],
  };

  for (const label of labels) {
    const bucket = rows.find((row) => row.label === label);
    if (!bucket) {
      Object.keys(seriesMap).forEach((key) => seriesMap[key].push(0));
      continue;
    }

    Object.keys(seriesMap).forEach((key) => {
      const value = bucket[key] ?? 0;
      seriesMap[key].push(toSafeInt(value));
    });
  }

  return [{ name: 'pending', data: seriesMap.pending }, { name: 'approved', data: seriesMap.approved }, { name: 'rejected', data: seriesMap.rejected }, { name: 'processing', data: seriesMap.processing }, { name: 'completed', data: seriesMap.completed }, { name: 'cancelled', data: seriesMap.cancelled }];
};

export const calculateTurnaroundValues = (values) => ({
  average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
  median: values.length ? getMedian(values) : null,
  p90: values.length ? getP90(values) : null,
});

export const getOverviewAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:overview:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const userFilters = applyDomainAndTeamLeaderFilters({ createdAt: { $gte: from, $lte: to } }, { domain, teamLeader });
    const requestFilters = buildRequestLookupFilters({ domain, teamLeader });

    const [internSummary, teamLeaderSummary, requestSummary, approvalSummary, turnaroundSummary] = await Promise.all([
      User.aggregate([
        { $match: { role: 'intern', ...userFilters } },
        { $group: {
            _id: null,
            totalInterns: { $sum: 1 },
            activeInterns: { $sum: { $cond: [{ $eq: ['$internshipDetails.status', 'ongoing'] }, 1, 0] } },
            upcomingInterns: { $sum: { $cond: [{ $eq: ['$internshipDetails.status', 'upcoming'] }, 1, 0] } },
            completedInterns: { $sum: { $cond: [{ $eq: ['$internshipDetails.status', 'completed'] }, 1, 0] } },
            cancelledInterns: { $sum: { $cond: [{ $eq: ['$internshipDetails.status', 'cancelled'] }, 1, 0] } },
          } },
      ]),
      User.aggregate([
        { $match: { role: 'teamleader', createdAt: { $gte: from, $lte: to } } },
        { $count: 'totalTeamLeaders' },
      ]),
      CertificateRequest.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $match: { ...buildRequestDateMatch(from, to), ...requestFilters } },
        { $group: {
            _id: null,
            pendingRequests: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            requestsThisMonth: { $sum: { $cond: [{ $and: [{ $gte: ['$requestedAt', new Date(new Date(from).getFullYear(), new Date(from).getMonth(), 1)] }, { $lte: ['$requestedAt', to] }] }, 1, 0] } },
            decidedRequests: { $sum: { $cond: [{ $in: ['$status', ['approved', 'rejected']] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          } },
      ]),
      Certificate.aggregate([
        {
          $match: { issuedDate: { $gte: from, $lte: to }, status: 'issued' },
        },
        {
          $group: { _id: null, certificatesIssuedThisMonth: { $sum: 1 } },
        },
      ]),
      CertificateRequest.aggregate([
        {
          $lookup: {
            from: 'certificates',
            localField: 'certificateId',
            foreignField: '_id',
            as: 'certificate',
          },
        },
        { $unwind: { path: '$certificate', preserveNullAndEmptyArrays: true } },
        { $match: { ...buildRequestDateMatch(from, to), ...requestFilters } },
        {
          $project: {
            requestAt: '$requestedAt',
            issuedDate: '$certificate.issuedDate',
            finalizedDate: '$reviewedAt',
            turnaroundDays: {
              $cond: [
                { $and: [{ $ne: ['$requestedAt', null] }, { $ne: ['$certificate.issuedDate', null] }] },
                {
                  $divide: [
                    { $subtract: [{ $toDate: '$certificate.issuedDate' }, { $toDate: '$requestedAt' }] },
                    86400000,
                  ],
                },
                null,
              ],
            },
          },
        },
        { $match: { turnaroundDays: { $ne: null } } },
        { $group: { _id: null, turnaroundValues: { $push: '$turnaroundDays' } } },
      ]),
    ]);

    const internData = internSummary[0] || {};
    const requestData = requestSummary[0] || {};
    const approvalDecisions = toSafeInt(requestData.decidedRequests);
    const approvalRate = approvalDecisions > 0 ? (toSafeInt(requestData.approved) / approvalDecisions) * 100 : 0;
    const rejectionRate = approvalDecisions > 0 ? (toSafeInt(requestData.rejected) / approvalDecisions) * 100 : 0;
    const turnaroundValues = (turnaroundSummary[0]?.turnaroundValues || []).map((entry) => Number(entry));
    const certificatesIssuedThisMonth = await Certificate.aggregate([
      { $match: { issuedDate: { $gte: from, $lte: to }, status: 'issued' } },
      { $count: 'count' },
    ]).then((result) => toSafeInt(result[0]?.count || 0));

    return {
      totalInterns: toSafeInt(internData.totalInterns),
      activeInterns: toSafeInt(internData.activeInterns),
      upcomingInterns: toSafeInt(internData.upcomingInterns),
      completedInterns: toSafeInt(internData.completedInterns),
      cancelledInterns: toSafeInt(internData.cancelledInterns),
      totalTeamLeaders: toSafeInt(teamLeaderSummary[0]?.totalTeamLeaders || 0),
      pendingRequests: toSafeInt(requestData.pendingRequests),
      requestsThisMonth: toSafeInt(requestData.requestsThisMonth),
      certificatesIssuedThisMonth,
      approvalRate: Number(approvalRate.toFixed(2)),
      rejectionRate: Number(rejectionRate.toFixed(2)),
      averageTurnaround: turnaroundValues.length ? Number((turnaroundValues.reduce((sum, value) => sum + value, 0) / turnaroundValues.length).toFixed(2)) : null,
      medianTurnaround: turnaroundValues.length ? Number(getMedian(turnaroundValues).toFixed(2)) : null,
      p90Turnaround: turnaroundValues.length ? Number(getP90(turnaroundValues).toFixed(2)) : null,
    };
  });
};

export const getRequestsTrendAnalytics = async (query = {}) => {
  const { from, to, groupBy = 'day', domain, teamLeader } = { ...resolveRange(query), groupBy: query.groupBy || 'day' };
  const cacheKey = `admin:analytics:requests-trend:${from.toISOString()}:${to.toISOString()}:${groupBy}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const validGroupBy = ['day', 'week', 'month'].includes(String(groupBy).toLowerCase()) ? String(groupBy).toLowerCase() : 'day';
    const rows = await CertificateRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          requestedAt: { $gte: from, $lte: to },
          ...(domain ? { 'user.domain': domain } : {}),
          ...(teamLeader ? { $or: [{ 'user.email': String(teamLeader).trim().toLowerCase() }, { 'user.internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() }] } : {}),
        },
      },
      {
        $project: {
          bucket: {
            $dateTrunc: {
              date: '$requestedAt',
              unit: validGroupBy === 'day' ? 'day' : validGroupBy === 'week' ? 'week' : 'month',
              timezone: 'UTC',
            },
          },
          status: 1,
        },
      },
      {
        $group: {
          _id: { bucket: '$bucket', status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.bucket',
          counts: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const labels = rows.map((row) => new Date(row._id).toISOString().slice(0, 10));
    const series = getTrendSeries(
      rows.map((row) => ({
        label: new Date(row._id).toISOString().slice(0, 10),
        pending: row.counts.find((entry) => entry.status === 'pending')?.count || 0,
        approved: row.counts.find((entry) => entry.status === 'approved')?.count || 0,
        rejected: row.counts.find((entry) => entry.status === 'rejected')?.count || 0,
        processing: row.counts.find((entry) => entry.status === 'processing')?.count || 0,
        completed: row.counts.find((entry) => entry.status === 'completed')?.count || 0,
        cancelled: row.counts.find((entry) => entry.status === 'cancelled')?.count || 0,
      })),
      labels
    );

    return { labels, series };
  });
};

export const getCertificateTypesAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:certificate-types:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const rows = await CertificateRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          requestedAt: { $gte: from, $lte: to },
          ...(domain ? { 'user.domain': domain } : {}),
          ...(teamLeader ? { $or: [{ 'user.email': String(teamLeader).trim().toLowerCase() }, { 'user.internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() }] } : {}),
        },
      },
      { $group: { _id: '$certificateType', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    return {
      source: 'certificate_requests',
      labels: rows.map((row) => row._id || 'unknown'),
      series: rows.map((row) => row.count),
    };
  });
};

export const getTurnaroundAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:turnaround:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const rows = await CertificateRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          requestedAt: { $gte: from, $lte: to },
          ...(domain ? { 'user.domain': domain } : {}),
          ...(teamLeader ? { $or: [{ 'user.email': String(teamLeader).trim().toLowerCase() }, { 'user.internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() }] } : {}),
        },
      },
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificate',
        },
      },
      {
        $project: {
          requestedAt: 1,
          reviewedAt: 1,
          forwardedAt: 1,
          status: 1,
          firstReviewTimestamp: {
            $cond: [
              { $ne: ['$forwardedAt', null] },
              '$forwardedAt',
              { $ifNull: ['$reviewedAt', null] },
            ],
          },
          issuedDate: { $ifNull: [{ $arrayElemAt: ['$certificate.issuedDate', 0] }, null] },
        },
      },
      {
        $project: {
          requestedAt: 1,
          reviewedAt: 1,
          forwardedAt: 1,
          status: 1,
          issuedDate: 1,
          requestToReviewDays: {
            $cond: [
              { $and: [{ $ne: ['$requestedAt', null] }, { $ne: ['$firstReviewTimestamp', null] }] },
              { $divide: [{ $subtract: [{ $toDate: '$firstReviewTimestamp' }, { $toDate: '$requestedAt' }] }, 86400000] },
              null,
            ],
          },
          reviewToFinalizationDays: {
            $cond: [
              { $and: [{ $ne: ['$forwardedAt', null] }, { $ne: ['$reviewedAt', null] }, { $gt: [{ $toDate: '$reviewedAt' }, { $toDate: '$forwardedAt' }] }] },
              { $divide: [{ $subtract: [{ $toDate: '$reviewedAt' }, { $toDate: '$forwardedAt' }] }, 86400000] },
              null,
            ],
          },
          requestToIssuedDays: {
            $cond: [
              { $and: [{ $ne: ['$requestedAt', null] }, { $ne: ['$issuedDate', null] }] },
              { $divide: [{ $subtract: [{ $toDate: '$issuedDate' }, { $toDate: '$requestedAt' }] }, 86400000] },
              null,
            ],
          },
        },
      },
      { $match: { $or: [{ requestToReviewDays: { $ne: null } }, { reviewToFinalizationDays: { $ne: null } }, { requestToIssuedDays: { $ne: null } }] } },
    ]);

    const requestToReview = rows
      .map((row) => Number(row.requestToReviewDays))
      .filter((value) => Number.isFinite(value));
    const reviewToFinalization = rows
      .map((row) => Number(row.reviewToFinalizationDays))
      .filter((value) => Number.isFinite(value));
    const requestToIssued = rows
      .map((row) => Number(row.requestToIssuedDays))
      .filter((value) => Number.isFinite(value));

    return {
      requestToReview: calculateTurnaroundValues(requestToReview),
      reviewToFinalization: calculateTurnaroundValues(reviewToFinalization),
      requestToIssued: calculateTurnaroundValues(requestToIssued),
    };
  });
};

export const getTeamLeaderPerformanceAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader, overdueDays = 3 } = { ...resolveRange(query), overdueDays: Number(query.overdueDays || 3) };
  const cacheKey = `admin:analytics:team-leaders:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}:${overdueDays}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const leaders = await User.aggregate([
      { $match: { role: 'teamleader', ...(domain ? { domain } : {}) } },
      { $project: { teamLeaderId: '$_id', name: '$fullName', email: '$email' } },
    ]);

    const records = await Promise.all(leaders.map(async (leader) => {
      const [internCount, requestMetrics, pendingReviewMetrics, overdueMetrics] = await Promise.all([
        User.countDocuments({ role: 'intern', 'internshipDetails.teamleaderEmail': leader.email.toLowerCase() }),
        CertificateRequest.aggregate([
          {
            $match: {
              $or: [
                { forwardedBy: leader.teamLeaderId },
                { reviewedBy: leader.teamLeaderId },
              ],
              requestedAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: null,
              requestsReviewed: { $sum: 1 },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
              averageReviewTime: { $avg: { $cond: [{ $and: [{ $ne: ['$requestedAt', null] }, { $ne: ['$reviewedAt', null] }] }, { $divide: [{ $subtract: [{ $toDate: '$reviewedAt' }, { $toDate: '$requestedAt' }] }, 86400000] }, null] } },
            },
          },
        ]),
        CertificateRequest.countDocuments({
          status: 'pending',
          requestedAt: { $gte: from, $lte: to },
          $or: [
            { 'internCode': { $in: (await User.find({ role: 'intern', 'internshipDetails.teamleaderEmail': leader.email.toLowerCase() }, 'internCode').lean()).map((user) => user.internCode) } },
          ],
        }),
        CertificateRequest.countDocuments({
          status: { $in: ['pending', 'processing'] },
          requestedAt: { $lt: new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000) },
          $or: [
            { forwardedBy: leader.teamLeaderId },
            { reviewedBy: leader.teamLeaderId },
          ],
        }),
      ]);

      const reviewData = requestMetrics[0] || {};
      const totalDecisions = toSafeInt(reviewData.requestsReviewed || 0);
      const rejectedCount = toSafeInt(reviewData.rejected || 0);
      const rejectionRate = totalDecisions > 0 ? (rejectedCount / totalDecisions) * 100 : 0;

      return {
        teamLeaderId: leader.teamLeaderId,
        name: leader.name,
        email: leader.email,
        internsAssigned: internCount,
        requestsReviewed: totalDecisions,
        pendingReviews: pendingReviewMetrics,
        averageReviewTime: reviewData.averageReviewTime ? Number(reviewData.averageReviewTime.toFixed(2)) : null,
        rejectionRate: Number(rejectionRate.toFixed(2)),
        overdueRequests: overdueMetrics,
      };
    }));

    if (teamLeader) {
      return records.filter((entry) => entry.email === String(teamLeader).trim().toLowerCase() || entry.teamLeaderId.toString() === String(teamLeader));
    }

    return records;
  });
};

export const getDomainsAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:domains:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const rows = await User.aggregate([
      {
        $match: {
          role: 'intern',
          createdAt: { $gte: from, $lte: to },
          ...(domain ? { domain } : {}),
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$domain', 'Unassigned'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const labels = rows.map((row) => row._id || 'Unassigned');
    const series = rows.map((row) => row.count);

    return { labels, series };
  });
};

export const getPipelineAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:pipeline:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const rows = await CertificateRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          requestedAt: { $gte: from, $lte: to },
          ...(domain ? { 'user.domain': domain } : {}),
          ...(teamLeader ? { $or: [{ 'user.email': String(teamLeader).trim().toLowerCase() }, { 'user.internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() }] } : {}),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const series = ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'].map((status) => countsMap[status] || 0);

    return {
      labels: PIPELINE_LABELS,
      series,
    };
  });
};

export const getUpcomingCompletionsAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const cacheKey = `admin:analytics:upcoming:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const users = await User.find({
      role: 'intern',
      endDate: { $gte: from, $lte: to },
      ...(domain ? { domain } : {}),
      ...(teamLeader ? { 'internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() } : {}),
    })
      .select('fullName domain endDate internshipDetails.teamleaderEmail email')
      .sort({ endDate: 1 })
      .lean();

    const requests = await CertificateRequest.find({
      userId: { $in: users.map((user) => user._id) },
    }).select('_id userId status').lean();

    const requestMap = new Map();
    requests.forEach((request) => { requestMap.set(String(request.userId), request); });

    return {
      items: users.map((user) => ({
        id: user._id,
        name: user.fullName,
        domain: user.domain || 'Unassigned',
        teamLeader: user.internshipDetails?.teamleaderEmail || 'Unassigned',
        endDate: user.endDate,
        hasCertificateRequest: requestMap.has(String(user._id)),
        certificateRequestStatus: requestMap.get(String(user._id))?.status || null,
      })),
      count: users.length,
    };
  });
};

export const getStuckRequestsAnalytics = async (query = {}) => {
  const { from, to, domain, teamLeader, overdueDays = 3 } = { ...resolveRange(query), overdueDays: Number(query.overdueDays || 3) };
  const cacheKey = `admin:analytics:stuck:${from.toISOString()}:${to.toISOString()}:${domain || 'all'}:${teamLeader || 'all'}:${overdueDays}`;

  return withAnalyticsCache(cacheKey, 180, async () => {
    const requests = await CertificateRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          status: { $in: ['pending', 'processing'] },
          requestedAt: { $gte: from, $lte: to },
          ...(domain ? { 'user.domain': domain } : {}),
          ...(teamLeader ? { $or: [{ 'user.email': String(teamLeader).trim().toLowerCase() }, { 'user.internshipDetails.teamleaderEmail': String(teamLeader).trim().toLowerCase() }] } : {}),
        },
      },
      {
        $project: {
          requestNumber: 1,
          _id: 1,
          certificateType: 1,
          status: 1,
          requestedAt: 1,
          internName: '$user.fullName',
          userId: '$user._id',
          daysWaiting: {
            $divide: [
              { $subtract: [new Date(), { $toDate: '$requestedAt' }] },
              86400000,
            ],
          },
          assignedReviewer: {
            $ifNull: ['$forwardedBy', '$reviewedBy'],
          },
        },
      },
      {
        $match: {
          daysWaiting: { $gte: overdueDays },
        },
      },
      { $sort: { requestedAt: 1 } },
    ]);

    return {
      requests: requests.map((request) => ({
        requestNumber: request.requestNumber,
        requestId: request._id,
        internName: request.internName,
        certificateType: request.certificateType,
        currentStatus: request.status,
        requestedDate: request.requestedAt,
        daysWaiting: Math.max(0, Math.floor(Number(request.daysWaiting))),
        assignedReviewer: request.assignedReviewer || null,
      })),
      count: requests.length,
    };
  });
};

export const exportAnalytics = async ({ type, format = 'xlsx', query = {}, userId }) => {
  const { from, to, domain, teamLeader } = resolveRange(query);
  const exportType = String(type || 'overview');
  let rows = [];

  switch (exportType) {
    case 'overview': {
      const result = await getOverviewAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = [
        { metric: 'totalInterns', value: result.totalInterns },
        { metric: 'activeInterns', value: result.activeInterns },
        { metric: 'upcomingInterns', value: result.upcomingInterns },
        { metric: 'completedInterns', value: result.completedInterns },
        { metric: 'cancelledInterns', value: result.cancelledInterns },
        { metric: 'totalTeamLeaders', value: result.totalTeamLeaders },
        { metric: 'pendingRequests', value: result.pendingRequests },
        { metric: 'requestsThisMonth', value: result.requestsThisMonth },
        { metric: 'certificatesIssuedThisMonth', value: result.certificatesIssuedThisMonth },
        { metric: 'approvalRate', value: result.approvalRate },
        { metric: 'rejectionRate', value: result.rejectionRate },
        { metric: 'averageTurnaround', value: result.averageTurnaround },
        { metric: 'medianTurnaround', value: result.medianTurnaround },
        { metric: 'p90Turnaround', value: result.p90Turnaround },
      ];
      break;
    }
    case 'requests-trend': {
      const result = await getRequestsTrendAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = result.labels.map((label, idx) => ({
        label,
        pending: result.series[0].data[idx],
        approved: result.series[1].data[idx],
        rejected: result.series[2].data[idx],
        processing: result.series[3].data[idx],
        completed: result.series[4].data[idx],
        cancelled: result.series[5].data[idx],
      }));
      break;
    }
    case 'certificate-types': {
      const result = await getCertificateTypesAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = result.labels.map((label, idx) => ({ certificateType: label, count: result.series[idx] }));
      break;
    }
    case 'turnaround': {
      const result = await getTurnaroundAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = [
        { metric: 'requestToReview.average', value: result.requestToReview.average },
        { metric: 'requestToReview.median', value: result.requestToReview.median },
        { metric: 'requestToReview.p90', value: result.requestToReview.p90 },
        { metric: 'reviewToFinalization.average', value: result.reviewToFinalization.average },
        { metric: 'reviewToFinalization.median', value: result.reviewToFinalization.median },
        { metric: 'reviewToFinalization.p90', value: result.reviewToFinalization.p90 },
        { metric: 'requestToIssued.average', value: result.requestToIssued.average },
        { metric: 'requestToIssued.median', value: result.requestToIssued.median },
        { metric: 'requestToIssued.p90', value: result.requestToIssued.p90 },
      ];
      break;
    }
    case 'team-leaders': {
      const result = await getTeamLeaderPerformanceAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = result.map((item) => ({
        teamLeaderId: item.teamLeaderId,
        name: item.name,
        email: item.email,
        internsAssigned: item.internsAssigned,
        requestsReviewed: item.requestsReviewed,
        pendingReviews: item.pendingReviews,
        averageReviewTime: item.averageReviewTime,
        rejectionRate: item.rejectionRate,
        overdueRequests: item.overdueRequests,
      }));
      break;
    }
    case 'domains': {
      const result = await getDomainsAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = result.labels.map((label, idx) => ({ domain: label, count: result.series[idx] }));
      break;
    }
    case 'pipeline': {
      const result = await getPipelineAnalytics({ ...query, from: from.toISOString(), to: to.toISOString(), domain, teamLeader });
      rows = result.labels.map((label, idx) => ({ stage: label, count: result.series[idx] }));
      break;
    }
    default:
      throw new Error('Unsupported export type');
  }

  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ message: 'No data for this period' }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');

  const fileType = String(format || 'xlsx').toLowerCase();
  const fileName = `${exportType}-${Date.now()}.${fileType === 'csv' ? 'csv' : 'xlsx'}`;

  if (fileType === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const buffer = Buffer.from(csv, 'utf8');
    await AuditLog.create({
      userId: userId,
      action: 'analytics_export',
      entityType: 'analytics',
      description: `CSV export for ${exportType} analytics (${from.toISOString()} to ${to.toISOString()})`,
    });
    return { fileName, buffer, mimeType: 'text/csv' };
  }

  const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  await AuditLog.create({
    userId: userId,
    action: 'analytics_export',
    entityType: 'analytics',
    description: `XLSX export for ${exportType} analytics (${from.toISOString()} to ${to.toISOString()})`,
  });
  return { fileName, buffer: workbookBuffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
};
