import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Certificate from '../src/models/Certificate.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import { getDomainsDistribution, getFilteredRequests, getStuckRequests } from '../src/services/adminAnalytics.service.js';
import { buildAnalyticsCacheKey } from '../src/controllers/adminAnalytics.controller.js';
import { getAnalyticsCacheVersion, getCache, invalidateAnalyticsCache, setCache } from '../src/utils/redisCache.js';
import { analyticsQueryValidator } from '../src/validators/adminAnalytics.validator.js';
import { validationResult } from 'express-validator';

test('analytics uses the repository Mongoose schemas and persisted status enums', () => {
  assert.deepEqual(CertificateRequest.schema.path('status').enumValues,
    ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled']);
  assert.deepEqual(Certificate.schema.path('status').enumValues,
    ['draft', 'finalized', 'generated', 'issued', 'revoked', 'expired']);
  assert.equal(CertificateRequest.schema.path('userId').options.ref, 'user');
  assert.equal(CertificateRequest.schema.path('certificateId').options.ref, 'certificate');
  assert.equal(Certificate.schema.path('userId').options.ref, 'user');
  assert.equal(User.schema.path('internshipDetails.teamLeaderId').options.ref, 'user');
  assert.equal(User.schema.path('internshipDetails.teamLeader').options.ref, 'user');
  assert.equal(User.schema.path('internshipDetails.teamleaderEmail').instance, 'String');
});

test('domain report scopes intern and issued certificate aggregates to selected leader and domain', async () => {
  const originals = { userFind: User.find, userAggregate: User.aggregate, certificateAggregate: Certificate.aggregate };
  const leaderId = new mongoose.Types.ObjectId();
  const internId = new mongoose.Types.ObjectId();
  let internQuery;
  let userPipeline;
  let certificatePipeline;
  User.find = (query) => { internQuery = query; return { select: async () => [{ _id: internId }] }; };
  User.aggregate = async (pipeline) => { userPipeline = pipeline; return [{ _id: 'Engineering', totalInterns: 1, activeInterns: 1 }]; };
  Certificate.aggregate = async (pipeline) => { certificatePipeline = pipeline; return [{ _id: 'Engineering', certificatesCount: 2 }]; };
  try {
    const result = await getDomainsDistribution({ from: '2026-09-01', to: '2026-09-30', domain: 'Engineering', teamLeaderId: leaderId.toString() });
    assert.equal(internQuery.domain, 'Engineering');
    assert.deepEqual(internQuery.$or, [
      { 'internshipDetails.teamLeaderId': leaderId.toString() },
      { 'internshipDetails.teamLeaderId': { $in: [null] }, 'internshipDetails.teamLeader': leaderId.toString() }
    ]);
    assert.deepEqual(userPipeline[0].$match._id.$in, [internId]);
    assert.deepEqual(certificatePipeline[0].$match.status.$in, ['issued', 'finalized']);
    assert.deepEqual(certificatePipeline[0].$match.userId.$in, [internId]);
    assert.equal(result.domains[0].certificatesCount, 2);
    assert.equal(result.domains[0].activeInterns, 1);
  } finally {
    User.find = originals.userFind;
    User.aggregate = originals.userAggregate;
    Certificate.aggregate = originals.certificateAggregate;
  }
});

test('stuck report maps TL and Admin pending stages from persisted timestamps', async () => {
  const originals = { userFind: User.find, requestFind: CertificateRequest.find };
  const internId = new mongoose.Types.ObjectId();
  const certificateId = new mongoose.Types.ObjectId();
  const now = Date.now();
  const olderThanThreeDays = new Date(now - 5 * 86400000);
  let requestQuery;
  User.find = () => ({ select: async () => [{ _id: internId }] });
  CertificateRequest.find = (query) => {
    requestQuery = query;
    const queryChain = {
      populate() { return this; },
      sort() { return Promise.resolve([
        { _id: new mongoose.Types.ObjectId(), requestNumber: 'R-TL', userId: { fullName: 'TL intern', domain: 'Engineering' }, certificateType: 'bonafide', requestedAt: olderThanThreeDays, status: 'pending', certificateId: null },
        { _id: new mongoose.Types.ObjectId(), requestNumber: 'R-ADMIN', userId: { fullName: 'Admin intern', domain: 'Engineering' }, certificateType: 'completion_certificate', requestedAt: olderThanThreeDays, forwardedAt: olderThanThreeDays, status: 'processing', certificateId: { _id: certificateId } }
      ]); }
    };
    return queryChain;
  };
  try {
    const rows = await getStuckRequests(3, { from: '2026-09-01', to: '2026-09-30', domain: 'Engineering' });
    assert.deepEqual(requestQuery.status.$in, ['pending', 'processing']);
    assert.deepEqual(requestQuery.userId.$in, [internId]);
    assert.equal(requestQuery.requestedAt.$gte.toISOString(), '2026-09-01T00:00:00.000Z');
    assert.equal(requestQuery.$or[0].status, 'pending');
    assert.equal(requestQuery.$or[1].status, 'processing');
    assert.equal(rows[0].stage, 'Team Leader');
    assert.equal(rows[0].reviewLink, 'requests-queue');
    assert.equal(rows[1].stage, 'Admin');
    assert.equal(rows[1].reviewLink, `/admin/certificates/${certificateId}/review`);
    assert.equal('email' in rows[0], false);
  } finally {
    User.find = originals.userFind;
    CertificateRequest.find = originals.requestFind;
  }
});

test('request drill-down applies validated filters, deterministic pagination, and a safe projection', async () => {
  const originals = { userFind: User.find, requestFind: CertificateRequest.find, requestCount: CertificateRequest.countDocuments };
  const leaderId = new mongoose.Types.ObjectId();
  const internId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  let query;
  let skipped;
  let limited;
  User.find = () => ({ select: async () => [{ _id: internId }] });
  CertificateRequest.find = (filter) => {
    query = filter;
    const chain = {
      populate() { return this; },
      sort() { return this; },
      skip(value) { skipped = value; return this; },
      limit(value) { limited = value; return this; },
      lean: async () => [{ _id: requestId, requestNumber: 'R-001', status: 'processing', certificateType: 'bonafide', requestedAt: new Date('2026-09-15T12:00:00Z'), userId: { _id: internId, fullName: 'Fixture Intern', domain: 'Engineering', email: 'private@example.test' } }]
    };
    return chain;
  };
  CertificateRequest.countDocuments = async () => 31;
  try {
    const result = await getFilteredRequests({ status: 'processing', certificateType: 'bonafide', page: 2, limit: 10 }, {
      from: '2026-09-01', to: '2026-09-30', domain: 'Engineering', teamLeaderId: leaderId.toString()
    });
    assert.equal(query.status, 'processing');
    assert.equal(query.certificateType, 'bonafide');
    assert.deepEqual(query.userId.$in, [internId]);
    assert.equal(query.requestedAt.$gte.toISOString(), '2026-09-01T00:00:00.000Z');
    assert.equal(skipped, 10);
    assert.equal(limited, 10);
    assert.equal(result.total, 31);
    assert.equal(result.pages, 4);
    assert.equal(result.requests[0].intern.fullName, 'Fixture Intern');
    assert.equal('email' in result.requests[0].intern, false);
  } finally {
    User.find = originals.userFind;
    CertificateRequest.find = originals.requestFind;
    CertificateRequest.countDocuments = originals.requestCount;
  }
});

test('analytics validators reject malformed IDs, unsupported statuses, grouping, and pagination', async () => {
  const req = { query: { teamLeaderId: 'not-an-object-id', status: 'waiting', groupBy: 'year', page: '0', limit: '1000', range: 'custom', from: '2026-10-02', to: '2026-10-01' }, body: {}, params: {} };
  let finish;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { finish?.(); return this; } };
  for (const middleware of analyticsQueryValidator) {
    await new Promise((resolve) => { finish = resolve; middleware(req, res, resolve); });
  }
  const errors = validationResult(req).array();
  assert.ok(errors.some((error) => error.path === 'teamLeaderId'));
  assert.ok(errors.some((error) => error.path === 'status'));
  assert.ok(errors.some((error) => error.path === 'groupBy'));
  assert.ok(errors.some((error) => error.path === 'page'));
  assert.ok(errors.some((error) => error.path === 'limit'));
  assert.ok(errors.some((error) => error.path === 'to'));
});

test('pipeline rejection stages remain distinct in request drill-down filters and cache keys', async () => {
  const originals = { userFind: User.find, requestFind: CertificateRequest.find, requestCount: CertificateRequest.countDocuments };
  const internId = new mongoose.Types.ObjectId();
  const queries = [];
  User.find = () => ({ select: async () => [{ _id: internId }] });
  CertificateRequest.find = (query) => {
    queries.push(query);
    return {
      populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; },
      lean: async () => []
    };
  };
  CertificateRequest.countDocuments = async () => 0;
  try {
    await getFilteredRequests({ status: 'rejected', reviewStage: 'team-leader' }, { range: 'all' });
    await getFilteredRequests({ status: 'rejected', reviewStage: 'admin' }, { range: 'all' });
    assert.equal(queries[0].status, 'rejected');
    assert.equal(queries[0].forwardedAt, null);
    assert.equal(queries[1].status, 'rejected');
    assert.deepEqual(queries[1].forwardedAt, { $ne: null });
    assert.notEqual(
      buildAnalyticsCacheKey('requests', { range: 'all', reviewStage: 'team-leader' }),
      buildAnalyticsCacheKey('requests', { range: 'all', reviewStage: 'admin' })
    );
  } finally {
    User.find = originals.userFind;
    CertificateRequest.find = originals.requestFind;
    CertificateRequest.countDocuments = originals.requestCount;
  }
});

test('analytics authorization covers every route and rejects non-Admin sessions and invalid filters', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'analytics-audit-test-secret';
  const id = new mongoose.Types.ObjectId().toString();
  User.findById = () => ({ select: async () => ({ role: 'intern' }) });
  const listener = await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  try {
    const base = `http://127.0.0.1:${listener.address().port}/api/admin/analytics`;
    const paths = ['/overview', '/requests-trend', '/certificate-types', '/turnaround', '/team-leaders', '/domains', '/pipeline', '/upcoming-completions', '/stuck', '/stuck-requests', '/requests', '/export'];
    for (const path of paths) {
      const unauthenticated = await fetch(`${base}${path}`);
      assert.equal(unauthenticated.status, 401, `${path} must require authentication`);
      const token = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET);
      const forbidden = await fetch(`${base}${path}`, { headers: { Cookie: `token=${token}` } });
      assert.equal(forbidden.status, 403, `${path} must require the database Admin role`);
    }
    User.findById = () => ({ select: async () => ({ role: 'admin' }) });
    const invalidToken = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET);
    const invalidFilter = await fetch(`${base}/requests?status=not-a-status`, { headers: { Cookie: `token=${invalidToken}` } });
    assert.equal(invalidFilter.status, 400);
  } finally {
    await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    User.findById = originalFindById;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('cache invalidation clears analytics entries and changes cache generation', async () => {
  const key = buildAnalyticsCacheKey('audit-fixture', { range: 'all' });
  const before = getAnalyticsCacheVersion();
  await setCache(key, { fixture: true }, 60);
  assert.deepEqual(await getCache(key), { fixture: true });
  await invalidateAnalyticsCache();
  assert.equal(getAnalyticsCacheVersion(), before + 1);
  assert.equal(await getCache(key), null);
  assert.notEqual(buildAnalyticsCacheKey('audit-fixture', { range: 'all' }), key);
});
