import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Certificate from '../src/models/Certificate.js';
import CertificateRequest from '../src/models/CertificateRequest.js';

test('seeded analytics API reports match independently calculated metrics', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'deterministic-analytics-integration-secret';
  if (process.env.ANALYTICS_TEST_MONGO_URI) {
    const configuredUri = new URL(process.env.ANALYTICS_TEST_MONGO_URI);
    const databaseName = configuredUri.pathname.replace(/^\//, '');
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(configuredUri.hostname), 'integration fixtures may only use loopback MongoDB');
    assert.ok(databaseName.startsWith('taskg_analytics_test_'), 'integration fixtures require a dedicated taskg_analytics_test_ database');
  }
  const mongo = process.env.ANALYTICS_TEST_MONGO_URI ? null : await MongoMemoryServer.create();
  await mongoose.connect(process.env.ANALYTICS_TEST_MONGO_URI || mongo.getUri());
  try {
    const [admin, leader, intern, otherIntern] = await Promise.all([
      User.create({ fullName: 'Analytics Admin', email: 'admin-fixture@example.test', internCode: 'ADMIN-FIXTURE', role: 'admin' }),
      User.create({ fullName: 'Analytics TL', email: 'tl-fixture@example.test', internCode: 'TL-FIXTURE', role: 'teamleader' }),
      User.create({ fullName: 'Fixture Intern', email: 'intern-fixture@example.test', internCode: 'IN-001', role: 'intern', domain: 'Engineering', internshipDetails: { status: 'ongoing' } }),
      User.create({ fullName: 'Other Intern', email: 'other-fixture@example.test', internCode: 'IN-002', role: 'intern', domain: 'Design', internshipDetails: { status: 'completed' } })
    ]);
    intern.internshipDetails.teamLeaderId = leader._id;
    intern.internshipDetails.teamLeader = leader._id;
    await intern.save();

    const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000);
    const issuedAt = hoursAgo(40);
    const issuedCertificate = await Certificate.create({
      certificateNumber: 'CERT-ANALYTICS-001', verificationCode: 'VERIFY-ANALYTICS-001',
      userId: intern._id, internCode: intern.internCode, certificateType: 'completion_certificate',
      domain: intern.domain, status: 'issued', issuedDate: issuedAt, finalizedAt: issuedAt
    });
    const draftCertificate = await Certificate.create({
      certificateNumber: 'CERT-ANALYTICS-002', verificationCode: 'VERIFY-ANALYTICS-002',
      userId: intern._id, internCode: intern.internCode, certificateType: 'bonafide',
      domain: intern.domain, status: 'draft', issuedDate: hoursAgo(24)
    });
    const requestRows = [
      { requestNumber: 'REQ-PENDING', status: 'pending', requestedAt: hoursAgo(120) },
      { requestNumber: 'REQ-PROCESSING', status: 'processing', requestedAt: hoursAgo(100), forwardedAt: hoursAgo(80) },
      { requestNumber: 'REQ-TL-REJECT', status: 'rejected', requestedAt: hoursAgo(72), reviewedAt: hoursAgo(48) },
      { requestNumber: 'REQ-ADMIN-REJECT', status: 'rejected', requestedAt: hoursAgo(60), forwardedAt: hoursAgo(50), reviewedAt: hoursAgo(24) },
      { requestNumber: 'REQ-COMPLETED', status: 'completed', requestedAt: hoursAgo(96), forwardedAt: hoursAgo(88), reviewedAt: hoursAgo(80), completedAt: hoursAgo(48), certificateId: issuedCertificate._id },
      { requestNumber: 'REQ-APPROVED-DRAFT', status: 'approved', requestedAt: hoursAgo(36), forwardedAt: hoursAgo(30), reviewedAt: hoursAgo(24), certificateId: draftCertificate._id }
    ];
    await CertificateRequest.insertMany(requestRows.map((row) => ({
      ...row, userId: intern._id, internCode: intern.internCode,
      certificateType: row.requestNumber === 'REQ-COMPLETED' ? 'completion_certificate' : 'bonafide'
    })));

    const token = jwt.sign({ id: String(admin._id), role: 'admin' }, process.env.JWT_SECRET);
    const api = (path) => request(app).get(path).set('Cookie', `token=${token}`);
    const [overviewResponse, pipelineResponse, trendResponse, typesResponse, turnaroundResponse, filteredResponse] = await Promise.all([
      api('/api/admin/analytics/overview').query({ range: 'all' }),
      api('/api/admin/analytics/pipeline').query({ range: 'all' }),
      api('/api/admin/analytics/requests-trend').query({ range: 'all', groupBy: 'month' }),
      api('/api/admin/analytics/certificate-types').query({ range: 'all' }),
      api('/api/admin/analytics/turnaround').query({ range: 'all' }),
      api('/api/admin/analytics/overview').query({ range: 'all', domain: 'Engineering', teamLeaderId: String(leader._id) })
    ]);
    for (const response of [overviewResponse, pipelineResponse, trendResponse, typesResponse, turnaroundResponse, filteredResponse]) {
      assert.equal(response.status, 200, response.body?.message);
    }

    const overview = overviewResponse.body.data.kpis;
    assert.deepEqual({
      totalInterns: overview.totalInterns,
      ongoingInterns: overview.ongoingInterns,
      totalTeamLeaders: overview.totalTeamLeaders,
      pendingRequests: overview.pendingRequests,
      approvedRequests: overview.approvedRequests,
      forwardedRequests: overview.forwardedRequests,
      certificatesIssuedThisMonth: overview.certificatesIssuedThisMonth,
      approvalRate: overview.approvalRate,
      rejectionRate: overview.rejectionRate,
      avgTurnaroundHours: overview.avgTurnaroundHours
    }, {
      totalInterns: 2, ongoingInterns: 1, totalTeamLeaders: 1,
      pendingRequests: 1, approvedRequests: 1, forwardedRequests: 1,
      certificatesIssuedThisMonth: 1, approvalRate: 50, rejectionRate: 50,
      avgTurnaroundHours: 48
    });

    const pipeline = pipelineResponse.body.data;
    const expectedPipeline = {
      pending: 1, processing: 1, approved: 1, completed: 1,
      'rejected-tl': 1, 'rejected-admin': 1, cancelled: 0
    };
    assert.deepEqual(Object.fromEntries(pipeline.pipeline.map(({ status, count }) => [status, count])), expectedPipeline);
    assert.equal(pipeline.failedGenerations, 1);

    const trend = trendResponse.body.data;
    assert.equal(trend.raw.length, 1);
    assert.equal(trend.raw[0].total, 6);
    assert.deepEqual(Object.fromEntries(trend.series.map(({ status, data }) => [status, data[0]])), {
      pending: 1, approved: 1, rejected: 2, processing: 1, completed: 1, cancelled: 0
    });

    const certificateTypes = typesResponse.body.data;
    assert.equal(certificateTypes.total, 1);
    assert.deepEqual(certificateTypes.breakdown.map(({ certificateType, count, percentage }) => ({ certificateType, count, percentage })), [
      { certificateType: 'completion_certificate', count: 1, percentage: 100 }
    ]);

    // Expected values are calculated directly from the fixture timestamps, not analytics helpers.
    const expectedPercentiles = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      const at = (p) => {
        const position = p * (sorted.length - 1);
        const lower = Math.floor(position);
        return Number((sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower)).toFixed(1));
      };
      return {
        avg: Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(1)),
        median: at(0.5), p90: at(0.9)
      };
    };
    const turnaround = turnaroundResponse.body.data;
    assert.deepEqual(turnaround.tlDecisionTime, expectedPercentiles([20, 24, 10, 8, 6]));
    assert.deepEqual(turnaround.adminDecisionTime, expectedPercentiles([26, 8, 6]));
    assert.deepEqual(turnaround.generationTime, expectedPercentiles([40]));
    assert.deepEqual(turnaround.totalTurnaround, expectedPercentiles([56]));

    assert.equal(filteredResponse.body.data.kpis.totalInterns, 1);
    assert.equal(filteredResponse.body.data.kpis.totalTeamLeaders, 1);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
