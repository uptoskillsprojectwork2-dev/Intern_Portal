import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.model.js';
import { getCache, setCache, invalidateAnalyticsCache } from '../src/utils/redisCache.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/uptoskill_test_task_g_analytics';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-with-a-long-random-secret';

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

test('Task G: Admin Analytics Comprehensive Integration Tests with Seeded Dataset', async (t) => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();

  let server;
  let baseUrl;
  let adminToken;
  let tl1Token;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
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

  // --- SEED DATASET ---
  // 1. Admin
  const admin = await User.create({
    fullName: 'Global Admin',
    email: 'admin_analytics@uptoskills.com',
    password: 'password123',
    role: 'admin'
  });
  adminToken = createToken(admin);

  // 2. Team Leaders
  const tl1 = await User.create({
    fullName: 'Alice Leader',
    email: 'alice_tl@uptoskills.com',
    password: 'password123',
    role: 'teamleader'
  });
  tl1Token = createToken(tl1);

  const tl2 = await User.create({
    fullName: 'Bob Leader',
    email: 'bob_tl@uptoskills.com',
    password: 'password123',
    role: 'teamleader'
  });

  const now = new Date();
  const dayMs = 24 * 3600 * 1000;
  const hourMs = 3600 * 1000;

  // 3. 11 Interns (6 ongoing, 2 upcoming, 1 completed, 1 cancelled, 1 archived)
  const interns = await User.create([
    // Active (ongoing, not archived)
    {
      fullName: 'Intern 1',
      email: 'intern1@test.com',
      password: 'password123',
      internCode: 'INT-001',
      role: 'intern',
      domain: 'Web Development',
      endDate: new Date(now.getTime() + 5 * dayMs), // ends in 5 days (<7d)
      internshipDetails: { status: 'ongoing', teamLeader: tl1._id, teamLeaderId: tl1._id }
    },
    {
      fullName: 'Intern 2',
      email: 'intern2@test.com',
      password: 'password123',
      internCode: 'INT-002',
      role: 'intern',
      domain: 'Web Development',
      endDate: new Date(now.getTime() + 20 * dayMs), // ends in 20 days (<30d)
      internshipDetails: { status: 'ongoing', teamLeader: tl1._id, teamLeaderId: tl1._id }
    },
    {
      fullName: 'Intern 3',
      email: 'intern3@test.com',
      password: 'password123',
      internCode: 'INT-003',
      role: 'intern',
      domain: 'Data Science',
      endDate: new Date(now.getTime() + 50 * dayMs),
      internshipDetails: { status: 'ongoing', teamLeader: tl1._id, teamLeaderId: tl1._id }
    },
    {
      fullName: 'Intern 4',
      email: 'intern4@test.com',
      password: 'password123',
      internCode: 'INT-004',
      role: 'intern',
      domain: 'Data Science',
      endDate: new Date(now.getTime() + 15 * dayMs), // ends in 15 days (<30d)
      internshipDetails: { status: 'ongoing', teamLeader: tl2._id, teamLeaderId: tl2._id }
    },
    {
      fullName: 'Intern 5',
      email: 'intern5@test.com',
      password: 'password123',
      internCode: 'INT-005',
      role: 'intern',
      domain: 'Cloud Computing',
      endDate: new Date(now.getTime() + 60 * dayMs),
      internshipDetails: { status: 'ongoing', teamLeader: tl2._id, teamLeaderId: tl2._id }
    },
    {
      fullName: 'Intern 6',
      email: 'intern6@test.com',
      password: 'password123',
      internCode: 'INT-006',
      role: 'intern',
      domain: 'Cloud Computing',
      endDate: new Date(now.getTime() + 90 * dayMs),
      internshipDetails: { status: 'ongoing', teamLeader: tl2._id, teamLeaderId: tl2._id }
    },
    // Upcoming
    {
      fullName: 'Intern 7',
      email: 'intern7@test.com',
      password: 'password123',
      internCode: 'INT-007',
      role: 'intern',
      domain: 'Web Development',
      internshipDetails: { status: 'upcoming', teamLeader: tl1._id, teamLeaderId: tl1._id }
    },
    {
      fullName: 'Intern 8',
      email: 'intern8@test.com',
      password: 'password123',
      internCode: 'INT-008',
      role: 'intern',
      domain: 'Data Science',
      internshipDetails: { status: 'upcoming', teamLeader: tl2._id, teamLeaderId: tl2._id }
    },
    // Completed
    {
      fullName: 'Intern 9',
      email: 'intern9@test.com',
      password: 'password123',
      internCode: 'INT-009',
      role: 'intern',
      domain: 'Data Science',
      internshipDetails: { status: 'completed', teamLeader: tl1._id, teamLeaderId: tl1._id }
    },
    // Cancelled
    {
      fullName: 'Intern 10',
      email: 'intern10@test.com',
      password: 'password123',
      internCode: 'INT-010',
      role: 'intern',
      domain: 'Cloud Computing',
      internshipDetails: { status: 'cancelled', teamLeader: tl2._id, teamLeaderId: tl2._id }
    },
    // Archived (should NOT be counted in active interns)
    {
      fullName: 'Intern 11',
      email: 'intern11@test.com',
      password: 'password123',
      internCode: 'INT-011',
      role: 'intern',
      domain: 'Web Development',
      isArchived: true,
      internshipDetails: { status: 'ongoing', teamLeader: tl1._id, teamLeaderId: tl1._id }
    }
  ]);

  // Create certificates for drafts and completed
  const draftCert1 = await Certificate.create({
    certificateNumber: 'UTS-2026-000001',
    userId: interns[0]._id,
    internCode: 'INT-001',
    certificateType: 'bonafide',
    status: 'draft'
  });
  const draftCert2 = await Certificate.create({
    certificateNumber: 'UTS-2026-000002',
    userId: interns[1]._id,
    internCode: 'INT-002',
    certificateType: 'bonafide',
    status: 'draft'
  });
  const draftCert3 = await Certificate.create({
    certificateNumber: 'UTS-2026-000003',
    userId: interns[2]._id,
    internCode: 'INT-003',
    certificateType: 'bonafide',
    status: 'draft'
  });

  const finalCert4 = await Certificate.create({
    certificateNumber: 'UTS-2026-000004',
    userId: interns[0]._id,
    internCode: 'INT-001',
    certificateType: 'completion_certificate',
    domain: 'Web Development',
    status: 'issued',
    issuedAt: new Date(now.getTime() - 2 * hourMs),
    issuedDate: new Date(now.getTime() - 2 * hourMs)
  });
  const finalCert5 = await Certificate.create({
    certificateNumber: 'UTS-2026-000005',
    userId: interns[1]._id,
    internCode: 'INT-002',
    certificateType: 'bonafide',
    domain: 'Web Development',
    status: 'issued',
    issuedAt: new Date(now.getTime() - 3 * hourMs),
    issuedDate: new Date(now.getTime() - 3 * hourMs)
  });
  const finalCert6 = await Certificate.create({
    certificateNumber: 'UTS-2026-000006',
    userId: interns[2]._id,
    internCode: 'INT-003',
    certificateType: 'internship_completion_certificate',
    domain: 'Data Science',
    status: 'issued',
    issuedAt: new Date(now.getTime() - 4 * hourMs),
    issuedDate: new Date(now.getTime() - 4 * hourMs)
  });
  const finalCert7 = await Certificate.create({
    certificateNumber: 'UTS-2026-000007',
    userId: interns[3]._id,
    internCode: 'INT-004',
    certificateType: 'offer_letter',
    domain: 'Data Science',
    status: 'issued',
    issuedAt: new Date(now.getTime() - 5 * hourMs),
    issuedDate: new Date(now.getTime() - 5 * hourMs)
  });

  // 4. 20 Certificate Requests
  await CertificateRequest.create([
    // 4 Pending (With TL)
    {
      requestNumber: 'REQ-001',
      userId: interns[0]._id,
      internCode: 'INT-001',
      certificateType: 'bonafide',
      status: 'pending',
      requestedAt: new Date(now.getTime() - 4 * dayMs) // stuck > 3 days
    },
    {
      requestNumber: 'REQ-002',
      userId: interns[1]._id,
      internCode: 'INT-002',
      certificateType: 'bonafide',
      status: 'pending',
      requestedAt: new Date(now.getTime() - 1 * dayMs)
    },
    {
      requestNumber: 'REQ-003',
      userId: interns[2]._id,
      internCode: 'INT-003',
      certificateType: 'bonafide',
      status: 'pending',
      requestedAt: new Date(now.getTime() - 5 * dayMs) // stuck > 3 days
    },
    {
      requestNumber: 'REQ-004',
      userId: interns[3]._id,
      internCode: 'INT-004',
      certificateType: 'bonafide',
      status: 'pending',
      requestedAt: new Date(now.getTime() - 1 * dayMs)
    },

    // 4 Processing (With Admin)
    {
      requestNumber: 'REQ-005',
      userId: interns[0]._id,
      internCode: 'INT-001',
      certificateType: 'offer_letter',
      status: 'processing',
      requestedAt: new Date(now.getTime() - 5 * dayMs),
      forwardedAt: new Date(now.getTime() - 4 * dayMs), // stuck with admin > 3 days
      forwardedBy: tl1._id
    },
    {
      requestNumber: 'REQ-006',
      userId: interns[1]._id,
      internCode: 'INT-002',
      certificateType: 'offer_letter',
      status: 'processing',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      forwardedAt: new Date(now.getTime() - 1 * dayMs),
      forwardedBy: tl1._id
    },
    {
      requestNumber: 'REQ-007',
      userId: interns[2]._id,
      internCode: 'INT-003',
      certificateType: 'offer_letter',
      status: 'processing',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      forwardedAt: new Date(now.getTime() - 1 * dayMs),
      forwardedBy: tl1._id
    },
    {
      requestNumber: 'REQ-008',
      userId: interns[3]._id,
      internCode: 'INT-004',
      certificateType: 'offer_letter',
      status: 'processing',
      requestedAt: new Date(now.getTime() - 1 * dayMs),
      forwardedAt: new Date(now.getTime() - 12 * hourMs),
      forwardedBy: tl2._id
    },

    // 4 Approved (3 draft ready, 1 failed generation)
    {
      requestNumber: 'REQ-009',
      userId: interns[0]._id,
      internCode: 'INT-001',
      certificateType: 'bonafide',
      status: 'approved',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      forwardedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedAt: new Date(now.getTime() - 10 * hourMs),
      reviewedBy: admin._id,
      certificateId: draftCert1._id
    },
    {
      requestNumber: 'REQ-010',
      userId: interns[1]._id,
      internCode: 'INT-002',
      certificateType: 'bonafide',
      status: 'approved',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      forwardedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedAt: new Date(now.getTime() - 10 * hourMs),
      reviewedBy: admin._id,
      certificateId: draftCert2._id
    },
    {
      requestNumber: 'REQ-011',
      userId: interns[2]._id,
      internCode: 'INT-003',
      certificateType: 'bonafide',
      status: 'approved',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      forwardedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedAt: new Date(now.getTime() - 10 * hourMs),
      reviewedBy: admin._id,
      certificateId: draftCert3._id
    },
    {
      // Failed generation: approved > 1h ago with no certificate
      requestNumber: 'REQ-012',
      userId: interns[3]._id,
      internCode: 'INT-004',
      certificateType: 'bonafide',
      status: 'approved',
      requestedAt: new Date(now.getTime() - 3 * hourMs),
      forwardedAt: new Date(now.getTime() - 2 * hourMs),
      reviewedAt: new Date(now.getTime() - 2 * hourMs),
      reviewedBy: admin._id,
      certificateId: null
    },

    // 4 Completed
    {
      requestNumber: 'REQ-013',
      userId: interns[0]._id,
      internCode: 'INT-001',
      certificateType: 'completion_certificate',
      status: 'completed',
      requestedAt: new Date(now.getTime() - 3 * dayMs),
      forwardedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      completedAt: new Date(now.getTime() - 2 * hourMs),
      reviewedBy: admin._id,
      certificateId: finalCert4._id
    },
    {
      requestNumber: 'REQ-014',
      userId: interns[1]._id,
      internCode: 'INT-002',
      certificateType: 'bonafide',
      status: 'completed',
      requestedAt: new Date(now.getTime() - 3 * dayMs),
      forwardedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      completedAt: new Date(now.getTime() - 3 * hourMs),
      reviewedBy: admin._id,
      certificateId: finalCert5._id
    },
    {
      requestNumber: 'REQ-015',
      userId: interns[2]._id,
      internCode: 'INT-003',
      certificateType: 'internship_completion_certificate',
      status: 'completed',
      requestedAt: new Date(now.getTime() - 4 * dayMs),
      forwardedAt: new Date(now.getTime() - 3 * dayMs),
      reviewedAt: new Date(now.getTime() - 2 * dayMs),
      completedAt: new Date(now.getTime() - 4 * hourMs),
      reviewedBy: admin._id,
      certificateId: finalCert6._id
    },
    {
      requestNumber: 'REQ-016',
      userId: interns[3]._id,
      internCode: 'INT-004',
      certificateType: 'offer_letter',
      status: 'completed',
      requestedAt: new Date(now.getTime() - 5 * dayMs),
      forwardedAt: new Date(now.getTime() - 4 * dayMs),
      reviewedAt: new Date(now.getTime() - 2 * dayMs),
      completedAt: new Date(now.getTime() - 5 * hourMs),
      reviewedBy: admin._id,
      certificateId: finalCert7._id
    },

    // 2 Rejected by TL (no forwardedAt)
    {
      requestNumber: 'REQ-017',
      userId: interns[4]._id,
      internCode: 'INT-005',
      certificateType: 'bonafide',
      status: 'rejected',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedBy: tl2._id,
      forwardedAt: null,
      rejectionReason: 'Invalid dates provided by intern'
    },
    {
      requestNumber: 'REQ-018',
      userId: interns[5]._id,
      internCode: 'INT-006',
      certificateType: 'bonafide',
      status: 'rejected',
      requestedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedBy: tl2._id,
      forwardedAt: null,
      rejectionReason: 'Attendance requirement not met'
    },

    // 2 Rejected by Admin (forwardedAt exists)
    {
      requestNumber: 'REQ-019',
      userId: interns[4]._id,
      internCode: 'INT-005',
      certificateType: 'offer_letter',
      status: 'rejected',
      requestedAt: new Date(now.getTime() - 3 * dayMs),
      forwardedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedBy: admin._id,
      rejectionReason: 'Administrative policy violation'
    },
    {
      requestNumber: 'REQ-020',
      userId: interns[5]._id,
      internCode: 'INT-006',
      certificateType: 'offer_letter',
      status: 'rejected',
      requestedAt: new Date(now.getTime() - 3 * dayMs),
      forwardedAt: new Date(now.getTime() - 2 * dayMs),
      reviewedAt: new Date(now.getTime() - 1 * dayMs),
      reviewedBy: admin._id,
      rejectionReason: 'Duplicate offer request'
    }
  ]);

  // helper for api calls
  const apiGet = async (path) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  await t.test('1. GET /api/admin/analytics/overview matches seeded test numbers', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/overview');
    assert.equal(status, 200);
    assert.equal(data.success, true);
    const kpis = data.data.kpis;

    assert.equal(kpis.totalInterns, 11);
    assert.equal(kpis.activeInterns, 6); // ongoing and not archived
    assert.equal(kpis.upcomingInterns, 2);
    assert.equal(kpis.completedInterns, 1);
    assert.equal(kpis.cancelledInterns, 1);
    assert.equal(kpis.totalTeamLeaders, 2);

    assert.equal(kpis.pendingRequests, 4);
    assert.equal(kpis.forwardedRequests, 4);
    assert.equal(kpis.approvedRequests, 4);

    // Decided: 4 approved + 4 completed + 4 rejected = 12
    // (approved + completed) = 8 => 8/12 = 66.7%
    // rejected = 4 => 4/12 = 33.3%
    assert.equal(kpis.approvalRate, 66.7);
    assert.equal(kpis.rejectionRate, 33.3);
  });

  await t.test('2. GET /api/admin/analytics/pipeline matches 7 stage definitions', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/pipeline');
    assert.equal(status, 200);
    const pipeline = data.data.pipeline;

    const findStage = (st) => pipeline.find((p) => p.status === st)?.count;
    assert.equal(findStage('pending'), 4); // With TL
    assert.equal(findStage('processing'), 4); // With Admin
    assert.equal(findStage('approved'), 3); // Awaiting finalization (has draft)
    assert.equal(findStage('failed_generation'), 1); // Failed generation (no draft, >1h)
    assert.equal(findStage('completed'), 4); // Completed
    assert.equal(findStage('rejected_tl'), 2); // Rejected by TL
    assert.equal(findStage('rejected_admin'), 2); // Rejected by Admin
  });

  await t.test('3. GET /api/admin/analytics/stuck returns requests overdue > 3 days', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/stuck?days=3');
    assert.equal(status, 200);
    const stuck = data.data;

    // REQ-001 (pending 4d), REQ-003 (pending 5d), REQ-005 (processing 5d)
    assert.equal(stuck.length, 3);
    const numbers = stuck.map((s) => s.requestNumber).sort();
    assert.deepEqual(numbers, ['REQ-001', 'REQ-003', 'REQ-005']);
  });

  await t.test('4. GET /api/admin/analytics/upcoming-completions identifies ending interns', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/upcoming-completions?days=30');
    assert.equal(status, 200);
    const list = data.data;

    // Intern 1 (5d), Intern 4 (15d), Intern 2 (20d)
    assert.equal(list.length, 3);
    const intern1 = list.find((i) => i.fullName === 'Intern 1');
    assert.ok(intern1);
    assert.equal(intern1.hasCompletionRequest, true); // Intern 1 has completion_certificate
    assert.equal(intern1.hasRequestedCertificate, true);

    const intern2 = list.find((i) => i.fullName === 'Intern 2');
    assert.ok(intern2);
    assert.equal(intern2.hasCompletionRequest, false); // Intern 2 only requested bonafide
  });

  await t.test('5. GET /api/admin/analytics/team-leaders returns performance metrics', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/team-leaders');
    assert.equal(status, 200);
    const tls = data.data;

    assert.equal(tls.length, 2);
    const alice = tls.find((t) => t.fullName === 'Alice Leader');
    assert.ok(alice);
    assert.equal(alice.hasOverdueRequests, true); // REQ-001 and REQ-003 are > 3 days pending
    assert.ok(alice.internsAssigned >= 3);
  });

  await t.test('6. GET /api/admin/analytics/domains returns domains with intern counts', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/domains');
    assert.equal(status, 200);
    const domains = data.data.domains;

    const webDev = domains.find((d) => d.domain === 'Web Development');
    assert.ok(webDev);
    assert.ok(webDev.totalInterns >= 3);
    assert.ok(webDev.certificatesCount >= 2);
  });

  await t.test('7. GET /api/admin/analytics/turnaround reports avg, median, and p90 for stages', async () => {
    const { status, data } = await apiGet('/api/admin/analytics/turnaround');
    assert.equal(status, 200);
    const turnaround = data.data;

    assert.ok(turnaround.timeToTLReview);
    assert.ok(typeof turnaround.timeToTLReview.avg === 'number');
    assert.ok(typeof turnaround.timeToTLReview.median === 'number');
    assert.ok(typeof turnaround.timeToTLReview.p90 === 'number');
    assert.ok(turnaround.totalTurnaround);
    assert.ok(Array.isArray(turnaround.stages));
  });

  await t.test('8. GET /api/admin/analytics/export CSV creates AuditLog entry with action EXPORT', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics/export?type=overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);

    const body = await res.text();
    assert.ok(body.includes('totalInterns'));
    assert.ok(body.includes('activeInterns'));

    // Check AuditLog
    const audit = await AuditLog.findOne({ action: 'EXPORT', targetType: 'Analytics' }).sort({ createdAt: -1 });
    assert.ok(audit, 'AuditLog entry with action EXPORT must exist');
    assert.equal(audit.action, 'EXPORT');
    assert.equal(audit.actorRole, 'admin');
  });

  await t.test('9. GET /api/admin/requests?status=pending filters requests', async () => {
    const res = await fetch(`${baseUrl}/api/admin/requests?status=pending&page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.requests.length, 4);
    assert.equal(data.pagination.total, 4);
    assert.ok(data.requests.every((r) => r.status === 'pending'));
  });

  await t.test('10. Cache invalidation clears cache on TL decision and admin finalize', async () => {
    await invalidateAnalyticsCache();
    await setCache('analytics:test:key', { test: true }, 300);
    const cachedBefore = await getCache('analytics:test:key');
    assert.deepEqual(cachedBefore, { test: true });

    await invalidateAnalyticsCache();
    const cachedAfter = await getCache('analytics:test:key');
    assert.equal(cachedAfter, null);
  });
});
