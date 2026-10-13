import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
    getOverview,
    getRequestsTrend,
    getCertificateTypes,
    getTurnaround,
    getTeamLeaders,
    getDomains,
    getPipeline,
    getUpcomingCompletions,
    exportAnalytics,
} from '../src/controllers/analytics.controller.js';

import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.js';

const mockRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        header: {},
        setHeader(name, value) { this.header[name] = value; },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
        send(data) {
            this.body = data;
            return this;
        },
    };
    return res;
};

const ADMIN_ID = new mongoose.Types.ObjectId().toString();
const TL_A_ID = new mongoose.Types.ObjectId().toString();
const TL_B_ID = new mongoose.Types.ObjectId().toString();

const MOCK_USERS = [
    { _id: new mongoose.Types.ObjectId(ADMIN_ID), fullName: 'Admin', email: 'admin@portal.com', role: 'admin', domain: 'IT', internshipDetails: { status: 'completed' } },
    { _id: new mongoose.Types.ObjectId(TL_A_ID), fullName: 'TL Alpha', email: 'tla@portal.com', role: 'teamleader', domain: 'IT' },
    { _id: new mongoose.Types.ObjectId(TL_B_ID), fullName: 'TL Beta', email: 'tlb@portal.com', role: 'teamleader', domain: 'Engineering' },
    {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Intern One',
        email: 'intern1@portal.com',
        internCode: 'INT001',
        domain: 'Web Development',
        role: 'intern',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        internshipDetails: { teamLeader: new mongoose.Types.ObjectId(TL_A_ID), teamleaderEmail: 'tla@portal.com', status: 'ongoing', mentor: 'M1' },
    },
    {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Intern Two',
        email: 'intern2@portal.com',
        internCode: 'INT002',
        domain: 'Web Development',
        role: 'intern',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-08-31'),
        internshipDetails: { teamLeader: new mongoose.Types.ObjectId(TL_B_ID), teamleaderEmail: 'tlb@portal.com', status: 'upcoming', mentor: 'M2' },
    },
    {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Intern Three',
        email: 'intern3@portal.com',
        internCode: 'INT003',
        domain: 'Data Science',
        role: 'intern',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-09-30'),
        internshipDetails: { teamLeader: new mongoose.Types.ObjectId(TL_A_ID), teamleaderEmail: 'tla@portal.com', status: 'completed', mentor: 'M3' },
    },
];

const MOCK_REQUESTS = [
    {
        _id: new mongoose.Types.ObjectId(),
        requestNumber: 'REQ-001',
        userId: MOCK_USERS[3]._id,
        internCode: 'INT001',
        certificateType: 'completion_certificate',
        status: 'completed',
        requestedAt: new Date('2026-05-01'),
        forwardedAt: new Date('2026-05-02'),
        reviewedAt: new Date('2026-05-04'),
        reviewedBy: new mongoose.Types.ObjectId(ADMIN_ID),
        certificateId: new mongoose.Types.ObjectId(),
    },
    {
        _id: new mongoose.Types.ObjectId(),
        requestNumber: 'REQ-002',
        userId: MOCK_USERS[3]._id,
        internCode: 'INT001',
        certificateType: 'bonafide',
        status: 'pending',
        requestedAt: new Date('2026-05-10'),
        forwardedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        certificateId: null,
    },
    {
        _id: new mongoose.Types.ObjectId(),
        requestNumber: 'REQ-003',
        userId: MOCK_USERS[4]._id,
        internCode: 'INT002',
        certificateType: 'experience_letter',
        status: 'processing',
        requestedAt: new Date('2026-05-05'),
        forwardedAt: new Date('2026-05-06'),
        reviewedAt: null,
        reviewedBy: null,
        certificateId: null,
    },
    {
        _id: new mongoose.Types.ObjectId(),
        requestNumber: 'REQ-004',
        userId: MOCK_USERS[5]._id,
        internCode: 'INT003',
        certificateType: 'completion_certificate',
        status: 'completed',
        requestedAt: new Date('2026-04-01'),
        forwardedAt: new Date('2026-04-03'),
        reviewedAt: new Date('2026-04-05'),
        reviewedBy: new mongoose.Types.ObjectId(ADMIN_ID),
        certificateId: new mongoose.Types.ObjectId(),
    },
    {
        _id: new mongoose.Types.ObjectId(),
        requestNumber: 'REQ-005',
        userId: MOCK_USERS[4]._id,
        internCode: 'INT002',
        certificateType: 'bonafide',
        status: 'rejected',
        requestedAt: new Date('2026-05-15'),
        forwardedAt: new Date('2026-05-16'),
        reviewedAt: new Date('2026-05-17'),
        reviewedBy: new mongoose.Types.ObjectId(ADMIN_ID),
        certificateId: null,
        rejectionReason: 'Duplicate request',
    },
];

const MOCK_CERTIFICATES = [
    {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'CERT-2026-001',
        userId: MOCK_USERS[3]._id,
        internCode: 'INT001',
        certificateType: 'completion_certificate',
        domain: 'Web Development',
        issuedDate: new Date('2026-05-04'),
        status: 'finalized',
        verificationCode: 'VER-001',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'CERT-2026-002',
        userId: MOCK_USERS[5]._id,
        internCode: 'INT003',
        certificateType: 'completion_certificate',
        domain: 'Data Science',
        issuedDate: new Date('2026-04-05'),
        status: 'finalized',
        verificationCode: 'VER-002',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'CERT-2026-003',
        userId: MOCK_USERS[3]._id,
        internCode: 'INT001',
        certificateType: 'bonafide',
        domain: 'Web Development',
        issuedDate: new Date('2026-03-15'),
        status: 'finalized',
        verificationCode: 'VER-003',
    },
];

test('Analytics Test Suite', async (t) => {

    await t.test('getOverview returns correct KPI counts', async () => {
        const userAggregatedResponse = {
            internsByStatus: [
                { _id: 'ongoing', count: 1 },
                { _id: 'upcoming', count: 1 },
                { _id: 'completed', count: 1 },
                { _id: 'cancelled', count: 0 },
            ],
            teamLeaders: [{ count: 2 }],
        };

        const requestAggregatedResponse = {
            requests: [{ total: 5, pending: 1, approved: 0, processing: 1, completed: 2, rejected: 1, cancelled: 0 }],
            requestsThisMonth: [{ count: 5 }],
            certificatesThisMonth: [{ count: 3 }],
            approvedRequests: [],
            rejectedRequests: [{ count: 1 }],
        };

        const userFindByIdOriginal = User.findById;
        const userFindOriginal = User.find;
        const userCountDocumentsOriginal = User.countDocuments;
        const userAggregateOriginal = User.aggregate;
        const certRequestAggregateOriginal = CertificateRequest.aggregate;
        const certAggregateOriginal = Certificate.aggregate;
        const certFindOriginal = Certificate.find;

        User.findById = userFindByIdOriginal;
        User.find = userFindOriginal;
        User.countDocuments = userCountDocumentsOriginal;
        User.aggregate = () => Promise.resolve([userAggregatedResponse]);
        CertificateRequest.aggregate = () => Promise.resolve([requestAggregatedResponse]);
        Certificate.aggregate = certAggregateOriginal;
        Certificate.find = certFindOriginal;

        try {
            const req = { query: {} };
            const res = mockRes();

            await getOverview(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(res.body.overview);
            assert.equal(res.body.overview.totalInterns, 3);
            assert.equal(res.body.overview.activeInterns, 1);
            assert.equal(res.body.overview.upcomingInterns, 1);
            assert.equal(res.body.overview.completedInterns, 1);
            assert.equal(res.body.overview.totalTeamLeaders, 2);
            assert.equal(res.body.overview.pendingRequests, 1);
            assert.equal(res.body.overview.requestsThisMonth, 5);
            assert.equal(res.body.overview.certificatesIssuedThisMonth, 3);
            assert.equal(res.body.overview.approvalRate, 0);
            assert.equal(res.body.overview.rejectionRate, 100);
            assert.ok(res.body.overview.requestsByStatus);
            assert.equal(res.body.overview.requestsByStatus.completed, 2);
        } finally {
            User.aggregate = userAggregateOriginal;
            CertificateRequest.aggregate = certRequestAggregateOriginal;
        }
    });

    await t.test('getRequestsTrend returns labels and series split by status', async () => {
        const trendResults = [
            { _id: { status: 'completed', period: new Date('2026-05-01') }, count: 2 },
            { _id: { status: 'pending', period: new Date('2026-05-01') }, count: 1 },
            { _id: { status: 'completed', period: new Date('2026-04-01') }, count: 1 },
        ];

        const originalAggregate = CertificateRequest.aggregate;
        CertificateRequest.aggregate = () => Promise.resolve(trendResults);

        try {
            const req = { query: { range: '6m', groupBy: 'month' } };
            const res = mockRes();

            await getRequestsTrend(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(Array.isArray(res.body.labels));
            assert.ok(Array.isArray(res.body.series));
            assert.ok(res.body.labels.length > 0);
            const completed = res.body.series.find((s) => s.status === 'completed');
            assert.ok(completed);
            assert.equal(completed.data.length, res.body.labels.length);
        } finally {
            CertificateRequest.aggregate = originalAggregate;
        }
    });

    await t.test('getCertificateTypes returns labels and counts', async () => {
        const typeResults = [
            { _id: 'completion_certificate', count: 2 },
            { _id: 'bonafide', count: 1 },
        ];

        const originalAggregate = Certificate.aggregate;
        Certificate.aggregate = (pipeline) => {
            return Promise.resolve(typeResults);
        };

        try {
            const req = { query: { range: '6m' } };
            const res = mockRes();

            await getCertificateTypes(req, res);

            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body.labels, ['completion_certificate', 'bonafide']);
            assert.deepEqual(res.body.series, [2, 1]);
            assert.equal(res.body.data[0].certificateType, 'completion_certificate');
            assert.equal(res.body.data[0].count, 2);
        } finally {
            Certificate.aggregate = originalAggregate;
        }
    });

    await t.test('getTurnaround returns average, median, and p90', async () => {
        const originalFind = CertificateRequest.find;
        CertificateRequest.find = () => ({
            lean: () => Promise.resolve([
                {
                    _id: MOCK_REQUESTS[0]._id,
                    requestedAt: new Date('2026-05-01'),
                    forwardedAt: new Date('2026-05-02'),
                    reviewedAt: new Date('2026-05-04'),
                    status: 'approved',
                },
                {
                    _id: MOCK_REQUESTS[3]._id,
                    requestedAt: new Date('2026-04-01'),
                    forwardedAt: new Date('2026-04-03'),
                    reviewedAt: new Date('2026-04-05'),
                    status: 'approved',
                },
                {
                    _id: MOCK_REQUESTS[4]._id,
                    requestedAt: new Date('2026-05-15'),
                    forwardedAt: new Date('2026-05-16'),
                    reviewedAt: new Date('2026-05-17'),
                    status: 'approved',
                },
            ]),
        });

        try {
            const req = { query: {} };
            const res = mockRes();

            await getTurnaround(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(res.body.tlReviewTime);
            assert.ok(res.body.adminReviewTime);
            assert.ok(res.body.totalTime);
            assert.equal(res.body.unit, 'days');
            assert.equal(typeof res.body.tlReviewTime.average, 'number');
            assert.equal(typeof res.body.tlReviewTime.median, 'number');
            assert.equal(typeof res.body.tlReviewTime.p90, 'number');
            assert.equal(typeof res.body.tlReviewTime.count, 'number');
            assert.equal(res.body.tlReviewTime.count, 3);
            assert.equal(res.body.adminReviewTime.count, 3);
            assert.equal(res.body.totalTime.count, 3);
        } finally {
            CertificateRequest.find = originalFind;
        }
    });

    await t.test('getTeamLeaders returns per-TL performance table', async () => {
        const tlAggregateResults = [
            {
                status: 'pending',
                forwardedAt: null,
                reviewedAt: null,
                effectiveTl: new mongoose.Types.ObjectId(TL_A_ID),
                'user.internshipDetails.status': 'ongoing',
                _id: MOCK_REQUESTS[1]._id,
                userId: MOCK_USERS[3]._id,
            },
            {
                status: 'completed',
                forwardedAt: new Date('2026-05-02'),
                reviewedAt: new Date('2026-05-04'),
                effectiveTl: new mongoose.Types.ObjectId(TL_A_ID),
                'user.internshipDetails.status': 'ongoing',
                _id: MOCK_REQUESTS[0]._id,
                userId: MOCK_USERS[3]._id,
            },
            {
                status: 'processing',
                forwardedAt: new Date('2026-05-06'),
                reviewedAt: null,
                effectiveTl: new mongoose.Types.ObjectId(TL_B_ID),
                'user.internshipDetails.status': 'upcoming',
                _id: MOCK_REQUESTS[2]._id,
                userId: MOCK_USERS[4]._id,
            },
            {
                status: 'rejected',
                forwardedAt: new Date('2026-05-16'),
                reviewedAt: new Date('2026-05-17'),
                effectiveTl: new mongoose.Types.ObjectId(TL_B_ID),
                'user.internshipDetails.status': 'upcoming',
                _id: MOCK_REQUESTS[4]._id,
                userId: MOCK_USERS[4]._id,
            },
        ];

        const crAggregateOriginal = CertificateRequest.aggregate;
        const userFindOriginal = User.find;
        const userAggregateOriginal = User.aggregate;
        const crFindOriginal = CertificateRequest.find;

        CertificateRequest.aggregate = () => Promise.resolve(tlAggregateResults);
        User.find = (filter) => {
            if (filter && filter.role === 'teamleader') {
                return { select: () => Promise.resolve(MOCK_USERS.filter((u) => u.role === 'teamleader')) };
            }
            if (filter && filter.role === 'intern') {
                return { select: () => Promise.resolve(MOCK_USERS.filter((u) => u.role === 'intern')) };
            }
            return { select: () => Promise.resolve(MOCK_USERS) };
        };
        User.aggregate = userAggregateOriginal;
        CertificateRequest.find = (filter) => ({
            populate: () => ({ lean: () => Promise.resolve([]) }),
        });

        try {
            const req = { query: { overdueDays: '3' } };
            const res = mockRes();

            await getTeamLeaders(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(Array.isArray(res.body.teamLeaders));
            assert.ok(res.body.teamLeaders.length > 0);
            const tlA = res.body.teamLeaders.find((tl) => tl.fullName === 'TL Alpha');
            assert.ok(tlA);
            assert.equal(tlA.internsAssigned, 2);
            assert.ok(tlA.rejectionRate >= 0);
            assert.ok(Array.isArray(res.body.overdueRequests));
        } finally {
            CertificateRequest.aggregate = crAggregateOriginal;
            User.find = userFindOriginal;
            CertificateRequest.find = crFindOriginal;
        }
    });

    await t.test('getDomains returns interns per domain', async () => {
        const domainResults = [
            { _id: { domain: 'Web Development', status: 'ongoing' }, count: 1 },
            { _id: { domain: 'Web Development', status: 'upcoming' }, count: 1 },
            { _id: { domain: 'Data Science', status: 'completed' }, count: 1 },
        ];

        const originalAggregate = User.aggregate;
        User.aggregate = () => Promise.resolve(domainResults);

        try {
            const req = { query: {} };
            const res = mockRes();

            await getDomains(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(res.body.labels.length > 0);
            assert.ok(res.body.labels.includes('Web Development'));
            assert.ok(res.body.labels.includes('Data Science'));
            const wd = res.body.data.find((d) => d.domain === 'Web Development');
            assert.equal(wd.total, 2);
            assert.equal(wd.ongoing, 1);
            assert.equal(wd.upcoming, 1);
        } finally {
            User.aggregate = originalAggregate;
        }
    });

    await t.test('getPipeline returns stage counts and conversion rate', async () => {
        const pipelineResults = [{
            pending: 1,
            approved: 0,
            processing: 1,
            completed: 2,
            rejected: 1,
            cancelled: 0,
        }];

        const crAggregateOriginal = CertificateRequest.aggregate;
        const crCountOriginal = CertificateRequest.countDocuments;

        CertificateRequest.aggregate = () => Promise.resolve(pipelineResults);
        CertificateRequest.countDocuments = () => Promise.resolve(0);

        try {
            const req = { query: {} };
            const res = mockRes();

            await getPipeline(req, res);

            assert.equal(res.statusCode, 200);
            assert.ok(Array.isArray(res.body.stages));
            const pending = res.body.stages.find((s) => s.stage === 'pending');
            const processing = res.body.stages.find((s) => s.stage === 'processing');
            const completed = res.body.stages.find((s) => s.stage === 'completed');
            const failed = res.body.stages.find((s) => s.stage === 'failed_gens');
            assert.equal(pending.count, 1);
            assert.equal(processing.count, 1);
            assert.equal(completed.count, 2);
            assert.equal(failed.count, 0);
            assert.ok(res.body.totalRequests >= 0);
            assert.equal(typeof res.body.conversionRate, 'number');
        } finally {
            CertificateRequest.aggregate = crAggregateOriginal;
            CertificateRequest.countDocuments = crCountOriginal;
        }
    });

    await t.test('exportAnalytics returns CSV for overview type', async () => {
        const userAggregatedResponse = {
            internsByStatus: [
                { _id: 'ongoing', count: 1 },
                { _id: 'completed', count: 2 },
            ],
            teamLeaders: [{ count: 3 }],
        };

        const requestAggregatedResponse = {
            requests: [{ total: 3, pending: 1, approved: 0, processing: 1, completed: 1, rejected: 0, cancelled: 0 }],
            requestsThisMonth: [{ count: 3 }],
            certificatesThisMonth: [{ count: 2 }],
            approvedRequests: [],
            rejectedRequests: [],
        };

        const crAggregateOriginal = CertificateRequest.aggregate;
        const auditCreateOriginal = AuditLog.create;
        const userAggregateOriginal = User.aggregate;

        User.aggregate = () => Promise.resolve([userAggregatedResponse]);
        CertificateRequest.aggregate = () => Promise.resolve([requestAggregatedResponse]);
        AuditLog.create = () => Promise.resolve({ _id: new mongoose.Types.ObjectId() });

        try {
            const req = {
                query: { type: 'overview' },
                user: { id: ADMIN_ID, role: 'admin' },
                headers: { 'user-agent': 'test', 'x-forwarded-for': '127.0.0.1' },
                ip: '127.0.0.1',
            };
            const res = mockRes();

            await exportAnalytics(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.header['Content-Type'], 'text/csv');
            assert.ok(res.body.includes('Total Interns'));
            assert.ok(res.body.includes('Team Leaders'));
            assert.ok(res.body.includes('Approval Rate'));
        } finally {
            User.aggregate = userAggregateOriginal;
            CertificateRequest.aggregate = crAggregateOriginal;
            AuditLog.create = auditCreateOriginal;
        }
    });

    await t.test('exportAnalytics rejects invalid type', async () => {
        const req = {
            query: { type: 'invalid_type' },
            user: { id: ADMIN_ID, role: 'admin' },
            headers: {},
            ip: '127.0.0.1',
        };
        const res = mockRes();

        await exportAnalytics(req, res);

        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /type must be one/i);
    });
});
