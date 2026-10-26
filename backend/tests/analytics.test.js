import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { validationResult } from 'express-validator';
import { analyticsQueryValidator } from '../src/validators/adminAnalytics.validator.js';
import {
  calculatePercentiles,
  getCertificateTypes,
  getOverviewKPIs,
  getPipelineStages,
  getRequestsTrend,
  getTeamLeadersPerformance,
  getTurnaroundStats,
  getUpcomingCompletions
} from '../src/services/adminAnalytics.service.js';
import {
  getOverview,
  getTrend,
  getTypes,
  getTurnaround,
  getTeamLeaders,
  getDomains,
  getPipeline,
  getUpcoming,
  getStuck,
  exportAnalyticsCSV,
  buildAnalyticsCacheKey,
  rowsToCsv
} from '../src/controllers/adminAnalytics.controller.js';
import app from '../src/app.js';

// Models
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    sentContent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    send(content) {
      this.sentContent = content;
      return this;
    }
  };
  return res;
};

test('Admin Analytics Controller Tests', async (t) => {
  const adminId = new mongoose.Types.ObjectId().toString();

  await t.test('analytics cache keys separate date, domain, Team Leader, and grouping filters', () => {
    const base = { range: '30d', from: '2026-09-01', to: '2026-09-30', groupBy: 'day', domain: 'Data Science', teamLeader: adminId };
    const key = buildAnalyticsCacheKey('trend', base);
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, domain: 'Web Development' }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, teamLeader: new mongoose.Types.ObjectId().toString() }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, from: '2026-08-01' }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, groupBy: 'week' }));
  });

  await t.test('analytics routes reject requests without authentication', async () => {
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/api/admin/analytics/overview`);
      assert.equal(response.status, 401);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  await t.test('GET /overview should return KPI metrics shape', async () => {
    // Stub Mongo queries
    const origUserCount = User.countDocuments;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origUserFind = User.find;
    const origUserDistinct = User.distinct;

    User.countDocuments = async () => 10;
    User.distinct = async () => [];
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 5;
    Certificate.countDocuments = async () => 2;
    CertificateRequest.find = () => ({
      select: async () => [
        { requestedAt: new Date(Date.now() - 3600000 * 5), updatedAt: new Date() }
      ]
    });

    const req = { query: { range: '30d' } };
    const res = mockRes();

    await getOverview(req, res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.kpis);
    assert.equal(res.body.data.kpis.totalInterns, 10);

    User.countDocuments = origUserCount;
    User.distinct = origUserDistinct;
    User.find = origUserFind;
    CertificateRequest.countDocuments = origCertReqCount;
    Certificate.countDocuments = origCertCount;
    CertificateRequest.find = origCertReqFind;
  });

  await t.test('request trend applies custom date, domain, and Team Leader scope in Mongo match', async () => {
    const origUserFind = User.find;
    const origAggregate = CertificateRequest.aggregate;
    const leaderId = new mongoose.Types.ObjectId();
    const internId = new mongoose.Types.ObjectId();
    let internQuery;
    let requestMatch;

    User.find = (query) => {
      internQuery = query;
      return { select: async () => [{ _id: internId }] };
    };
    CertificateRequest.aggregate = async (pipeline) => {
      requestMatch = pipeline[0].$match;
      return [];
    };

    try {
      await getRequestsTrend({
        from: '2026-09-01', to: '2026-09-30', range: 'custom',
        domain: 'Data Science', teamLeader: leaderId.toString(), groupBy: 'week'
      });
      assert.equal(internQuery.domain, 'Data Science');
      assert.deepEqual(internQuery.$or, [
        { 'internshipDetails.teamLeaderId': leaderId.toString() },
        { 'internshipDetails.teamLeaderId': { $in: [null] }, 'internshipDetails.teamLeader': leaderId.toString() }
      ]);
      assert.deepEqual(requestMatch.userId.$in, [internId]);
      assert.equal(requestMatch.requestedAt.$gte.toISOString(), '2026-09-01T00:00:00.000Z');
      assert.equal(requestMatch.requestedAt.$lte.toISOString(), '2026-09-30T23:59:59.999Z');
    } finally {
      User.find = origUserFind;
      CertificateRequest.aggregate = origAggregate;
    }
  });

  await t.test('date validator rejects a reversed range and incomplete custom range', async () => {
    const validateQuery = async (query) => {
      const req = { query, body: {}, params: {} };
      let finish;
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json() { finish?.(); return this; }
      };
      for (const middleware of analyticsQueryValidator) {
        await new Promise((resolve) => {
          finish = resolve;
          middleware(req, res, resolve);
        });
      }
      return res.statusCode === 200 ? [] : validationResult(req).array();
    };

    assert.ok((await validateQuery({ from: '2026-09-20', to: '2026-09-01' })).length > 0);
    assert.ok((await validateQuery({ range: 'custom', from: '2026-09-01' })).length > 0);
    assert.equal((await validateQuery({ from: '2026-09-01', to: '2026-09-30', range: 'custom' })).length, 0);
  });

  await t.test('GET /requests-trend should return labels and series', async () => {
    const origAggregate = CertificateRequest.aggregate;
    const origUserFind = User.find;
    User.find = () => ({ select: async () => [] });
    CertificateRequest.aggregate = async () => [
      { _id: { period: '2026-01', status: 'pending' }, count: 3 },
      { _id: { period: '2026-01', status: 'completed' }, count: 5 }
    ];

    const req = { query: { groupBy: 'month' } };
    const res = mockRes();

    await getTrend(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.labels));
    assert.ok(Array.isArray(res.body.data.series));
    assert.deepEqual(res.body.data.raw, [{ period: '2026-01', pending: 3, approved: 0, rejected: 0, processing: 0, completed: 5, cancelled: 0, total: 8 }]);
    assert.equal(res.body.data.series.find((series) => series.status === 'pending').data[0], 3);
    assert.equal(res.body.data.series.find((series) => series.status === 'completed').data[0], 5);

    CertificateRequest.aggregate = origAggregate;
    User.find = origUserFind;
  });

  await t.test('turnaround uses scoped facet durations and returns known seeded-style statistics', async () => {
    const origFind = CertificateRequest.find;
    const origCertificateFind = Certificate.find;
    const origUserFind = User.find;
    const internId = new mongoose.Types.ObjectId();
    const certificateId = new mongoose.Types.ObjectId();
    User.find = () => ({ select: async () => [{ _id: internId }] });
    CertificateRequest.find = () => ({ select: () => ({ lean: async () => [
      { requestedAt: new Date('2026-01-01T00:00:00Z'), forwardedAt: new Date('2026-01-01T03:00:00Z'), reviewedAt: new Date('2026-01-01T05:00:00Z'), status: 'completed', certificateId }
    ] }) });
    Certificate.find = () => ({ select: () => ({ lean: async () => [{ _id: certificateId, finalizedAt: new Date('2026-01-01T07:00:00Z'), status: 'finalized' }] }) });
    try {
      const result = await getTurnaroundStats({ range: '30d', domain: 'Data Science' });
      assert.equal(result.tlDecisionTime.avg, 3);
      assert.equal(result.adminDecisionTime.avg, 2);
      assert.equal(result.generationTime.avg, 2);
      assert.equal(result.totalTurnaround.avg, 7);
    } finally {
      CertificateRequest.find = origFind;
      Certificate.find = origCertificateFind;
      User.find = origUserFind;
    }
  });

  await t.test('GET /team-leaders should return team leader metrics list', async () => {
    const tlId = new mongoose.Types.ObjectId();
    const origUserFind = User.find;
    const origUserDistinct = User.distinct;
    const origUserCount = User.countDocuments;
    const origCertReqFind = CertificateRequest.find;

    User.find = (query) => {
      if (query.role === 'teamleader') {
        return {
          select: () => ({ lean: async () => [ { _id: tlId, fullName: 'TL One' } ] })
        };
      }
      if (!query._id?.$in) return { select: async () => [] };
      return { select: () => ({ lean: async () => [] }) };
    };
    User.distinct = async () => [tlId];

    User.countDocuments = async () => 4;
    CertificateRequest.find = () => ({ select: () => ({ lean: async () => [] }) });

    const req = { query: {} };
    const res = mockRes();

    await getTeamLeaders(req, res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data[0].fullName, 'TL One');

    User.find = origUserFind;
    User.distinct = origUserDistinct;
    User.countDocuments = origUserCount;
    CertificateRequest.find = origCertReqFind;
  });

  await t.test('overview uses exact decision rates and calendar-month KPI windows', async () => {
    const originals = {
      userCount: User.countDocuments,
      userFind: User.find,
      requestCount: CertificateRequest.countDocuments,
      requestFind: CertificateRequest.find,
      certificateCount: Certificate.countDocuments
    };
    const internId = new mongoose.Types.ObjectId();
    let pendingQuery;
    User.find = () => ({ select: async () => [{ _id: internId }] });
    User.countDocuments = async (query) => {
      if (query['internshipDetails.status'] === 'ongoing' && query.isArchived) return 3;
      if (query['internshipDetails.status'] === 'ongoing') return 4;
      if (query.role === 'teamleader') return 1;
      return 59;
    };
    CertificateRequest.countDocuments = async (query) => {
      if (query.status === 'pending') { pendingQuery = query; return 11; }
      if (query.status === 'approved') return 2;
      if (query.status === 'processing') return 3;
      if (Array.isArray(query.status?.$in)) return 7;
      if (query.status === 'rejected') return 3;
      return query.requestedAt.$gte.getUTCMonth() === new Date().getUTCMonth() ? 9 : 6;
    };
    Certificate.countDocuments = async (query) => query.$or[0].finalizedAt.$gte.getUTCMonth() === new Date().getUTCMonth() ? 5 : 2;
    CertificateRequest.find = () => ({ select: async () => [] });
    try {
      const result = await getOverviewKPIs({ range: '7d' });
      assert.equal(result.kpis.totalInterns, 59);
      assert.equal(result.kpis.activeInterns, 3);
      assert.equal(result.kpis.pendingRequests, 11);
      assert.equal(result.kpis.requestsThisMonth, 9);
      assert.equal(result.kpis.certificatesIssuedThisMonth, 5);
      assert.equal(result.kpis.approvalRate, 70);
      assert.equal(result.kpis.rejectionRate, 30);
      assert.equal(pendingQuery.requestedAt, undefined);
    } finally {
      User.countDocuments = originals.userCount;
      User.find = originals.userFind;
      CertificateRequest.countDocuments = originals.requestCount;
      CertificateRequest.find = originals.requestFind;
      Certificate.countDocuments = originals.certificateCount;
    }
  });

  await t.test('certificate type report groups issued certificates without joining requests', async () => {
    const origUserFind = User.find;
    const origCertificateAggregate = Certificate.aggregate;
    const origRequestAggregate = CertificateRequest.aggregate;
    const internId = new mongoose.Types.ObjectId();
    let pipeline;
    User.find = () => ({ select: async () => [{ _id: internId }] });
    Certificate.aggregate = async (value) => {
      pipeline = value;
      return [{ _id: 'bonafide', count: 2 }, { _id: 'completion_certificate', count: 1 }];
    };
    CertificateRequest.aggregate = async () => { throw new Error('Request records must not drive certificate counts'); };
    try {
      const result = await getCertificateTypes({ range: '30d', domain: 'Engineering' });
      assert.equal(pipeline[0].$match.userId.$in[0], internId);
      assert.deepEqual(pipeline.at(-2).$group, { _id: '$certificateType', count: { $sum: 1 } });
      assert.equal(result.total, 3);
      assert.equal(result.breakdown[0].percentage, 66.7);
    } finally {
      User.find = origUserFind;
      Certificate.aggregate = origCertificateAggregate;
      CertificateRequest.aggregate = origRequestAggregate;
    }
  });

  await t.test('pipeline separates TL rejection, Admin rejection, draft and failed generation', async () => {
    const originals = {
      userFind: User.find,
      requestAggregate: CertificateRequest.aggregate,
      requestFind: CertificateRequest.find,
      requestCount: CertificateRequest.countDocuments,
      certificateFind: Certificate.find
    };
    const draftId = new mongoose.Types.ObjectId();
    const issuedId = new mongoose.Types.ObjectId();
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.aggregate = async () => [
      { _id: 'pending', count: 2 }, { _id: 'processing', count: 3 },
      { _id: 'approved', count: 4 }, { _id: 'completed', count: 1 }
    ];
    CertificateRequest.find = () => ({ select: async () => [
      { _id: 'no-link', reviewedAt: new Date(Date.now() - 7200000), updatedAt: new Date(Date.now() - 7200000) },
      { _id: 'draft-link', certificateId: draftId, reviewedAt: new Date(Date.now() - 7200000) },
      { _id: 'issued-link', certificateId: issuedId, reviewedAt: new Date(Date.now() - 7200000) }
    ] });
    CertificateRequest.countDocuments = async (query) => query.forwardedAt?.$ne === null ? 1 : 2;
    Certificate.find = () => ({ select: async () => [
      { _id: draftId, status: 'draft' }, { _id: issuedId, status: 'finalized' }
    ] });
    try {
      const result = await getPipelineStages({ range: '30d' });
      assert.equal(result.pipeline.find((stage) => stage.status === 'pending').count, 2);
      assert.equal(result.pipeline.find((stage) => stage.status === 'processing').count, 3);
      assert.equal(result.pipeline.find((stage) => stage.stage === 'Awaiting finalization').count, 1);
      assert.equal(result.pipeline.find((stage) => stage.stage === 'Rejected by Team Leader').count, 2);
      assert.equal(result.pipeline.find((stage) => stage.stage === 'Rejected by Admin').count, 1);
      assert.equal(result.failedGenerations, 2);
    } finally {
      User.find = originals.userFind;
      CertificateRequest.aggregate = originals.requestAggregate;
      CertificateRequest.find = originals.requestFind;
      CertificateRequest.countDocuments = originals.requestCount;
      Certificate.find = originals.certificateFind;
    }
  });

  await t.test('team leader metrics batch-load assignments and include TL rejection timing', async () => {
    const originals = { userFind: User.find, userDistinct: User.distinct, requestFind: CertificateRequest.find };
    const leaderId = new mongoose.Types.ObjectId();
    const internId = new mongoose.Types.ObjectId();
    const now = Date.now();
    let userFindCalls = 0;
    let requestFindCalls = 0;
    User.distinct = async (field) => field.endsWith('teamLeaderId') ? [leaderId] : [];
    User.find = (query) => {
      userFindCalls += 1;
      if (query.role === 'teamleader') return { select: () => ({ lean: async () => [{ _id: leaderId, fullName: 'TL One', email: 'private@example.test' }] }) };
      if (query._id?.$in) return { select: () => ({ lean: async () => [{ _id: internId, internshipDetails: { teamLeaderId: leaderId }, isArchived: false }] }) };
      return { select: async () => [{ _id: internId }] };
    };
    CertificateRequest.find = () => {
      requestFindCalls += 1;
      return { select: () => ({ lean: async () => [
        { userId: internId, status: 'rejected', requestedAt: new Date(now - 10 * 3600000), reviewedAt: new Date(now - 8 * 3600000) },
        { userId: internId, status: 'processing', requestedAt: new Date(now - 8 * 3600000), forwardedAt: new Date(now - 4 * 3600000) },
        { userId: internId, status: 'pending', requestedAt: new Date(now - 4 * 86400000) }
      ] }) };
    };
    try {
      const [leader] = await getTeamLeadersPerformance({ range: '30d' });
      assert.equal(leader.internsAssigned, 1);
      assert.equal(leader.requestsReceived, 3);
      assert.equal(leader.requestsForwarded, 1);
      assert.equal(leader.requestsRejected, 1);
      assert.equal(leader.avgReviewTimeHours, 3);
      assert.equal(leader.rejectionRate, 50);
      assert.equal(leader.hasOverdueRequests, true);
      assert.equal('email' in leader, false);
      assert.equal(userFindCalls, 3);
      assert.equal(requestFindCalls, 1);
    } finally {
      User.find = originals.userFind;
      User.distinct = originals.userDistinct;
      CertificateRequest.find = originals.requestFind;
    }
  });

  await t.test('upcoming completions check each completion request type in one batch', async () => {
    const originals = { userFind: User.find, requestFind: CertificateRequest.find };
    const firstId = new mongoose.Types.ObjectId();
    const secondId = new mongoose.Types.ObjectId();
    let requestFilter;
    let requestCalls = 0;
    User.find = () => ({
      select: () => ({ populate: () => ({ populate: () => ({ lean: async () => [
        { _id: firstId, fullName: 'Intern One', endDate: new Date(Date.now() + 2 * 86400000), internshipDetails: { teamLeader: null } },
        { _id: secondId, fullName: 'Intern Two', endDate: new Date(Date.now() + 8 * 86400000), internshipDetails: { teamLeader: null } }
      ] }) }) })
    });
    CertificateRequest.find = (query) => {
      requestCalls += 1;
      requestFilter = query;
      return { select: () => ({ sort: () => ({ lean: async () => [
        { userId: firstId, status: 'pending', requestNumber: 'CERT-1' }
      ] }) }) };
    };
    try {
      const results = await getUpcomingCompletions(30, { domain: 'Engineering' });
      assert.equal(requestCalls, 1);
      assert.deepEqual(requestFilter.certificateType.$in, ['completion_certificate', 'internship_completion_certificate']);
      assert.equal(results[0].completionWindow, 'next-7-days');
      assert.equal(results[0].hasRequestedCertificate, true);
      assert.equal(results[1].completionWindow, 'next-30-days');
      assert.equal(results[1].hasRequestedCertificate, false);
      assert.equal('email' in results[0], false);
    } finally {
      User.find = originals.userFind;
      CertificateRequest.find = originals.requestFind;
    }
  });

  await t.test('percentiles use linear interpolation and CSV neutralizes formulas', () => {
    assert.deepEqual(calculatePercentiles([1, 2, 3, 4]), { avg: 2.5, median: 2.5, p90: 3.7 });
    const csv = rowsToCsv([{ value: '=1+1', note: 'quote " me' }, { value: '+cmd', note: '@name' }, { value: '-2', note: '\tSUM(A1:A2)' }]);
    assert.match(csv, /"'=1\+1"/);
    assert.match(csv, /"'\+cmd"/);
    assert.match(csv, /"'-2"/);
    assert.match(csv, /"'\tSUM\(A1:A2\)"/);
    assert.match(csv, /quote "" me/);
  });

  await t.test('GET /export should generate CSV and log to AuditLog', async () => {
    const origUserCount = User.countDocuments;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origUserFind = User.find;
    const origAuditCreate = AuditLog.create;
    const origReadyState = mongoose.connection.readyState;

    User.countDocuments = async () => 10;
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 5;
    Certificate.countDocuments = async () => 2;
    CertificateRequest.find = () => ({ select: async () => [] });

    let auditLogged = false;
    AuditLog.create = async (doc) => {
      auditLogged = true;
      assert.equal(doc.action, 'EXPORT');
      return doc;
    };
    mongoose.connection.readyState = 1;

    const req = { user: { id: adminId }, query: { type: 'overview' } };
    const res = mockRes();

    await exportAnalyticsCSV(req, res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.match(res.headers['Content-Type'], /^text\/csv/);
    assert.ok(res.sentContent.includes('totalInterns'));
    assert.equal(auditLogged, true);

    User.countDocuments = origUserCount;
    User.find = origUserFind;
    CertificateRequest.countDocuments = origCertReqCount;
    Certificate.countDocuments = origCertCount;
    CertificateRequest.find = origCertReqFind;
    AuditLog.create = origAuditCreate;
    mongoose.connection.readyState = origReadyState;
  });

  await t.test('GET /export?format=xlsx creates a workbook and logs its format', async () => {
    const origUserCount = User.countDocuments;
    const origUserFind = User.find;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origAuditCreate = AuditLog.create;
    const origReadyState = mongoose.connection.readyState;
    let auditFormat;

    User.countDocuments = async () => 1;
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 0;
    Certificate.countDocuments = async () => 0;
    CertificateRequest.find = () => ({ select: async () => [] });
    AuditLog.create = async (doc) => { auditFormat = JSON.parse(doc.description).format; return doc; };
    mongoose.connection.readyState = 1;

    try {
      const req = { user: { id: adminId }, query: { type: 'overview', format: 'xlsx', range: '30d' } };
      const res = mockRes();
      await exportAnalyticsCSV(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      assert.match(res.headers['Content-Disposition'], /\.xlsx/);
      assert.ok(Buffer.isBuffer(res.sentContent));
      const workbook = XLSX.read(res.sentContent, { type: 'buffer' });
      assert.ok(workbook.SheetNames.includes('overview'));
      assert.equal(auditFormat, 'xlsx');
    } finally {
      User.countDocuments = origUserCount;
      User.find = origUserFind;
      CertificateRequest.countDocuments = origCertReqCount;
      Certificate.countDocuments = origCertCount;
      CertificateRequest.find = origCertReqFind;
      AuditLog.create = origAuditCreate;
      mongoose.connection.readyState = origReadyState;
    }
  });
});
