import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';

// Models
import Notification from '../src/models/Notification.model.js';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import RetentionPolicy from '../src/models/RetentionPolicy.js';

// Services & jobs
import { notify } from '../src/services/notification.service.js';
import { runRetentionJob } from '../src/jobs/retention.job.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/uptoskill_test_e_suite';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-with-a-long-random-secret';

// Configure mock Brevo environment
process.env.BREVO_SMTP_USER = 'mock_smtp_user';
process.env.BREVO_SMTP_KEY = 'mock_smtp_key';
process.env.BREVO_SENDER_EMAIL = 'governance@uptoskills.com';

const sentEmails = [];
let sendMailErrorMode = null; // null | 'sync_throw' | 'async_reject'

// Stub nodemailer.createTransport so zero real emails ever go out
nodemailer.createTransport = () => ({
  sendMail: async (options) => {
    if (sendMailErrorMode === 'sync_throw') {
      throw new Error('Simulated synchronous SMTP connection failure');
    }
    if (sendMailErrorMode === 'async_reject') {
      return Promise.reject(new Error('Simulated asynchronous Brevo SMTP rejection'));
    }
    sentEmails.push({ ...options, sentAt: new Date() });
    return { messageId: 'mock-mail-' + Math.random().toString(36).substring(2, 9) };
  },
});

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

test('Task E: Full QA Test Suite (Isolated DB & Mocked Email)', async (t) => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();

  let server;
  let baseUrl;

  // Start app on dynamic ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(async () => {
    if (server) await new Promise((res) => server.close(res));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  /* ==========================================================================
     SUITE 1: UNIT TESTS FOR notify()
     ========================================================================== */
  await t.test('1. Unit: notify() saves in-app and handles email flags & failures', async (t) => {
    const testUser = await User.create({
      fullName: 'Unit Test User',
      email: 'unit_test@uptoskills.com',
      password: 'password123',
      role: 'intern',
    });

    await t.test('1.1 notify() saves in-app notification', async () => {
      const notif = await notify(testUser._id, 'REQUEST_SUBMITTED', {
        title: 'Submission Received',
        message: 'Your request is submitted.',
        requestId: new mongoose.Types.ObjectId(),
      });

      assert.ok(notif._id, 'Notification must have _id');
      assert.equal(notif.userId.toString(), testUser._id.toString());
      assert.equal(notif.isRead, false);
      assert.equal(notif.readAt, null);
      assert.equal(notif.type, 'REQUEST_SUBMITTED');
    });

    await t.test('1.2 with email false or missing, it sends no mail', async () => {
      sentEmails.length = 0;
      await notify(testUser._id, 'REQUEST_FORWARDED', {
        title: 'Forwarded Title',
        message: 'Forwarded Msg',
        email: false,
      });
      assert.equal(sentEmails.length, 0, 'No mail should be sent when email: false');

      await notify(testUser._id, 'CERTIFICATE_SENT', {
        title: 'Sent Title',
        message: 'Sent Msg',
      });
      assert.equal(sentEmails.length, 0, 'No mail should be sent when email is omitted');
    });

    await t.test('1.3 with email true, sends mail once to right address with escaped HTML', async () => {
      sentEmails.length = 0;
      await notify(testUser._id, 'REQUEST_APPROVED', {
        title: 'Approved <Important>',
        message: 'Congrats & Welcome',
        email: true,
      });

      assert.equal(sentEmails.length, 1, 'Exactly one email should be sent');
      assert.equal(sentEmails[0].to, 'unit_test@uptoskills.com');
      assert.equal(sentEmails[0].subject, '[UPTOSKILL] Approved <Important>');
      assert.match(sentEmails[0].html, /Approved &lt;Important&gt;/);
      assert.match(sentEmails[0].html, /Congrats &amp; Welcome/);
    });

    await t.test('1.4 sendEmail throwing synchronously leaves notify() resolved and error logged', async () => {
      sendMailErrorMode = 'sync_throw';
      const notif = await notify(testUser._id, 'REQUEST_REJECTED', {
        title: 'Sync Fail Title',
        message: 'Sync Fail Msg',
        email: true,
      });
      sendMailErrorMode = null;

      assert.ok(notif._id, 'Notification must still be created and resolved');
      const saved = await Notification.findById(notif._id);
      assert.ok(saved, 'Record exists in DB');
    });

    await t.test('1.5 sendEmail rejecting asynchronously leaves notify() resolved and saved', async () => {
      sendMailErrorMode = 'async_reject';
      const notif = await notify(testUser._id, 'ARCHIVE_WARNING', {
        title: 'Async Reject Title',
        message: 'Async Reject Msg',
        email: true,
      });
      sendMailErrorMode = null;

      assert.ok(notif._id, 'Notification must still be created and resolved');
      const saved = await Notification.findById(notif._id);
      assert.ok(saved, 'Record exists in DB');
    });
  });

  /* ==========================================================================
     SUITE 2: INTEGRATION (WALK ONE REQUEST THROUGH EVERY STAGE)
     ========================================================================== */
  await t.test('2. Integration: Walk ONE request through every stage and verify notifications & emails per user', async () => {
    // 1. Create real users: Intern, TL, Admin1, Admin2
    const tl = await User.create({
      fullName: 'Lead Sarah',
      email: 'tl_sarah@uptoskills.com',
      password: 'password123',
      role: 'teamleader',
    });

    const admin1 = await User.create({
      fullName: 'Super Admin One',
      email: 'admin_one@uptoskills.com',
      password: 'password123',
      role: 'admin',
    });

    const admin2 = await User.create({
      fullName: 'Super Admin Two',
      email: 'admin_two@uptoskills.com',
      password: 'password123',
      role: 'admin',
    });

    const intern = await User.create({
      fullName: 'Intern Alex',
      email: 'intern_alex@uptoskills.com',
      password: 'password123',
      role: 'intern',
      internCode: 'INT-ALEX-01',
      domain: 'Full Stack Development',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      internshipDetails: {
        teamleaderEmail: '  TL_SARAH@uptoskills.com  ', // whitespace and case test
        status: 'ongoing',
      },
    });

    // Create active template for certificate generation
    await CertificateTemplate.create({
      templateCode: 'bonafide-test-01',
      templateName: 'Bonafide Certificate Template',
      certificateType: 'bonafide',
      title: 'Bonafide Certificate Template',
      htmlContent: '<html><body><h1>Certificate for {{fullName}}</h1>{{certificateNumber}}{{qrCodeUrl}}</body></html>',
      status: 'active',
      createdBy: admin1._id,
    });

    await CertificateTemplate.create({
      templateCode: 'custom-test-01',
      templateName: 'Custom Certificate Template',
      certificateType: 'custom',
      title: 'Custom Certificate Template',
      htmlContent: '<html><body><h1>Custom {{fullName}}</h1></body></html>',
      status: 'active',
      createdBy: admin1._id,
    });

    const internToken = generateToken(intern);
    const tlToken = generateToken(tl);
    const adminToken = generateToken(admin1);

    const countUserNotifications = async (uId) => {
      const list = await Notification.find({ userId: uId }).sort({ createdAt: 1 });
      return list;
    };

    const countUserEmails = (email) => {
      return sentEmails.filter((m) => m.to === email);
    };

    // ── STAGE 1: SUBMIT REQUEST ──
    sentEmails.length = 0;
    const submitRes = await fetch(`${baseUrl}/api/intern/request-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`,
      },
      body: JSON.stringify({
        certificateType: 'bonafide',
        reason: 'College submission requirement',
        metadata: { Purpose: 'Academic Examination' },
      }),
    });
    assert.equal(submitRes.status, 201, 'Request submission should succeed');
    const submitData = await submitRes.json();
    const requestId = submitData.request._id;

    // Assert: TL gets 1 in-app + 1 email; nobody else gets anything
    const tlNotifs1 = await countUserNotifications(tl._id);
    const internNotifs1 = await countUserNotifications(intern._id);
    const admin1Notifs1 = await countUserNotifications(admin1._id);
    const admin2Notifs1 = await countUserNotifications(admin2._id);

    assert.equal(tlNotifs1.length, 1, 'TL must get 1 in-app notification');
    assert.equal(tlNotifs1[0].type, 'REQUEST_SUBMITTED');
    assert.equal(countUserEmails(tl.email).length, 1, 'TL must get 1 email on submission');
    assert.equal(internNotifs1.length, 0, 'Intern should get 0 notifications on submit');
    assert.equal(admin1Notifs1.length, 0, 'Admins should get 0 notifications on submit');
    assert.equal(admin2Notifs1.length, 0);

    // ── STAGE 2: TL FORWARDS TO ADMINS ──
    sentEmails.length = 0;
    const forwardRes = await fetch(`${baseUrl}/api/teamleader/requests/${requestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tlToken}`,
      },
      body: JSON.stringify({ action: 'forward' }),
    });
    assert.equal(forwardRes.status, 200, 'TL forward should succeed');

    // Assert: Every admin gets 1 in-app and no email; intern and TL get nothing new
    const admin1Notifs2 = await countUserNotifications(admin1._id);
    const admin2Notifs2 = await countUserNotifications(admin2._id);
    const internNotifs2 = await countUserNotifications(intern._id);
    const tlNotifs2 = await countUserNotifications(tl._id);

    assert.equal(admin1Notifs2.length, 1, 'Admin 1 must get 1 in-app notification');
    assert.equal(admin2Notifs2.length, 1, 'Admin 2 must get 1 in-app notification');
    assert.equal(admin1Notifs2[0].type, 'REQUEST_FORWARDED');
    assert.equal(admin2Notifs2[0].type, 'REQUEST_FORWARDED');
    assert.equal(sentEmails.length, 0, 'No emails should be sent on forward');
    assert.equal(internNotifs2.length, 0, 'Intern gets nothing on forward');
    assert.equal(tlNotifs2.length, 1, 'TL has no new notification on forward');

    // ── STAGE 3A: ADMIN REJECTS WITH REASON ──
    sentEmails.length = 0;
    const rejectRes = await fetch(`${baseUrl}/api/admin/requests/${requestId}/finalize`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'reject',
        rejectionReason: 'Invalid bonafide college purpose statement',
      }),
    });
    assert.equal(rejectRes.status, 200, 'Admin rejection should succeed');

    // Assert: Intern gets in-app + email containing the reason
    const internNotifs3 = await countUserNotifications(intern._id);
    assert.equal(internNotifs3.length, 1, 'Intern must receive rejection notification');
    assert.equal(internNotifs3[0].type, 'REQUEST_REJECTED');
    assert.match(internNotifs3[0].message, /Invalid bonafide college purpose statement/);

    const internEmails3 = countUserEmails(intern.email);
    assert.equal(internEmails3.length, 1, 'Intern must receive rejection email');
    assert.match(internEmails3[0].html, /Invalid bonafide college purpose statement/);

    // ── STAGE 3B: TEST REJECTION BY TL ──
    sentEmails.length = 0;
    const sub2Res = await fetch(`${baseUrl}/api/intern/request-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`,
      },
      body: JSON.stringify({
        certificateType: 'bonafide',
        reason: 'Second test submission',
      }),
    });
    const sub2Data = await sub2Res.json();
    const req2Id = sub2Data.request._id;

    sentEmails.length = 0;
    const tlRejectRes = await fetch(`${baseUrl}/api/teamleader/requests/${req2Id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tlToken}`,
      },
      body: JSON.stringify({
        action: 'reject',
        rejectionReason: 'TL identified missing attendance milestone',
      }),
    });
    assert.equal(tlRejectRes.status, 200);

    const internNotifs3b = await countUserNotifications(intern._id);
    const lastInternNotif = internNotifs3b[internNotifs3b.length - 1];
    assert.equal(lastInternNotif.type, 'REQUEST_REJECTED');
    assert.match(lastInternNotif.message, /TL identified missing attendance milestone/);
    const internEmails3b = countUserEmails(intern.email);
    assert.equal(internEmails3b.length, 1, 'Intern receives TL rejection email');
    assert.match(internEmails3b[0].html, /TL identified missing attendance milestone/);

    // ── STAGE 4: APPROVE REQUEST ──
    // Create and forward a fresh request to be approved
    const sub3Res = await fetch(`${baseUrl}/api/intern/request-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`,
      },
      body: JSON.stringify({
        certificateType: 'bonafide',
        reason: 'Approval test flow',
      }),
    });
    const sub3Data = await sub3Res.json();
    const req3Id = sub3Data.request._id;

    await fetch(`${baseUrl}/api/teamleader/requests/${req3Id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tlToken}` },
      body: JSON.stringify({ action: 'forward' }),
    });

    sentEmails.length = 0;
    const approveRes = await fetch(`${baseUrl}/api/admin/requests/${req3Id}/finalize`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });
    assert.equal(approveRes.status, 200, 'Admin approval should succeed');
    const approveData = await approveRes.json();
    const certificateId = approveData.certificate?._id;

    // Assert: intern gets in-app + email
    const internNotifs4 = await countUserNotifications(intern._id);
    const approveNotif = internNotifs4.find((n) => n.type === 'REQUEST_APPROVED');
    assert.ok(approveNotif, 'Intern must receive REQUEST_APPROVED in-app notification');

    const approveEmail = sentEmails.find((m) => m.to === intern.email && m.subject.includes('Approved'));
    assert.ok(approveEmail, 'Intern must receive approval email');

    // ── STAGE 5: CERTIFICATE FINALIZED & SENT ──
    sentEmails.length = 0;
    const finalizeRes = await fetch(`${baseUrl}/api/admin/certificates/${certificateId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(finalizeRes.status, 200, 'Certificate finalization should succeed');

    // Assert: intern gets 1 in-app and no email from notify()
    const internNotifs5 = await countUserNotifications(intern._id);
    const certSentNotif = internNotifs5.find((n) => n.type === 'CERTIFICATE_SENT');
    assert.ok(certSentNotif, 'Intern must receive CERTIFICATE_SENT in-app notification');

    // Check that notify() did NOT send email for CERTIFICATE_SENT
    const notifySentEmails = sentEmails.filter((m) => m.subject.includes('[UPTOSKILL] Certificate Finalized & Issued'));
    assert.equal(notifySentEmails.length, 0, 'CERTIFICATE_SENT must be in-app only, not via notify email');

    // ── STAGE 6: ARCHIVE WARNING JOB AT 7 DAYS BEFORE ──
    sentEmails.length = 0;
    const today = new Date('2026-07-23T00:00:00.000Z'); // exactly 7 days before grace period expires (30 grace days)
    await RetentionPolicy.findOneAndUpdate(
      { policyKey: 'intern' },
      { graceDays: 30, purgeDays: 90 },
      { upsert: true }
    );

    // First run of job
    const run1 = await runRetentionJob({ dryRun: false, now: today });
    assert.equal(run1.warnings, 1, 'Archive warning should be sent to 1 eligible intern');

    const internNotifs6 = await countUserNotifications(intern._id);
    const archiveNotif = internNotifs6.find((n) => n.type === 'ARCHIVE_WARNING');
    assert.ok(archiveNotif, 'Intern must receive ARCHIVE_WARNING in-app notification');

    const archiveEmail = sentEmails.find((m) => m.to === intern.email && m.subject.includes('Archival Warning'));
    assert.ok(archiveEmail, 'Intern must receive ARCHIVE_WARNING email');

    // Second run: running the job twice doesn't duplicate
    sentEmails.length = 0;
    const run2 = await runRetentionJob({ dryRun: false, now: today });
    assert.equal(run2.warnings, 0, 'Second run must not send duplicate warning');
    assert.equal(sentEmails.length, 0, 'No duplicate email on second run');
  });

  /* ==========================================================================
     SUITE 3: FAILURE PATHS
     ========================================================================== */
  await t.test('3. Failure paths: sendEmail failures and unmatched TL email', async (t) => {
    const tl = await User.create({
      fullName: 'Resilient TL',
      email: 'resilient_tl@uptoskills.com',
      password: 'password123',
      role: 'teamleader',
    });
    const admin = await User.create({
      fullName: 'Resilient Admin',
      email: 'resilient_admin@uptoskills.com',
      password: 'password123',
      role: 'admin',
    });
    const internWithTL = await User.create({
      fullName: 'Intern With TL',
      email: 'intern_with_tl@uptoskills.com',
      password: 'password123',
      role: 'intern',
      internCode: 'INT-RES-01',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      internshipDetails: { teamleaderEmail: tl.email, status: 'ongoing' },
    });
    const internNoTL = await User.create({
      fullName: 'Intern No TL',
      email: 'intern_no_tl@uptoskills.com',
      password: 'password123',
      role: 'intern',
      internCode: 'INT-NO-TL',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      internshipDetails: { teamleaderEmail: 'nonexistent_tl@uptoskills.com', status: 'ongoing' },
    });

    const internToken = generateToken(internWithTL);
    const tlToken = generateToken(tl);
    const adminToken = generateToken(admin);

    await t.test('3.1 Unmatched TL email submits successfully with logged warning and no TL notification', async () => {
      const tokenNoTL = generateToken(internNoTL);
      const res = await fetch(`${baseUrl}/api/intern/request-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenNoTL}` },
        body: JSON.stringify({ certificateType: 'custom', reason: 'No TL test' }),
      });
      assert.equal(res.status, 201, 'Request must succeed with 201 even when TL is unmatched');

      const tlNotifs = await Notification.find({ userId: tl._id });
      const createdForTL = tlNotifs.find((n) => n.message.includes('Intern No TL'));
      assert.equal(createdForTL, undefined, 'No TL notification should be created for unmatched TL');
    });

    await t.test('3.2 With sendEmail failing, forward and approve still succeed and change state', async () => {
      // Create request
      const reqRes = await fetch(`${baseUrl}/api/intern/request-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${internToken}` },
        body: JSON.stringify({ certificateType: 'custom', reason: 'Email fail test' }),
      });
      const reqData = await reqRes.json();
      const rId = reqData.request._id;

      // Enable simulated sendEmail failure
      sendMailErrorMode = 'async_reject';

      // TL forward
      const fwdRes = await fetch(`${baseUrl}/api/teamleader/requests/${rId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tlToken}` },
        body: JSON.stringify({ action: 'forward' }),
      });
      assert.equal(fwdRes.status, 200, 'Forward must succeed despite email errors');
      const reqAfterFwd = await CertificateRequest.findById(rId);
      assert.equal(reqAfterFwd.status, 'processing');

      // Admin approve
      const appRes = await fetch(`${baseUrl}/api/admin/requests/${rId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'approve' }),
      });
      assert.equal(appRes.status, 200, 'Approval must succeed despite email errors');
      const reqAfterApp = await CertificateRequest.findById(rId);
      assert.equal(reqAfterApp.status, 'approved');

      sendMailErrorMode = null;
    });
  });

  /* ==========================================================================
     SUITE 4: SECURITY & ISOLATION
     ========================================================================== */
  await t.test('4. Security: User isolation, 401s, 404s, malformed IDs', async (t) => {
    const userA = await User.create({
      fullName: 'User Alpha',
      email: 'alpha@uptoskills.com',
      password: 'password123',
      role: 'intern',
    });
    const userB = await User.create({
      fullName: 'User Beta',
      email: 'beta@uptoskills.com',
      password: 'password123',
      role: 'intern',
    });

    const tokenA = generateToken(userA);
    const tokenB = generateToken(userB);

    const notifA = await notify(userA._id, 'REQUEST_SUBMITTED', {
      title: 'Secret Alpha Notif',
      message: 'Alpha confidential message',
    });

    await t.test('4.1 User B cannot mark User A notification read (returns 404, A stays unread)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notifA._id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(res.status, 404, 'Must return 404 when marking another user notification');

      const freshA = await Notification.findById(notifA._id);
      assert.equal(freshA.isRead, false, 'A notification must remain unread');
    });

    await t.test('4.2 List, unread-count, and read-all never leak or modify User A data', async () => {
      // List
      const listRes = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const listData = await listRes.json();
      assert.equal(listData.notifications.length, 0, 'User B list must not show User A notifications');

      // Unread count
      const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const countData = await countRes.json();
      assert.equal(countData.unreadCount, 0, 'User B unread count must be 0');

      // Read-all
      const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.equal(readAllRes.status, 200);

      const freshA = await Notification.findById(notifA._id);
      assert.equal(freshA.isRead, false, 'A notification must remain unread after B read-all');
    });

    await t.test('4.3 Unauthenticated requests get 401', async () => {
      const r1 = await fetch(`${baseUrl}/api/notifications`);
      assert.equal(r1.status, 401);
      const r2 = await fetch(`${baseUrl}/api/notifications/unread-count`);
      assert.equal(r2.status, 401);
      const r3 = await fetch(`${baseUrl}/api/notifications/read-all`, { method: 'PATCH' });
      assert.equal(r3.status, 401);
      const r4 = await fetch(`${baseUrl}/api/notifications/${notifA._id}/read`, { method: 'PATCH' });
      assert.equal(r4.status, 401);
    });

    await t.test('4.4 External userId in query or body is ignored', async () => {
      const res = await fetch(`${baseUrl}/api/notifications?userId=${userA._id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const data = await res.json();
      assert.equal(data.notifications.length, 0, 'Injected query userId must be ignored');
    });

    await t.test('4.5 Malformed and non-existent IDs return 404 (does not 500 on malformed ID)', async () => {
      // Non-existent valid ObjectId
      const nonExistent = new mongoose.Types.ObjectId();
      const r1 = await fetch(`${baseUrl}/api/notifications/${nonExistent}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(r1.status, 404, 'Non-existent ID must return 404');

      // Malformed ID
      const r2 = await fetch(`${baseUrl}/api/notifications/malformed-id-12345/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(r2.status, 404, 'Malformed ID must return 404, never 500');
    });
  });

  /* ==========================================================================
     SUITE 5: ENDPOINT BEHAVIOR
     ========================================================================== */
  await t.test('5. Endpoint behavior: Pagination, filtering, count sync, ordering, read-all', async (t) => {
    const userC = await User.create({
      fullName: 'User Charlie',
      email: 'charlie@uptoskills.com',
      password: 'password123',
      role: 'intern',
    });
    const tokenC = generateToken(userC);

    // Create 5 notifications (3 unread, 2 read)
    for (let i = 1; i <= 5; i++) {
      const n = await notify(userC._id, 'REQUEST_SUBMITTED', {
        title: `Item ${i}`,
        message: `Message ${i}`,
      });
      if (i > 3) {
        n.isRead = true;
        n.readAt = new Date();
        await n.save();
      }
    }

    await t.test('5.1 Unread count returns exact count (3)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const data = await res.json();
      assert.equal(data.unreadCount, 3);
    });

    await t.test('5.2 unread=true filters correctly', async () => {
      const res = await fetch(`${baseUrl}/api/notifications?unread=true`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const data = await res.json();
      assert.equal(data.notifications.length, 3);
      data.notifications.forEach((item) => assert.equal(item.isRead, false));
    });

    await t.test('5.3 Pagination validation (page=0, page=-1, page=non-numeric, limit cap)', async () => {
      const r0 = await fetch(`${baseUrl}/api/notifications?page=0&limit=2`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const d0 = await r0.json();
      assert.equal(d0.page, 1, 'page 0 should default/sanitize to 1');
      assert.equal(d0.notifications.length, 2);

      const rNeg = await fetch(`${baseUrl}/api/notifications?page=-5`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const dNeg = await rNeg.json();
      assert.equal(dNeg.page, 1);

      const rBad = await fetch(`${baseUrl}/api/notifications?page=abc`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const dBad = await rBad.json();
      assert.equal(dBad.page, 1);
    });

    await t.test('5.4 markNotificationRead sets isRead and readAt, persists after refresh', async () => {
      const unreadList = await Notification.find({ userId: userC._id, isRead: false });
      const target = unreadList[0];

      const res = await fetch(`${baseUrl}/api/notifications/${target._id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.notification.isRead, true);
      assert.ok(data.notification.readAt);

      // Verify persistence on fresh request
      const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const countData = await countRes.json();
      assert.equal(countData.unreadCount, 2, 'Unread count must now be 2');
    });

    await t.test('5.5 markAllNotificationsRead marks all remaining read', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      assert.equal(res.status, 200);

      const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      const countData = await countRes.json();
      assert.equal(countData.unreadCount, 0, 'Unread count must be 0 after read-all');
    });
  });

  /* ==========================================================================
     SUITE 6: SCHEMA & INDEX VERIFICATION
     ========================================================================== */
  await t.test('6. Schema & Index: Type enum validation and compound index', async (t) => {
    await t.test('6.1 Invalid type rejected by schema validation', async () => {
      await assert.rejects(
        async () => {
          await Notification.create({
            userId: new mongoose.Types.ObjectId(),
            type: 'FORBIDDEN_INVALID_TYPE',
            title: 'T',
            message: 'M',
          });
        },
        /`FORBIDDEN_INVALID_TYPE` is not a valid enum value/i,
        'Notification model must reject types not in the 6 spec enum values'
      );
    });

    await t.test('6.2 Compound index { userId: 1, isRead: 1, createdAt: -1 } exists as specified', async () => {
      await Notification.syncIndexes();
      const indexes = await Notification.collection.indexes();
      const compound = indexes.find(
        (idx) =>
          idx.key &&
          idx.key.userId === 1 &&
          idx.key.isRead === 1 &&
          idx.key.createdAt === -1
      );
      assert.ok(compound, 'Exact compound index must exist');

      // Check for absence of redundant single-field userId_1 index
      const singleUserId = indexes.find(
        (idx) => idx.key && idx.key.userId === 1 && Object.keys(idx.key).length === 1
      );
      assert.equal(singleUserId, undefined, 'Redundant single userId index should not exist');
    });
  });
});
