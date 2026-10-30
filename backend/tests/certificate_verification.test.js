import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Certificate from '../src/models/Certificate.js';
import User from '../src/models/User.js';
import app from '../src/app.js';
import { verifyPublicCertificate } from '../src/controllers/public.controller.js';
import { downloadCertificatePdf, revokeCertificate, unrevokeCertificate } from '../src/controllers/admin.controller.js';
import publicRateLimit from '../src/middlewares/publicRateLimit.js';
import { getVerificationUrl } from '../src/services/certificate.service.js';

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const withCertificateQuery = (certificate, callback) => {
  const originalFindOne = Certificate.findOne;
  Certificate.findOne = (filter) => {
    callback.filter = filter;
    return {
      select(fields) { callback.select = fields; return this; },
      populate(path, fields) { callback.populate = { path, fields }; return this; },
      lean: async () => certificate,
    };
  };
  const restore = () => { Certificate.findOne = originalFindOne; };
  restore.query = callback;
  return restore;
};

test('public verification only returns issued certificate fields and escapes lookup input', async () => {
  const certificate = {
    certificateNumber: 'CERT-2026-00001', certificateType: 'completion_certificate', status: 'finalized',
    issuedDate: new Date('2026-05-01'), domain: 'Engineering', userId: { fullName: 'Test Intern' },
    verificationCode: 'private-verification-code', pdfPath: 'private/path.pdf', internCode: 'private-code',
  };
  const restore = withCertificateQuery(certificate, {});
  try {
    const res = response();
    await verifyPublicCertificate({ params: { certificateNumber: 'CERT-2026.00001' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.certificate.internName, 'Test Intern');
    assert.equal('verificationCode' in res.body.certificate, false);
    assert.equal('pdfPath' in res.body.certificate, false);
    assert.equal('internCode' in res.body.certificate, false);
    assert.equal('_id' in res.body.certificate, false);
    assert.equal('userId' in res.body.certificate, false);
    assert.match(restore.query.filter.$or[1].certificateNumber.$regex, /^\^CERT-2026\\\.00001\$$/);
    assert.equal(restore.query.filter.$or[1].verificationIdVersion.$lt, 2);
    assert.equal(restore.query.populate.fields, 'fullName');
    assert.match(restore.query.select, /verificationCode/);
    assert.doesNotMatch(restore.query.select, /pdfPath|internCode/);
  } finally { restore(); }
});

test('certificate verification URL uses configured frontend origin and requires HTTPS in production', () => {
  const priorFrontendUrl = process.env.FRONTEND_URL;
  const priorNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://certificates.example.org/';
    assert.equal(getVerificationUrl('CERT-2026-00006'), 'https://certificates.example.org/verify/CERT-2026-00006');
    process.env.FRONTEND_URL = 'http://localhost:5173';
    assert.throws(() => getVerificationUrl('CERT-2026-00006'), /HTTPS in production/);
    delete process.env.FRONTEND_URL;
    assert.throws(() => getVerificationUrl('CERT-2026-00006'), /must be set/);
  } finally {
    if (priorFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = priorFrontendUrl;
    if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorNodeEnv;
  }
});

test('revoked certificates fail verification and disclose no recipient details', async () => {
  const restore = withCertificateQuery({
    certificateNumber: 'CERT-2026-00002', status: 'revoked', revokedAt: new Date(), userId: { fullName: 'Private Name' },
    verificationCode: 'private-code',
  }, {});
  try {
    const res = response();
    await verifyPublicCertificate({ params: { certificateNumber: 'CERT-2026-00002' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.valid, false);
    assert.match(res.body.message, /revoked/i);
    assert.equal(res.body.certificate.status, 'revoked');
    assert.equal('internName' in res.body.certificate, false);
    assert.equal('verificationCode' in res.body.certificate, false);
  } finally { restore(); }
});

test('only finalized and issued statuses verify as valid', async () => {
  for (const status of ['draft', 'generated', 'expired']) {
    const restore = withCertificateQuery({ certificateNumber: 'CERT-2026-00020', status }, {});
    try {
      const res = response();
      await verifyPublicCertificate({ params: { certificateNumber: 'CERT-2026-00020' } }, res);
      assert.equal(res.body.valid, false, status);
      assert.equal(res.statusCode, 404, status);
    } finally { restore(); }
  }
  for (const status of ['finalized', 'issued']) {
    const restore = withCertificateQuery({ certificateNumber: 'CERT-2026-00021', status, userId: { fullName: 'Test' } }, {});
    try {
      const res = response();
      await verifyPublicCertificate({ params: { certificateNumber: 'CERT-2026-00021' } }, res);
      assert.equal(res.statusCode, 200, status);
      assert.equal(res.body.valid, true, status);
    } finally { restore(); }
  }
});

test('drafts cannot be verified and malformed or oversized lookup values are rejected', async () => {
  const restore = withCertificateQuery({ certificateNumber: 'CERT-2026-00003', status: 'draft' }, {});
  try {
    const draftRes = response();
    await verifyPublicCertificate({ params: { certificateNumber: 'CERT-2026-00003' } }, draftRes);
    assert.equal(draftRes.statusCode, 404);
    assert.equal(draftRes.body.valid, false);
    assert.equal('certificate' in draftRes.body, false);
  } finally { restore(); }

  const invalid = response();
  await verifyPublicCertificate({ params: { certificateNumber: 'x'.repeat(81) } }, invalid);
  assert.equal(invalid.statusCode, 400);
});

test('admin revocation updates status atomically and records the revoking admin', async () => {
  const originalUpdate = Certificate.findOneAndUpdate;
  let filter;
  let update;
  let options;
  const certificate = { _id: new mongoose.Types.ObjectId(), certificateNumber: 'CERT-2026-00004', userId: new mongoose.Types.ObjectId(), status: 'revoked' };
  Certificate.findOneAndUpdate = async (nextFilter, nextUpdate, nextOptions) => {
    filter = nextFilter;
    update = nextUpdate;
    options = nextOptions;
    return certificate;
  };
  try {
    const req = { params: { id: certificate._id.toString() }, body: { reason: 'Incorrect completion dates' }, user: { id: new mongoose.Types.ObjectId().toString() } };
    const res = response();
    await revokeCertificate(req, res);
    assert.equal(res.statusCode, 200);
      assert.deepEqual(filter.status.$in, ['finalized', 'issued']);
    assert.equal(update[0].$set.status, 'revoked');
    assert.equal(update[0].$set.revocationReason, req.body.reason);
    assert.equal(update[0].$set.revokedBy, req.user.id);
    assert.ok(update[0].$set.revokedAt instanceof Date);
    assert.equal(update[0].$set.revokedFromStatus, '$status');
    assert.deepEqual(options, { new: true, runValidators: true });
  } finally { Certificate.findOneAndUpdate = originalUpdate; }
});

test('revoking an already revoked certificate is idempotent; drafts conflict', async () => {
  const originalUpdate = Certificate.findOneAndUpdate;
  const originalFindById = Certificate.findById;
  Certificate.findOneAndUpdate = async () => null;
  let status = 'revoked';
  Certificate.findById = () => ({ select: async () => ({ status }) });
  try {
    const id = new mongoose.Types.ObjectId().toString();
    const already = response();
    await revokeCertificate({ params: { id }, body: { reason: 'Duplicate issue' }, user: { id } }, already);
    assert.equal(already.statusCode, 200);
    assert.match(already.body.message, /already revoked/i);

    status = 'draft';
    const draft = response();
    await revokeCertificate({ params: { id }, body: { reason: 'Duplicate issue' }, user: { id } }, draft);
    assert.equal(draft.statusCode, 409);
  } finally {
    Certificate.findOneAndUpdate = originalUpdate;
    Certificate.findById = originalFindById;
  }
});

test('revocation requires a reason and unrevoke restores the prior certificate state', async () => {
  const originalUpdate = Certificate.findOneAndUpdate;
  let update;
  Certificate.findOneAndUpdate = async (_filter, nextUpdate) => { update = nextUpdate; return { status: 'finalized' }; };
  try {
    const id = new mongoose.Types.ObjectId().toString();
    const missingReason = response();
    await revokeCertificate({ params: { id }, body: {}, user: { id } }, missingReason);
    assert.equal(missingReason.statusCode, 400);

    const unrevokeResponse = response();
    await unrevokeCertificate({ params: { id }, user: { id } }, unrevokeResponse);
    assert.equal(unrevokeResponse.statusCode, 200);
    assert.deepEqual(update[0].$set.status, { $ifNull: ['$revokedFromStatus', 'issued'] });
    assert.ok(update[1].$unset.includes('revocationReason'));
  } finally { Certificate.findOneAndUpdate = originalUpdate; }
});

test('revoked certificates are rejected by the existing admin PDF download controller', async () => {
  const originalFindById = Certificate.findById;
  Certificate.findById = async () => ({ status: 'revoked', pdfPath: 'uploads/certificates/existing.pdf' });
  try {
    const res = response();
    await downloadCertificatePdf({ params: { id: new mongoose.Types.ObjectId().toString() } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /not been finalized/i);
  } finally { Certificate.findById = originalFindById; }
});

test('verification is public while certificate revocation requires admin authorization', async () => {
  const originalFindOne = Certificate.findOne;
  const originalFindById = Certificate.findById;
  const originalUserFindById = User.findById;
  Certificate.findOne = () => ({ select() { return this; }, populate() { return this; }, lean: async () => ({ certificateNumber: 'CERT-2026-00005', status: 'finalized', userId: { fullName: 'Public Recipient' } }) });
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const publicResponse = await fetch(`${base}/api/public/verify/CERT-2026-00005`);
    assert.equal(publicResponse.status, 200);
    assert.equal((await publicResponse.json()).valid, true);
    const revokeResponse = await fetch(`${base}/api/admin/certificates/${new mongoose.Types.ObjectId()}/revoke`, { method: 'PATCH' });
    assert.equal(revokeResponse.status, 401);
    User.findById = () => ({ select: async () => ({ role: 'intern' }) });
    const internToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'intern' }, process.env.JWT_SECRET);
    const denied = await fetch(`${base}/api/admin/certificates/${new mongoose.Types.ObjectId()}/revoke`, { method: 'PATCH', headers: { Cookie: `token=${internToken}` } });
    assert.equal(denied.status, 403);
  } finally {
    Certificate.findOne = originalFindOne;
    Certificate.findById = originalFindById;
    User.findById = originalUserFindById;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('public verification endpoint rate limits repeated requests by client IP', () => {
  const req = { ip: '198.51.100.123' };
  let nextCalls = 0;
  let lastResponse;
  for (let index = 0; index < 31; index += 1) {
    const res = {
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    publicRateLimit(req, res, () => { nextCalls += 1; });
    lastResponse = res;
  }
  assert.equal(nextCalls, 30);
  assert.equal(lastResponse.statusCode, 429);
  assert.equal(lastResponse.headers['RateLimit-Limit'], '30');
  assert.ok(Number(lastResponse.headers['Retry-After']) > 0);
});
