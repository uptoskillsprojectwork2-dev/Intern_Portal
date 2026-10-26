import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AuditLog from '../src/models/AuditLog.js';
import { getAuditLogs, exportAuditLogs } from '../src/controllers/audit.controller.js';
import { logAudit } from '../src/utils/auditLogger.js';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';

const mockRes = () => ({
  statusCode: 200, body: null, headers: {}, sentContent: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(key, value) { this.headers[key] = value; },
  send(content) { this.sentContent = content; return this; },
});

test('audit list API filters and paginates', async () => {
  const originalFind = AuditLog.find;
  const originalCount = AuditLog.countDocuments;
  let queryFilter;
  let queryOptions;
  const rows = [{ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), action: 'LOGIN_SUCCESS' }];
  AuditLog.find = (filter) => {
    queryFilter = filter;
    queryOptions = {};
    return {
      sort(value) { queryOptions.sort = value; return this; },
      skip(value) { queryOptions.skip = value; return this; },
      limit(value) { queryOptions.limit = value; return this; },
      populate() { return this; },
      lean: async () => rows,
    };
  };
  AuditLog.countDocuments = async (filter) => { assert.deepEqual(filter, queryFilter); return 51; };
  try {
    const res = mockRes();
    await getAuditLogs({ query: { page: '2', limit: '25', action: 'LOGIN_SUCCESS', from: '2026-01-02', to: '2026-01-03' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.logs, rows);
    assert.deepEqual(res.body.pagination, { page: 2, limit: 25, total: 51, pages: 3 });
    assert.equal(queryOptions.skip, 25);
    assert.equal(queryOptions.limit, 25);
    assert.equal(queryFilter.action, 'LOGIN_SUCCESS');
    assert.equal(queryFilter.createdAt.$lte.toISOString(), '2026-01-03T23:59:59.999Z');
  } finally { AuditLog.find = originalFind; AuditLog.countDocuments = originalCount; }
});

test('audit list rejects malformed dates, ranges, and page sizes above 100', async () => {
  for (const query of [
    { from: '2026-02-31' }, { from: '2026-02-02', to: '2026-02-01' }, { limit: '101' }, { page: '0' },
  ]) {
    const res = mockRes();
    await getAuditLogs({ query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
});

test('audit CSV export emits headers and neutralizes formula cells', async () => {
  const originalFind = AuditLog.find;
  const originalCreate = AuditLog.create;
  AuditLog.find = () => ({
    sort() { return this; }, limit() { return this; }, populate() { return this; },
    lean: async () => [{
      createdAt: new Date('2026-01-01T00:00:00Z'), actorRole: 'system', action: '=IMPORTXML(1)',
      targetType: 'Authentication', targetId: null, description: null, meta: { text: '+cmd' }, ip: '', ipAddress: '', userAgent: '',
    }],
  });
  AuditLog.create = async () => ({});
  try {
    const res = mockRes();
    await exportAuditLogs({ query: {}, user: { id: new mongoose.Types.ObjectId().toString() } }, res);
    assert.equal(res.headers['Content-Type'], 'text/csv; charset=utf-8');
    assert.match(res.headers['Content-Disposition'], /audit-logs\.csv/);
    assert.match(res.sentContent, /'=IMPORTXML\(1\)/);
    assert.match(res.sentContent, /"\+cmd"/);
  } finally { AuditLog.find = originalFind; AuditLog.create = originalCreate; }
});

test('audit logger strips sensitive metadata and records the request actor role', async () => {
  const originalCreate = AuditLog.create;
  const originalReadyState = mongoose.connection.readyState;
  let stored;
  AuditLog.create = async (doc) => { stored = doc; };
  mongoose.connection.readyState = 1;
  try {
    await logAudit({ userId: new mongoose.Types.ObjectId().toString(), action: 'TEST', meta: { password: 'pw', internCode: 'private-code', nested: { resetToken: 'token', visible: true }, note: 'token=do-not-store Bearer abc.def', safe: 'yes' }, description: 'authorization: Bearer secret-value', req: { user: { role: 'admin' } } });
    assert.equal(stored.actorRole, 'admin');
    assert.deepEqual(stored.meta, { nested: { visible: true }, note: 'token=[REDACTED] Bearer [REDACTED]', safe: 'yes' });
    assert.equal(stored.description, 'authorization: [REDACTED]');
  } finally { AuditLog.create = originalCreate; mongoose.connection.readyState = originalReadyState; }
});

test('system audit events retain a null actor id instead of trying to cast the actor descriptor', async () => {
  const originalCreate = AuditLog.create;
  const originalReadyState = mongoose.connection.readyState;
  let stored;
  AuditLog.create = async (doc) => { stored = doc; };
  mongoose.connection.readyState = 1;
  try {
    await logAudit({ actor: { _id: null, role: 'system' }, action: 'INTERN_ARCHIVED' });
    assert.equal(stored.actorId, null);
    assert.equal(stored.userId, null);
    assert.equal(stored.actorRole, 'system');
  } finally { AuditLog.create = originalCreate; mongoose.connection.readyState = originalReadyState; }
});

test('audit logger failure does not wait for a disconnected database', async () => {
  const originalCreate = AuditLog.create;
  const originalReadyState = mongoose.connection.readyState;
  AuditLog.create = async () => { throw new Error('should not attempt write'); };
  mongoose.connection.readyState = 0;
  try { await logAudit({ action: 'TEST' }); }
  finally { AuditLog.create = originalCreate; mongoose.connection.readyState = originalReadyState; }
});

test('audit schema has append-only write hooks and no expiry index', async () => {
  const indexes = AuditLog.schema.indexes();
  assert.equal(indexes.some(([, options]) => options.expireAfterSeconds !== undefined), false);
  for (const operation of ['updateOne', 'deleteOne', 'replaceOne', 'findOneAndReplace', 'bulkWrite']) {
    const hooks = AuditLog.schema.s.hooks._pres.get(operation) || [];
    const blockHook = hooks.find(({ fn }) => fn.toString().includes('append-only'));
    assert.ok(blockHook, `${operation} is blocked`);
    assert.throws(() => blockHook.fn.call({}), /append-only/);
  }
  const saveHook = (AuditLog.schema.s.hooks._pres.get('save') || []).find(({ fn }) => fn.toString().includes('this.isNew'));
  assert.ok(saveHook, 'save middleware prevents updating an existing record');
  await assert.rejects(saveHook.fn.call({ isNew: false }), /append-only/);
});

test('audit endpoints require authentication', async () => {
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/admin/audit-logs`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(`${base}/export`)).status, 401);
    const originalFindById = User.findById;
    User.findById = () => ({ select: async () => ({ role: 'intern' }) });
    try {
      const token = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'intern' }, process.env.JWT_SECRET);
      const denied = await fetch(base, { headers: { Cookie: `token=${token}` } });
      assert.equal(denied.status, 403);
    } finally { User.findById = originalFindById; }
  } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
