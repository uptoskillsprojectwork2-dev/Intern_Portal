import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AuditLog from '../src/models/AuditLog.model.js';
import { logAction, sanitizeMeta } from '../src/utils/logAction.js';
import User from '../src/models/User.js';
import { getAuditLogs, exportAuditLogs } from '../src/controllers/admin.controller.js';

test('Task D: Unit & Integration Tests for Audit Logs', async (t) => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uptoskill');

  await t.test('1. sanitizeMeta strips sensitive keys recursively', () => {
    const dirty = {
      password: 'plain_password',
      token: 'jwt_token',
      internCode: 'INT-999',
      resetPasswordToken: 'reset-123',
      client_secret: 'api_secret',
      webhookSecret: 'top_secret',
      safeName: 'Alice',
      safeCount: 42,
      nested: {
        password: 'nested_password',
        authSecret: 'nested_secret',
        detail: 'all_good'
      },
      arrayField: [
        { token: 'arr_token', valid: true },
        'string_val'
      ]
    };

    const cleaned = sanitizeMeta(dirty);

    assert.equal(cleaned.password, undefined);
    assert.equal(cleaned.token, undefined);
    assert.equal(cleaned.internCode, undefined);
    assert.equal(cleaned.resetPasswordToken, undefined);
    assert.equal(cleaned.client_secret, undefined);
    assert.equal(cleaned.webhookSecret, undefined);
    assert.equal(cleaned.safeName, 'Alice');
    assert.equal(cleaned.safeCount, 42);

    assert.equal(cleaned.nested.password, undefined);
    assert.equal(cleaned.nested.authSecret, undefined);
    assert.equal(cleaned.nested.detail, 'all_good');

    assert.equal(cleaned.arrayField[0].token, undefined);
    assert.equal(cleaned.arrayField[0].valid, true);
    assert.equal(cleaned.arrayField[1], 'string_val');
  });

  await t.test('2. AuditLog model append-only enforcement blocks mutations', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await assert.rejects(
      async () => {
        await AuditLog.updateOne({ _id: fakeId }, { action: 'MUTATE' });
      },
      /append-only/i,
      'updateOne must be blocked'
    );

    await assert.rejects(
      async () => {
        await AuditLog.findOneAndUpdate({ _id: fakeId }, { action: 'MUTATE' });
      },
      /append-only/i,
      'findOneAndUpdate must be blocked'
    );

    await assert.rejects(
      async () => {
        await AuditLog.deleteOne({ _id: fakeId });
      },
      /append-only/i,
      'deleteOne must be blocked'
    );

    await assert.rejects(
      async () => {
        await AuditLog.deleteMany({ _id: fakeId });
      },
      /append-only/i,
      'deleteMany must be blocked'
    );
  });

  await t.test('3. logAction never throws and logs entry properly', async () => {
    // Should not throw even with empty invocation
    await assert.doesNotReject(async () => {
      await logAction();
    });

    const testAdmin = await User.findOne({ role: 'admin' });
    const uniqueAction = 'LOGIN';

    await logAction({
      actor: testAdmin,
      action: uniqueAction,
      targetType: 'User',
      targetId: testAdmin?._id,
      meta: {
        email: testAdmin?.email,
        password: 'should_be_stripped',
        internCode: 'should_be_stripped'
      },
      req: {
        ip: '192.168.1.10',
        headers: { 'user-agent': 'AutomatedTest/1.0' }
      }
    });

    const created = await AuditLog.findOne({ action: uniqueAction }).sort({ createdAt: -1 });
    assert.ok(created);
    assert.equal(created.action, 'LOGIN');
    assert.equal(created.ip, '192.168.1.10');
    assert.equal(created.userAgent, 'AutomatedTest/1.0');
    assert.equal(created.meta.password, undefined);
    assert.equal(created.meta.internCode, undefined);
    assert.equal(created.meta.email, testAdmin?.email);
  });

  await t.test('4. System actor logs correctly with null actorId and system role', async () => {
    await logAction({
      actor: { role: 'system' },
      action: 'INTERN_ARCHIVED',
      targetType: 'User',
      targetId: new mongoose.Types.ObjectId(),
      meta: { reason: 'retention_grace_period_expired' }
    });

    const systemLog = await AuditLog.findOne({ action: 'INTERN_ARCHIVED' }).sort({ createdAt: -1 });
    assert.ok(systemLog);
    assert.equal(systemLog.actorId, null);
    assert.equal(systemLog.actorRole, 'system');
    assert.equal(systemLog.action, 'INTERN_ARCHIVED');
  });

  await t.test('5. getAuditLogs endpoint validates parameters and returns paginated response', async () => {
    // Test invalid limit (> 100)
    let resData = null;
    let statusCode = 200;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resData = data;
        return this;
      }
    };

    await getAuditLogs({ query: { limit: '150' } }, mockRes);
    assert.equal(statusCode, 400);
    assert.match(resData.message, /limit/i);

    // Test from date > to date
    await getAuditLogs({ query: { from: '2026-10-15', to: '2026-10-10' } }, mockRes);
    assert.equal(statusCode, 400);
    assert.match(resData.message, /before or equal/i);

    // Test valid request
    await getAuditLogs({ query: { page: '1', limit: '10' } }, mockRes);
    assert.equal(statusCode, 200);
    assert.ok(Array.isArray(resData.logs));
    assert.equal(typeof resData.page, 'number');
    assert.equal(typeof resData.totalPages, 'number');
    assert.equal(typeof resData.total, 'number');
    assert.ok(resData.total >= 1);
  });

  await t.test('6. exportAuditLogs downloads CSV and records EXPORT log', async () => {
    const testAdmin = await User.findOne({ role: 'admin' });
    let headers = {};
    let sentBody = '';
    let statusCode = 200;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(k, v) {
        headers[k] = v;
      },
      send(body) {
        sentBody = body;
        return this;
      }
    };

    const countBeforeExport = await AuditLog.countDocuments({ action: 'EXPORT' });

    await exportAuditLogs({
      query: { action: 'LOGIN' },
      user: { id: testAdmin?._id, role: 'admin' }
    }, mockRes);

    assert.equal(statusCode, 200);
    assert.match(headers['Content-Type'], /text\/csv/);
    assert.match(headers['Content-Disposition'], /attachment; filename="audit-logs.csv"/);
    assert.ok(sentBody.includes('Timestamp (ISO),Actor Name,Actor Email,Actor Role,Action'));

    // Verify EXPORT log was created
    const countAfterExport = await AuditLog.countDocuments({ action: 'EXPORT' });
    assert.equal(countAfterExport, countBeforeExport + 1);
  });

  await mongoose.disconnect();
});
