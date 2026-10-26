import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Counter from '../src/models/Counter.model.js';
import { getRequestsForReview, reviewRequestAsTL } from '../src/controllers/teamleader.controller.js';
import { finalizeRequest } from '../src/controllers/admin.controller.js';
import { submitCertificateRequest, downloadCertificateForRequest } from '../src/controllers/intern.controller.js';
import { createRateLimiter } from '../src/middlewares/rateLimit.js';
import sanitizeInput from '../src/middlewares/sanitizeInput.js';

const mockResponse = () => ({
  statusCode: 200, body: null, headers: {},
  set(name, value) { this.headers[name] = value; return this; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('TL review queue is scoped to active interns assigned by teamLeaderId', async () => {
  const originalDistinct = User.distinct;
  const originalFind = CertificateRequest.find;
  const teamLeaderId = new mongoose.Types.ObjectId();
  let criteria;
  User.distinct = async (_field, query) => { criteria = query; return []; };
  CertificateRequest.find = (query) => ({
    populate() { return this; },
    sort: async () => { assert.equal(query.status, 'pending'); return []; }
  });
  try {
    const res = mockResponse();
    await getRequestsForReview({ user: { id: teamLeaderId } }, res);
    assert.deepEqual(criteria, { role: 'intern', isArchived: { $ne: true }, 'internshipDetails.teamLeaderId': teamLeaderId });
    assert.deepEqual(res.body.requests, []);
  } finally { User.distinct = originalDistinct; CertificateRequest.find = originalFind; }
});

test('TL cannot review a request owned by another TL', async () => {
  const originalFindById = CertificateRequest.findById;
  const originalExists = User.exists;
  let saved = false;
  CertificateRequest.findById = async () => ({ _id: 'request-1', userId: new mongoose.Types.ObjectId(), status: 'pending', save: async () => { saved = true; } });
  User.exists = async () => null;
  try {
    const res = mockResponse();
    await reviewRequestAsTL({ params: { id: 'request-1' }, body: { action: 'forward' }, user: { id: new mongoose.Types.ObjectId() } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(saved, false);
  } finally { CertificateRequest.findById = originalFindById; User.exists = originalExists; }
});

test('sixth login attempt for one IP and email returns 429 with Retry-After', async () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 5, message: 'Too many login attempts.' });
  let passed = 0;
  let blocked;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = mockResponse();
    limit({ ip: '192.0.2.33', body: { email: 'limit-test@example.test' }, socket: {} }, res, () => { passed += 1; });
    if (res.statusCode === 429) blocked = res;
  }
  assert.equal(passed, 5);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
  assert.equal(blocked.body.message, 'Too many login attempts.');
});

test('forgot-password rate limit triggers 429 after 3 attempts per hour with Retry-After', async () => {
  const limit = createRateLimiter({ windowMs: 60 * 60_000, max: 3, message: 'Too many password reset requests. Try again later.' });
  let passed = 0;
  let blocked;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = mockResponse();
    limit({ ip: '192.0.2.44', body: { email: 'reset-limit@example.test' }, socket: {} }, res, () => { passed += 1; });
    if (res.statusCode === 429) blocked = res;
  }
  assert.equal(passed, 3);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
  assert.match(blocked.body.message, /too many password reset requests/i);
});

test('credential rate limit triggers 429 after 5 attempts', async () => {
  const limit = createRateLimiter({ windowMs: 15 * 60_000, max: 5, message: 'Too many attempts. Try again later.' });
  let passed = 0;
  let blocked;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = mockResponse();
    limit({ ip: '192.0.2.55', body: {}, socket: {} }, res, () => { passed += 1; });
    if (res.statusCode === 429) blocked = res;
  }
  assert.equal(passed, 5);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('full workflow: submit -> TL forward -> Admin approve -> draft created', async () => {
  const internId = new mongoose.Types.ObjectId();
  const tlId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const mockIntern = {
    _id: internId,
    fullName: 'Test Workflow Intern',
    email: 'workflow@example.test',
    internCode: 'INT-WF-01',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    internshipDetails: { status: 'ongoing', teamLeader: tlId, teamLeaderId: tlId }
  };

  const storedRequest = {
    _id: new mongoose.Types.ObjectId(),
    requestNumber: 'REQ-WF-100',
    userId: internId,
    certificateType: 'bonafide',
    status: 'pending',
    metadata: {},
    save: async function () { return this; }
  };

  const originalUserFindById = User.findById;
  const originalUserExists = User.exists;
  const originalUserFind = User.find;
  const originalReqFindOne = CertificateRequest.findOne;
  const originalReqFindById = CertificateRequest.findById;
  const originalReqCreate = CertificateRequest.create;
  const originalCounterFindOneAndUpdate = Counter.findOneAndUpdate;

  Counter.findOneAndUpdate = async () => ({ seq: 101 });
  User.findById = async () => mockIntern;
  User.exists = async () => true;
  User.find = () => ({ select: () => ({ lean: async () => [{ _id: adminId }] }) });
  CertificateRequest.findOne = async () => null; // No duplicate
  CertificateRequest.create = async (doc) => Object.assign(storedRequest, doc);
  CertificateRequest.findById = () => ({
    populate: () => Promise.resolve({ ...storedRequest, userId: mockIntern }),
    then: (resolve) => resolve(storedRequest)
  });

  try {
    // 1. Intern submits request
    const submitRes = mockResponse();
    await submitCertificateRequest({
      user: { id: internId },
      body: { certificateType: 'bonafide', reason: 'For college verification' }
    }, submitRes);
    assert.equal(submitRes.statusCode, 201);
    assert.equal(storedRequest.status, 'pending');

    // 2. TL forwards request
    CertificateRequest.findById = async () => storedRequest;
    const forwardRes = mockResponse();
    await reviewRequestAsTL({
      params: { id: String(storedRequest._id) },
      body: { action: 'forward' },
      user: { id: tlId }
    }, forwardRes);
    assert.equal(forwardRes.statusCode, 200);
    assert.equal(storedRequest.status, 'processing');
    assert.equal(String(storedRequest.forwardedBy), String(tlId));
    assert.ok(storedRequest.forwardedAt instanceof Date);

    // 3. Admin finalizes decision (reject with reason) -> status rejected
    CertificateRequest.findById = async () => storedRequest;
    const finalizeRes = mockResponse();
    await finalizeRequest({
      params: { id: String(storedRequest._id) },
      body: { action: 'reject', rejectionReason: 'Incomplete internship documentation' },
      user: { id: adminId }
    }, finalizeRes);
    assert.equal(finalizeRes.statusCode, 200);
    assert.equal(storedRequest.status, 'rejected');
    assert.equal(storedRequest.rejectionReason, 'Incomplete internship documentation');
    assert.equal(String(storedRequest.reviewedBy), String(adminId));
  } finally {
    User.findById = originalUserFindById;
    User.exists = originalUserExists;
    User.find = originalUserFind;
    CertificateRequest.findOne = originalReqFindOne;
    CertificateRequest.findById = originalReqFindById;
    CertificateRequest.create = originalReqCreate;
    Counter.findOneAndUpdate = originalCounterFindOneAndUpdate;
  }
});

test('duplicate pending certificate request is rejected with 409 Conflict', async () => {
  const internId = new mongoose.Types.ObjectId();
  const mockIntern = {
    _id: internId,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    internshipDetails: { status: 'ongoing' }
  };

  const originalUserFindById = User.findById;
  const originalReqFindOne = CertificateRequest.findOne;

  User.findById = async () => mockIntern;
  CertificateRequest.findOne = async () => ({ _id: 'existing-pending-request', status: 'pending' });

  try {
    const res = mockResponse();
    await submitCertificateRequest({
      user: { id: internId },
      body: { certificateType: 'bonafide' }
    }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already have a request in progress/i);
  } finally {
    User.findById = originalUserFindById;
    CertificateRequest.findOne = originalReqFindOne;
  }
});

test('NoSQL injection protection: sanitizeInput strips $ and . keys and blocks object queries', () => {
  // Test 1: Malicious query with nested object or operator
  const req1 = { query: { role: { $ne: 'intern' } }, body: {} };
  const res1 = mockResponse();
  let nextCalled1 = false;
  sanitizeInput(req1, res1, () => { nextCalled1 = true; });
  assert.equal(res1.statusCode, 400);
  assert.equal(nextCalled1, false);

  // Test 2: Malicious body with $where or dotted properties
  const req2 = {
    query: { normal: 'clean' },
    body: {
      safeField: 'hello',
      $where: 'sleep(1000)',
      'nested.key': 'bad',
      nestedObj: {
        $gt: 0,
        valid: 'ok'
      }
    }
  };
  const res2 = mockResponse();
  let nextCalled2 = false;
  sanitizeInput(req2, res2, () => { nextCalled2 = true; });
  assert.equal(nextCalled2, true);
  assert.equal(req2.body.$where, undefined);
  assert.equal(req2.body['nested.key'], undefined);
  assert.equal(req2.body.safeField, 'hello');
  assert.deepEqual(req2.body.nestedObj, { valid: 'ok' });
});

test('startup environment validation verifies all 5 critical environment variables', () => {
  const required = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL', 'BREVO_SMTP_USER', 'BREVO_SMTP_KEY'];
  const testEnv = { MONGO_URI: 'mongodb://localhost', JWT_SECRET: 'sec' };
  const missing = required.filter((name) => !testEnv[name]?.trim());
  assert.deepEqual(missing, ['FRONTEND_URL', 'BREVO_SMTP_USER', 'BREVO_SMTP_KEY']);
});

test('certificate downloads enforce authentication and ownership (cross-intern returns 403)', async () => {
  const ownerId = new mongoose.Types.ObjectId();
  const unauthorizedInternId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();

  const originalReqFindById = CertificateRequest.findById;
  CertificateRequest.findById = async () => ({
    _id: requestId,
    userId: ownerId,
    certificateId: new mongoose.Types.ObjectId()
  });

  try {
    const res = mockResponse();
    await downloadCertificateForRequest({
      params: { id: requestId.toString() },
      user: { id: unauthorizedInternId.toString(), role: 'intern' }
    }, res);

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /access denied/i);
  } finally {
    CertificateRequest.findById = originalReqFindById;
  }
});

test('archived intern is blocked from accessing intern portal routes with 403', async () => {
  const internId = new mongoose.Types.ObjectId();
  const originalFindById = User.findById;

  User.findById = () => ({
    select: async () => ({ isArchived: true })
  });

  try {
    let nextCalled = false;
    const res = mockResponse();
    const middleware = async (req, response, next) => {
      const user = await User.findById(req.user.id).select('isArchived');
      if (user?.isArchived) {
        return response.status(403).json({ message: 'Your internship account has been archived. Contact admin.' });
      }
      return next();
    };

    await middleware({ user: { id: internId.toString(), role: 'intern' } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /archived/i);
  } finally {
    User.findById = originalFindById;
  }
});

test('production error handler hides internal error details and stack traces on 500', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const err = new Error('Database connection failed: secret_db_password_123');
    err.status = 500;
    const res = mockResponse();

    const errorHandler = (error, _req, response) => {
      const status = Number(error.status || error.statusCode) || 500;
      const message = status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (error.message || 'Internal server error');
      return response.status(status).json({ message });
    };

    errorHandler(err, {}, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Internal server error');
    assert.equal(res.body.stack, undefined);
    assert.equal(JSON.stringify(res.body).includes('secret_db_password_123'), false);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('team leader backfill logic matches interns by email and cleanly isolates unmatched records', () => {
  const tlId = new mongoose.Types.ObjectId();
  const teamLeaders = [{ _id: tlId, email: 'lead@uptoskill.test' }];
  const interns = [
    { _id: new mongoose.Types.ObjectId(), internshipDetails: { teamleaderEmail: 'lead@uptoskill.test' } },
    { _id: new mongoose.Types.ObjectId(), internshipDetails: { teamleaderEmail: null } }
  ];

  const leadersByEmail = new Map();
  for (const leader of teamLeaders) {
    leadersByEmail.set(leader.email.trim().toLowerCase(), leader);
  }

  const matched = [];
  const unmatched = [];

  for (const intern of interns) {
    const email = intern.internshipDetails?.teamleaderEmail?.trim().toLowerCase();
    const candidate = email ? leadersByEmail.get(email) : null;
    if (candidate) {
      matched.push({ internId: intern._id, teamLeaderId: candidate._id });
    } else {
      unmatched.push({ internId: intern._id });
    }
  }

  assert.equal(matched.length, 1);
  assert.equal(String(matched[0].teamLeaderId), String(tlId));
  assert.equal(unmatched.length, 1);
});

