import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../src/app.js';
import Certificate from '../src/models/Certificate.js';
import Counter from '../src/models/Counter.model.js';

dotenv.config();

test('Task F: Certificate Verification (QR Code) Suite', async (t) => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uptoskill');

  let testCert;
  let originalServer;
  let serverPort;

  // Start test server on dynamic port
  await new Promise((resolve) => {
    originalServer = app.listen(0, () => {
      serverPort = originalServer.address().port;
      resolve();
    });
  });

  t.after(async () => {
    if (testCert) {
      await Certificate.deleteOne({ _id: testCert._id });
    }
    await new Promise((res) => originalServer.close(res));
    await mongoose.disconnect();
  });

  await t.test('1. Certificate Schema contains verifyId, revocation, and snapshot fields', async () => {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'certificateNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const certNum = `UTS-2026-${String(counter.seq).padStart(6, '0')}`;
    const verifyId = 'testf' + Math.random().toString(36).substring(2, 9);

    testCert = await Certificate.create({
      certificateNumber: certNum,
      verifyId,
      recipientName: 'Test Recipient',
      certificateTitle: 'Internship Completion Certificate',
      domain: 'Cloud Architecture',
      issuedAt: new Date(),
      status: 'finalized',
      userId: new mongoose.Types.ObjectId(),
      internCode: 'INT-999',
      certificateType: 'completion_certificate',
      isRevoked: false
    });

    assert.ok(testCert.verifyId, 'verifyId should be populated');
    assert.equal(testCert.recipientName, 'Test Recipient');
    assert.equal(testCert.isRevoked, false);
    assert.match(testCert.certificateNumber, /^UTS-2026-\d{6}$/);
  });

  await t.test('2. Public endpoint GET /api/verify/:verifyId returns valid certificate metadata without private fields', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/verify/${testCert.verifyId}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.certificateNumber, testCert.certificateNumber);
    assert.equal(data.recipientName, 'Test Recipient');
    assert.equal(data.certificateTitle, 'Internship Completion Certificate');
    assert.equal(data.domain, 'Cloud Architecture');
    assert.equal(data.status, 'valid');
    assert.ok(data.issuedAt);

    // Ensure no private or internal fields are exposed
    assert.equal(data.userId, undefined, 'userId must not be exposed');
    assert.equal(data._id, undefined, '_id must not be exposed');
    assert.equal(data.email, undefined, 'email must not be exposed');
    assert.equal(data.internCode, undefined, 'internCode must not be exposed');
    assert.equal(data.mobileNo, undefined, 'mobileNo must not be exposed');
  });

  await t.test('3. Revoked certificate returns status "revoked" and "revokedAt"', async () => {
    testCert.isRevoked = true;
    testCert.revokedAt = new Date();
    testCert.revokedReason = 'Academic violation';
    await testCert.save();

    const res = await fetch(`http://127.0.0.1:${serverPort}/api/verify/${testCert.verifyId}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, 'revoked');
    assert.ok(data.revokedAt, 'revokedAt must be present when revoked');
    assert.equal(data.recipientName, 'Test Recipient');
  });

  await t.test('4. Unknown and malformed verifyId return identical 404 shape', async () => {
    const res1 = await fetch(`http://127.0.0.1:${serverPort}/api/verify/nonexistent9999`);
    const res2 = await fetch(`http://127.0.0.1:${serverPort}/api/verify/bad!@#$`);

    assert.equal(res1.status, 404);
    assert.equal(res2.status, 404);

    const body1 = await res1.json();
    const body2 = await res2.json();

    assert.deepEqual(body1, { message: 'Certificate not found' });
    assert.deepEqual(body2, { message: 'Certificate not found' });
  });

  await t.test('5. Draft certificates cannot be verified (return 404)', async () => {
    const draftCert = await Certificate.create({
      certificateNumber: 'UTS-2026-999999',
      verifyId: 'draftid' + Math.random().toString(36).substring(2, 7),
      recipientName: 'Draft Intern',
      certificateTitle: 'Draft Certificate',
      status: 'draft',
      userId: new mongoose.Types.ObjectId(),
      internCode: 'INT-DRAFT',
      certificateType: 'custom'
    });

    const res = await fetch(`http://127.0.0.1:${serverPort}/api/verify/${draftCert.verifyId}`);
    assert.equal(res.status, 404);

    await Certificate.deleteOne({ _id: draftCert._id });
  });
});
