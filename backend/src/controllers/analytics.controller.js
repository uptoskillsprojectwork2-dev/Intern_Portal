import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import { logAudit } from '../utils/auditLogger.js';

const STAGES = ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'];
const ALLOWED_EXPORT_TYPES = ['overview', 'requests-trend', 'certificate-types', 'turnaround', 'team-leaders', 'domains', 'pipeline'];
const DAY_MS = 1000 * 60 * 60 * 24;

function computeStats(values) {
    const filtered = values.filter((v) => typeof v === 'number' && v >= 0);
    if (filtered.length === 0) {
        return { average: 0, median: 0, p90: 0, count: 0 };
    }
    filtered.sort((a, b) => a - b);
    const sum = filtered.reduce((acc, v) => acc + v, 0);
    const average = Math.round((sum / filtered.length) * 100) / 100;
    const median = filtered.length % 2 === 0
        ? Math.round(((filtered[filtered.length / 2 - 1] + filtered[filtered.length / 2]) / 2) * 100) / 100
        : Math.round(filtered[Math.floor(filtered.length / 2)] * 100) / 100;
    const p90Index = Math.ceil(filtered.length * 0.9) - 1;
    const p90 = Math.round(filtered[Math.max(0, p90Index)] * 100) / 100;
    return { average, median, p90, count: filtered.length };
}

function parseDateRange(req) {
    const { from, to, range = '30d' } = req.query;
    let fromDate = null;
    let toDate = null;

    if (from && to) {
        fromDate = new Date(from);
        toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
    } else if (from) {
        fromDate = new Date(from);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
    } else {
        const rangeMap = { '7d': 7, '30d': 30, '6m': 180, '12m': 365 };
        const days = rangeMap[range] || 30;
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
    }

    return { fromDate, toDate };
}

function resolveGroup(groupBy) {
    const g = groupBy || 'month';
    if (g === 'day') return { dateTruncUnit: 'day', labelFormat: 'date' };
    if (g === 'week') return { dateTruncUnit: 'week', labelFormat: 'date' };
    return { dateTruncUnit: 'month', labelFormat: 'month' };
}

function formatDate(date, fmt) {
    if (fmt === 'date') return new Date(date).toISOString().split('T')[0];
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function buildDateMatch(field, fromDate, toDate) {
    if (fromDate || toDate) {
        const m = {};
        if (fromDate) m.$gte = fromDate;
        if (toDate) m.$lte = toDate;
        return { [field]: m };
    }
    return null;
}

export const getOverview = async (req, res) => {
    try {
        const { fromDate, toDate } = parseDateRange(req);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const requestDateMatch = buildDateMatch('requestedAt', fromDate, toDate);
        const certMonthMatch = { issuedDate: { $gte: monthStart } };

        const internPipeline = [
            {
                $facet: {
                    internsByStatus: [
                        { $match: { role: 'intern' } },
                        { $group: { _id: '$internshipDetails.status', count: { $sum: 1 } } },
                    ],
                    teamLeaders: [
                        { $match: { role: 'teamleader' } },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                },
            },
        ];

        const [userResults] = await User.aggregate(internPipeline);

        const requestPipeline = [
            {
                $facet: {
                    requests: [
                        ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                                processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
                                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                            },
                        },
                    ],
                    requestsThisMonth: [
                        { $match: { requestedAt: { $gte: monthStart } } },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                    certificatesThisMonth: [
                        { $match: certMonthMatch },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                    approvedRequests: [
                        ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                        { $match: { status: 'approved' } },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                    rejectedRequests: [
                        ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                        { $match: { status: 'rejected' } },
                        { $group: { _id: null, count: { $sum: 1 } } },
                    ],
                },
            },
        ];

        const [requestResults] = await CertificateRequest.aggregate(requestPipeline);

        const internStatusMap = {};
        userResults.internsByStatus.forEach((r) => { internStatusMap[r._id || 'upcoming'] = r.count; });

        const totalInterns = Object.values(internStatusMap).reduce((acc, v) => acc + v, 0);
        const approvedCount = requestResults.approvedRequests[0]?.count || 0;
        const rejectedCount = requestResults.rejectedRequests[0]?.count || 0;
        const totalDecisions = approvedCount + rejectedCount;

        const overview = {
            totalInterns,
            activeInterns: internStatusMap['ongoing'] || 0,
            upcomingInterns: internStatusMap['upcoming'] || 0,
            completedInterns: internStatusMap['completed'] || 0,
            cancelledInterns: internStatusMap['cancelled'] || 0,
            totalTeamLeaders: userResults.teamLeaders[0]?.count || 0,
            pendingRequests: requestResults.requests[0]?.pending || 0,
            requestsThisMonth: requestResults.requestsThisMonth[0]?.count || 0,
            certificatesIssuedThisMonth: requestResults.certificatesThisMonth[0]?.count || 0,
            totalRequests: requestResults.requests[0]?.total || 0,
            requestsByStatus: STAGES.reduce((acc, s) => {
                acc[s] = requestResults.requests[0]?.[s] || 0;
                return acc;
            }, {}),
            approvalRate: totalDecisions > 0 ? Math.round((approvedCount / totalDecisions) * 100) : 0,
            rejectionRate: totalDecisions > 0 ? Math.round((rejectedCount / totalDecisions) * 100) : 0,
        };

        return res.json({ overview });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getRequestsTrend = async (req, res) => {
    try {
        const { fromDate, toDate } = parseDateRange(req);
        const { dateTruncUnit, labelFormat } = resolveGroup(req.query.groupBy);

        const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);

        const pipeline = [
            ...(dateMatch ? [{ $match: dateMatch }] : []),
            {
                $group: {
                    _id: {
                        status: '$status',
                        period: { $dateTrunc: { date: '$requestedAt', unit: dateTruncUnit, timezone: 'UTC' } },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.period': 1 } },
        ];

        const results = await CertificateRequest.aggregate(pipeline);

        const labelsSet = new Set();
        const seriesMap = {};

        results.forEach((r) => {
            const label = formatDate(r._id.period, labelFormat);
            labelsSet.add(label);
            const status = r._id.status;
            if (!seriesMap[status]) seriesMap[status] = {};
            seriesMap[status][label] = r.count;
        });

        const labels = Array.from(labelsSet).sort((a, b) => {
            const da = new Date(a);
            const db = new Date(b);
            if (!isNaN(da) && !isNaN(db)) return da - db;
            return a.localeCompare(b);
        });

        const series = Object.entries(seriesMap).map(([status, data]) => ({
            status,
            data: labels.map((label) => data[label] || 0),
        }));

        return res.json({ labels, series });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getCertificateTypes = async (req, res) => {
    try {
        const { fromDate, toDate } = parseDateRange(req);
        const dateMatch = buildDateMatch('issuedDate', fromDate, toDate);

        const types = await Certificate.aggregate([
            ...(dateMatch ? [{ $match: dateMatch }] : []),
            { $group: { _id: '$certificateType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        const labels = types.map((t) => t._id);
        const series = types.map((t) => t.count);

        return res.json({ labels, series, data: types.map((t) => ({ certificateType: t._id, count: t.count })) });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getTurnaround = async (req, res) => {
    try {
        const { fromDate, toDate } = parseDateRange(req);

        const match = { status: { $in: ['approved', 'completed'] } };
        const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);
        if (dateMatch) {
            match.requestedAt = dateMatch.requestedAt;
        }

        const requests = await CertificateRequest.find(match).lean();

        const tlReviewTimes = [];
        const adminReviewTimes = [];
        const totalTimes = [];

        requests.forEach((r) => {
            const reqTime = new Date(r.requestedAt);
            if (r.forwardedAt && r.reviewedAt) {
                const tlMs = new Date(r.forwardedAt) - reqTime;
                const adminMs = new Date(r.reviewedAt) - new Date(r.forwardedAt);
                if (tlMs >= 0) tlReviewTimes.push(Math.round(tlMs / DAY_MS));
                if (adminMs >= 0) adminReviewTimes.push(Math.round(adminMs / DAY_MS));
                if (r.reviewedAt - reqTime >= 0) {
                    totalTimes.push(Math.round((r.reviewedAt - reqTime) / DAY_MS));
                }
            } else if (r.reviewedAt) {
                const totalMs = new Date(r.reviewedAt) - reqTime;
                if (totalMs >= 0) {
                    totalTimes.push(Math.round(totalMs / DAY_MS));
                }
            }
        });

        return res.json({
            tlReviewTime: computeStats(tlReviewTimes),
            adminReviewTime: computeStats(adminReviewTimes),
            totalTime: computeStats(totalTimes),
            unit: 'days',
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

async function fetchTeamLeaderStats(req) {
    const { fromDate, toDate } = parseDateRange(req);
    const overdueThreshold = parseInt(req.query.overdueDays) || 3;

    const requestMatch = buildDateMatch('requestedAt', fromDate, toDate);

    const requestPipeline = [
        { $match: { userId: { $ne: null } } },
        ...(requestMatch ? [{ $match: requestMatch }] : []),
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
                'user.role': 'intern',
                ...(req.query.domain ? { 'user.domain': req.query.domain } : {}),
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user.internshipDetails.teamLeader',
                foreignField: '_id',
                as: 'teamLeader',
            },
        },
        { $unwind: { path: '$teamLeader', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'users',
                localField: 'user.internshipDetails.teamleaderEmail',
                foreignField: 'email',
                as: 'teamLeaderEmailMatch',
            },
        },
        {
            $addFields: {
                effectiveTl: {
                    $cond: {
                        if: { $ifNull: ['$teamLeader._id', false] },
                        then: '$teamLeader._id',
                        else: { $arrayElemAt: ['$teamLeaderEmailMatch._id', 0] },
                    },
                },
            },
        },
        {
            $project: {
                status: 1,
                forwardedAt: 1,
                reviewedAt: 1,
                effectiveTl: 1,
                'user.internshipDetails.status': 1,
            },
        },
    ];

    const requestResults = await CertificateRequest.aggregate(requestPipeline);

    const statsByTl = {};

    requestResults.forEach((r) => {
        const tlId = r.effectiveTl ? r.effectiveTl.toString() : null;
        if (!tlId) return;
        if (!statsByTl[tlId]) {
            statsByTl[tlId] = {
                tlId,
                requestsReviewed: 0,
                approved: 0,
                rejected: 0,
                pendingReviews: 0,
                reviewTimes: [],
            };
        }
        if (r.status === 'approved' || r.status === 'completed' || r.status === 'rejected') {
            statsByTl[tlId].requestsReviewed += 1;
            if (r.status === 'approved' || r.status === 'completed') statsByTl[tlId].approved += 1;
            else if (r.status === 'rejected') statsByTl[tlId].rejected += 1;
        }
        if (r.status === 'pending') statsByTl[tlId].pendingReviews += 1;
        if (r.forwardedAt && r.reviewedAt) {
            const ms = new Date(r.reviewedAt) - new Date(r.forwardedAt);
            if (ms >= 0) statsByTl[tlId].reviewTimes.push(Math.round(ms / DAY_MS));
        }
    });

    const tldocs = await User.find({ role: 'teamleader' }).select('fullName email');
    const internCountByTl = {};

    const internQuery = { role: 'intern' };
    const interns = await User.find(internQuery).select('internshipDetails.teamLeader internshipDetails.teamleaderEmail domain');

    interns.forEach((i) => {
        const tlRef = i.internshipDetails?.teamLeader;
        const tlEmail = i.internshipDetails?.teamleaderEmail;
        let tlId = null;
        if (tlRef) {
            tlId = tlRef.toString();
        } else if (tlEmail && tldocs.find((t) => t.email === tlEmail)) {
            tlId = tldocs.find((t) => t.email === tlEmail)._id.toString();
        }
        if (tlId) {
            internCountByTl[tlId] = (internCountByTl[tlId] || 0) + 1;
        }
    });

    const teamLeaders = [...new Set([...Object.keys(statsByTl), ...tldocs.map((t) => t._id.toString())])].map((tlId) => {
        const tl = tldocs.find((t) => t._id.toString() === tlId);
        const stats = statsByTl[tlId] || { requestsReviewed: 0, approved: 0, rejected: 0, pendingReviews: 0, reviewTimes: [] };
        const reviewStats = computeStats(stats.reviewTimes);
        const totalDecisions = stats.approved + stats.rejected;
        const rejectionRate = totalDecisions > 0 ? Math.round((stats.rejected / totalDecisions) * 100) : 0;

        return {
            tlId,
            fullName: tl?.fullName || null,
            email: tl?.email || null,
            internsAssigned: internCountByTl[tlId] || 0,
            requestsReviewed: stats.requestsReviewed,
            pendingReviews: stats.pendingReviews,
            avgReviewTime: reviewStats.average,
            medianReviewTime: reviewStats.median,
            p90ReviewTime: reviewStats.p90,
            reviewTime: reviewStats,
            rejectionRate,
            overdue: stats.pendingReviews > 0,
        };
    });

    const now = new Date();
    const overdueThresholdMs = overdueThreshold * DAY_MS;
    const overdueMatch = { status: 'pending' };
    const overdueRequests = await CertificateRequest.find(overdueMatch)
        .populate('userId', 'fullName internCode domain')
        .lean();

    const overdue = overdueRequests
        .filter((r) => {
            if (req.query.domain && r.userId?.domain !== req.query.domain) return false;
            return now - new Date(r.requestedAt) > overdueThresholdMs;
        })
        .map((r) => ({
            _id: r._id,
            requestNumber: r.requestNumber,
            internName: r.userId?.fullName || 'Unknown',
            internCode: r.userId?.internCode || '—',
            domain: r.userId?.domain || r.domain || '—',
            certificateType: r.certificateType,
            status: r.status,
            requestedAt: r.requestedAt,
            daysPending: Math.floor((now - new Date(r.requestedAt)) / DAY_MS),
        }))
        .sort((a, b) => b.daysPending - a.daysPending);

    return { teamLeaders, overdueRequests: overdue, overdueThresholdDays: overdueThreshold };
}

export const getTeamLeaders = async (req, res) => {
    try {
        const result = await fetchTeamLeaderStats(req);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getDomains = async (req, res) => {
    try {
        const pipeline = [
            { $match: { role: 'intern' } },
            {
                $group: {
                    _id: { domain: '$domain', status: '$internshipDetails.status' },
                    count: { $sum: 1 },
                },
            },
        ];

        const results = await User.aggregate(pipeline);

        const domainMap = {};
        results.forEach((r) => {
            const domain = r._id.domain || 'Unspecified';
            if (!domainMap[domain]) domainMap[domain] = { domain, total: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };
            domainMap[domain][r._id.status] = r.count;
            domainMap[domain].total += r.count;
        });

        const data = Object.values(domainMap).sort((a, b) => b.total - a.total);
        const labels = data.map((d) => d.domain);
        const series = data.map((d) => d.total);

        return res.json({ labels, series, data });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getPipeline = async (req, res) => {
    try {
        const { fromDate, toDate } = parseDateRange(req);
        const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);

        const pipeline = [
            ...(dateMatch ? [{ $match: dateMatch }] : []),
            {
                $group: {
                    _id: null,
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                    processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                },
            },
        ];

        const [result] = await CertificateRequest.aggregate(pipeline);

        const stages = [
            { stage: 'pending', label: 'Pending TL Review', count: result?.pending || 0 },
            { stage: 'approved', label: 'TL Approved', count: result?.approved || 0 },
            { stage: 'processing', label: 'Forwarded to Admin', count: result?.processing || 0 },
            { stage: 'completed', label: 'Certificate Issued', count: result?.completed || 0 },
        ];

        const failedGenerations = await CertificateRequest.countDocuments({
            status: 'approved',
            certificateId: { $in: [null, undefined] },
        });

        stages.push({ stage: 'failed_gens', label: 'Failed Generations', count: failedGenerations });

        const total = stages.reduce((acc, s) => acc + s.count, 0);

        return res.json({
            stages,
            totalRequests: total,
            conversionRate: total > 0 ? Math.round(((result?.completed || 0) / total) * 100) : 0,
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getUpcomingCompletions = async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 30;
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const pipeline = [
            {
                $match: {
                    role: 'intern',
                    endDate: { $gte: now, $lte: futureDate },
                    'internshipDetails.status': { $ne: 'cancelled' },
                },
            },
            {
                $lookup: {
                    from: 'certificate_requests',
                    let: { internId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', '$$internId'] },
                                        { $in: ['$certificateType', ['completion_certificate', 'experience_letter']] },
                                    ],
                                },
                            },
                        },
                        { $sort: { requestedAt: -1 } },
                        { $limit: 1 },
                    ],
                    as: 'latestCompletionRequest',
                },
            },
            { $unwind: { path: '$latestCompletionRequest', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    hasCompletionRequest: { $ifNull: ['$latestCompletionRequest._id', false] },
                    requestStatus: {
                        $ifNull: ['$latestCompletionRequest.status', 'not_requested'],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    internCode: 1,
                    domain: 1,
                    startDate: 1,
                    endDate: 1,
                    status: '$internshipDetails.status',
                    teamLeader: '$internshipDetails.teamLeader',
                    hasCompletionRequest: 1,
                    requestStatus: 1,
                    daysToEnd: { $dateDiff: { startDate: now, endDate: '$endDate', unit: 'day' } },
                },
            },
            { $sort: { endDate: 1 } },
        ];

        if (req.query.domain) {
            pipeline[0].$match.domain = req.query.domain;
        }

        const interns = await User.aggregate(pipeline);

        const withoutCertificate = interns.filter((i) => !i.hasCompletionRequest);

        return res.json({ interns, total: interns.length, withoutCertificate: withoutCertificate.length });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const exportAnalytics = async (req, res) => {
    try {
        const { type } = req.query;

        if (!ALLOWED_EXPORT_TYPES.includes(type)) {
            return res.status(400).json({ message: `type must be one of: ${ALLOWED_EXPORT_TYPES.join(', ')}` });
        }

        const virtualReq = {
            query: {},
            ...(req.query.from && { query: { ...req.query } }),
        };

        let data;
        let filename;

        switch (type) {
            case 'overview': {
                const { fromDate, toDate } = parseDateRange(req);
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const requestDateMatch = buildDateMatch('requestedAt', fromDate, toDate);

                const internPipeline = [
                    {
                        $facet: {
                            internsByStatus: [
                                { $match: { role: 'intern' } },
                                { $group: { _id: '$internshipDetails.status', count: { $sum: 1 } } },
                            ],
                            teamLeaders: [
                                { $match: { role: 'teamleader' } },
                                { $group: { _id: null, count: { $sum: 1 } } },
                            ],
                        },
                    },
                ];

                const [userResults] = await User.aggregate(internPipeline);

                const requestPipeline = [
                    {
                        $facet: {
                            requests: [
                                ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: 1 },
                                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                                        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                                        processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
                                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                                        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                                        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                                    },
                                },
                            ],
                            requestsThisMonth: [
                                { $match: { requestedAt: { $gte: monthStart } } },
                                { $group: { _id: null, count: { $sum: 1 } } },
                            ],
                            certificatesThisMonth: [
                                { $match: { issuedDate: { $gte: monthStart } } },
                                { $group: { _id: null, count: { $sum: 1 } } },
                            ],
                            approvedRequests: [
                                ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                                { $match: { status: 'approved' } },
                                { $group: { _id: null, count: { $sum: 1 } } },
                            ],
                            rejectedRequests: [
                                ...(requestDateMatch ? [{ $match: requestDateMatch }] : []),
                                { $match: { status: 'rejected' } },
                                { $group: { _id: null, count: { $sum: 1 } } },
                            ],
                        },
                    },
                ];

                const [requestResults] = await CertificateRequest.aggregate(requestPipeline);

                const internStatusMap = {};
                userResults.internsByStatus.forEach((r) => { internStatusMap[r._id || 'upcoming'] = r.count; });
                const totalInterns = Object.values(internStatusMap).reduce((acc, v) => acc + v, 0);
                const approvedCount = requestResults.approvedRequests[0]?.count || 0;
                const rejectedCount = requestResults.rejectedRequests[0]?.count || 0;
                const totalDecisions = approvedCount + rejectedCount;

                data = [
                    ['Metric', 'Value'],
                    ['Total Interns', totalInterns],
                    ['Active Intern (Ongoing)', internStatusMap['ongoing'] || 0],
                    ['Upcoming Interns', internStatusMap['upcoming'] || 0],
                    ['Completed Interns', internStatusMap['completed'] || 0],
                    ['Cancelled Interns', internStatusMap['cancelled'] || 0],
                    ['Total Team Leaders', userResults.teamLeaders[0]?.count || 0],
                    ['Pending Requests', requestResults.requests[0]?.pending || 0],
                    ['Requests This Month', requestResults.requestsThisMonth[0]?.count || 0],
                    ['Certificates Issued This Month', requestResults.certificatesThisMonth[0]?.count || 0],
                    ['Approval Rate (%)', totalDecisions > 0 ? Math.round((approvedCount / totalDecisions) * 100) : 0],
                    ['Rejection Rate (%)', totalDecisions > 0 ? Math.round((rejectedCount / totalDecisions) * 100) : 0],
                ];
                filename = `analytics-overview-${Date.now()}.csv`;
                break;
            }
            case 'requests-trend': {
                const { fromDate, toDate } = parseDateRange(req);
                const { dateTruncUnit, labelFormat } = resolveGroup(req.query.groupBy);
                const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);

                const pipeline = [
                    ...(dateMatch ? [{ $match: dateMatch }] : []),
                    {
                        $group: {
                            _id: {
                                status: '$status',
                                period: { $dateTrunc: { date: '$requestedAt', unit: dateTruncUnit, timezone: 'UTC' } },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.period': 1 } },
                ];

                const results = await CertificateRequest.aggregate(pipeline);
                const labelsSet = new Set();
                const seriesMap = {};

                results.forEach((r) => {
                    const label = formatDate(r._id.period, labelFormat);
                    labelsSet.add(label);
                    const status = r._id.status;
                    if (!seriesMap[status]) seriesMap[status] = {};
                    seriesMap[status][label] = r.count;
                });

                const labels = Array.from(labelsSet).sort((a, b) => {
                    const da = new Date(a);
                    const db = new Date(b);
                    if (!isNaN(da) && !isNaN(db)) return da - db;
                    return a.localeCompare(b);
                });

                const series = Object.entries(seriesMap).map(([status, d]) => ({ status, data: d }));

                data = [['Period', ...series.map((s) => s.status)], ...labels.map((label) => [label, ...series.map((s) => s.data[label] || 0)])];
                filename = `analytics-requests-trend-${Date.now()}.csv`;
                break;
            }
            case 'certificate-types': {
                const { fromDate, toDate } = parseDateRange(req);
                const dateMatch = buildDateMatch('issuedDate', fromDate, toDate);

                const types = await Certificate.aggregate([
                    ...(dateMatch ? [{ $match: dateMatch }] : []),
                    { $group: { _id: '$certificateType', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]);

                data = [['Certificate Type', 'Count'], ...types.map((t) => [t._id, t.count])];
                filename = `analytics-certificate-types-${Date.now()}.csv`;
                break;
            }
            case 'turnaround': {
                const { fromDate, toDate } = parseDateRange(req);
                const match = { status: { $in: ['approved', 'completed'] } };
                const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);
                if (dateMatch) match.requestedAt = dateMatch.requestedAt;

                const requests = await CertificateRequest.find(match).lean();

                const tlReviewTimes = [];
                const adminReviewTimes = [];
                const totalTimes = [];

                requests.forEach((r) => {
                    const reqTime = new Date(r.requestedAt);
                    if (r.forwardedAt && r.reviewedAt) {
                        const tlMs = new Date(r.forwardedAt) - reqTime;
                        const adminMs = new Date(r.reviewedAt) - new Date(r.forwardedAt);
                        if (tlMs >= 0) tlReviewTimes.push(Math.round(tlMs / DAY_MS));
                        if (adminMs >= 0) adminReviewTimes.push(Math.round(adminMs / DAY_MS));
                        if (r.reviewedAt - reqTime >= 0) {
                            totalTimes.push(Math.round((r.reviewedAt - reqTime) / DAY_MS));
                        }
                    } else if (r.reviewedAt) {
                        const totalMs = new Date(r.reviewedAt) - reqTime;
                        if (totalMs >= 0) totalTimes.push(Math.round(totalMs / DAY_MS));
                    }
                });

                const tlStats = computeStats(tlReviewTimes);
                const adminStats = computeStats(adminReviewTimes);
                const totalStats = computeStats(totalTimes);

                data = [
                    ['Metric', 'Average (days)', 'Median (days)', 'P90 (days)', 'Sample Size'],
                    ['TL Review Time', tlStats.average, tlStats.median, tlStats.p90, tlStats.count],
                    ['Admin Review Time', adminStats.average, adminStats.median, adminStats.p90, adminStats.count],
                    ['Total Time', totalStats.average, totalStats.median, totalStats.p90, totalStats.count],
                ];
                filename = `analytics-turnaround-${Date.now()}.csv`;
                break;
            }
            case 'team-leaders': {
                const result = await fetchTeamLeaderStats(req);
                data = [
                    ['Full Name', 'Email', 'Interns Assigned', 'Requests Reviewed', 'Pending Reviews', 'Avg Review Time (days)', 'Rejection Rate (%)'],
                    ...result.teamLeaders.map((tl) => [
                        tl.fullName, tl.email, tl.internsAssigned, tl.requestsReviewed, tl.pendingReviews, tl.avgReviewTime, tl.rejectionRate,
                    ]),
                    [],
                    ['Overdue Requests'],
                    ['Request Number', 'Intern Name', 'Intern Code', 'Domain', 'Certificate Type', 'Status', 'Days Pending'],
                    ...result.overdueRequests.map((r) => [
                        r.requestNumber, r.internName, r.internCode, r.domain, r.certificateType, r.status, `${r.daysPending} days`,
                    ]),
                ];
                filename = `analytics-team-leaders-${Date.now()}.csv`;
                break;
            }
            case 'domains': {
                const pipeline = [
                    { $match: { role: 'intern' } },
                    {
                        $group: {
                            _id: { domain: '$domain', status: '$internshipDetails.status' },
                            count: { $sum: 1 },
                        },
                    },
                ];

                const results = await User.aggregate(pipeline);
                const domainMap = {};
                results.forEach((r) => {
                    const domain = r._id.domain || 'Unspecified';
                    if (!domainMap[domain]) domainMap[domain] = { domain, total: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };
                    domainMap[domain][r._id.status] = r.count;
                    domainMap[domain].total += r.count;
                });

                const domains = Object.values(domainMap).sort((a, b) => b.total - a.total);
                data = [['Domain', 'Total', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'], ...domains.map((d) => [d.domain, d.total, d.upcoming, d.ongoing, d.completed, d.cancelled])];
                filename = `analytics-domains-${Date.now()}.csv`;
                break;
            }
            case 'pipeline': {
                const { fromDate, toDate } = parseDateRange(req);
                const dateMatch = buildDateMatch('requestedAt', fromDate, toDate);

                const pipeline = [
                    ...(dateMatch ? [{ $match: dateMatch }] : []),
                    {
                        $group: {
                            _id: null,
                            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                            processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
                            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                        },
                    },
                ];

                const [result] = await CertificateRequest.aggregate(pipeline);
                const stages = [
                    { stage: 'pending', label: 'Pending TL Review', count: result?.pending || 0 },
                    { stage: 'approved', label: 'TL Approved', count: result?.approved || 0 },
                    { stage: 'processing', label: 'Forwarded to Admin', count: result?.processing || 0 },
                    { stage: 'completed', label: 'Certificate Issued', count: result?.completed || 0 },
                ];

                const failedGenerations = await CertificateRequest.countDocuments({
                    status: 'approved',
                    certificateId: { $in: [null, undefined] },
                });
                stages.push({ stage: 'failed_gens', label: 'Failed Generations', count: failedGenerations });

                data = [['Stage', 'Label', 'Count'], ...stages.map((s) => [s.stage, s.label, s.count])];
                filename = `analytics-pipeline-${Date.now()}.csv`;
                break;
            }
        }

        const csv = data
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        await logAudit({
            userId: req.user.id,
            action: 'EXPORT_ANALYTICS_CSV',
            entityType: 'analytics_export',
            entityId: null,
            description: `Exported ${type} analytics report as CSV (${filename})`,
            req,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
    } catch (err) {
        return res.status(500).json({ message: 'Export failed', error: err.message });
    }
};
