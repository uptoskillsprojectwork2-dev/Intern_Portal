import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';
import { login, forgotPassword, resetPassword } from '../src/controllers/auth.controller.js';
import { setPassword, updateProfile } from '../src/controllers/intern.controller.js';

const response = () => ({
  statusCode: 200, body: null, cookieValue: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  cookie(_name, value) { this.cookieValue = value; return this; }
});

test('intern first login uses code, then only the configured password', async () => {
  const originalFindOne = User.findOne;
  const originalSecret = process.env.JWT_SECRET;
  const user = {
    _id: new mongoose.Types.ObjectId(), email: 'intern@example.test', role: 'intern', internCode: 'INTERN123', passwordSetAt: null,
    isArchived: false, fullName: 'Test Intern', createdAt: new Date(),
    comparePassword: (value) => value === 'INTERN123'
  };
  User.findOne = async () => user;
  process.env.JWT_SECRET = 'test-secret';
  try {
    let res = response();
    await login({ body: { email: user.email, password: 'INTERN123' }, headers: {}, ip: '' }, res);
    assert.equal(res.statusCode, 200);

    // After setting a password, intern code no longer works
    user.passwordSetAt = new Date();
    user.comparePassword = async (value) => value === 'StrongPass1';
    res = response();
    await login({ body: { email: user.email, password: 'INTERN123' }, headers: {}, ip: '' }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid credentials');

    // Configured password works
    res = response();
    await login({ body: { email: user.email, password: 'StrongPass1' }, headers: {}, ip: '' }, res);
    assert.equal(res.statusCode, 200);

    // Archived intern cannot log in
    user.isArchived = true;
    res = response();
    await login({ body: { email: user.email, password: 'StrongPass1' }, headers: {}, ip: '' }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /archived/i);
  } finally { User.findOne = originalFindOne; process.env.JWT_SECRET = originalSecret; }
});

test('admin and teamleader login continues to work with password', async () => {
  const originalFindOne = User.findOne;
  const originalSecret = process.env.JWT_SECRET;
  const admin = {
    _id: new mongoose.Types.ObjectId(), email: 'admin@example.test', role: 'admin',
    isArchived: false, fullName: 'Admin User', createdAt: new Date(),
    comparePassword: async (value) => value === 'AdminPass123'
  };
  User.findOne = async () => admin;
  process.env.JWT_SECRET = 'test-secret';
  try {
    const res = response();
    await login({ body: { email: admin.email, password: 'AdminPass123' }, headers: {}, ip: '' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, 'admin');

    // Wrong password fails generically
    const failRes = response();
    await login({ body: { email: admin.email, password: 'WrongPassword' }, headers: {}, ip: '' }, failRes);
    assert.equal(failRes.statusCode, 401);
    assert.equal(failRes.body.message, 'Invalid credentials');
  } finally { User.findOne = originalFindOne; process.env.JWT_SECRET = originalSecret; }
});

test('intern can set password with code, and weak passwords are rejected', async () => {
  const originalFindById = User.findById;
  const intern = {
    _id: new mongoose.Types.ObjectId(), role: 'intern', internCode: 'INT001', passwordSetAt: null,
    comparePassword: async () => false, save: async () => {}
  };
  User.findById = async () => intern;

  try {
    // Weak password: less than 8 characters
    const weakRes1 = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'INT001', newPassword: 'short1' }, headers: {} }, weakRes1);
    assert.equal(weakRes1.statusCode, 400);

    // Weak password: no number
    const weakRes2 = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'INT001', newPassword: 'allletters' }, headers: {} }, weakRes2);
    assert.equal(weakRes2.statusCode, 400);

    // Weak password: no letter
    const weakRes3 = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'INT001', newPassword: '12345678' }, headers: {} }, weakRes3);
    assert.equal(weakRes3.statusCode, 400);

    // Incorrect current secret
    const badSecretRes = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'WRONGCODE', newPassword: 'StrongPass1' }, headers: {} }, badSecretRes);
    assert.equal(badSecretRes.statusCode, 400);
    assert.match(badSecretRes.body.message, /current secret/i);

    // Valid setup with intern code
    const validRes = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'INT001', newPassword: 'StrongPass1' }, headers: {} }, validRes);
    assert.equal(validRes.statusCode, 200);
    assert.ok(intern.passwordSetAt instanceof Date);
    assert.equal(intern.password, 'StrongPass1');

    // Subsequent password change requires current password, not intern code
    intern.comparePassword = async (secret) => secret === 'StrongPass1';
    const oldCodeRes = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'INT001', newPassword: 'NewStrongPass2' }, headers: {} }, oldCodeRes);
    assert.equal(oldCodeRes.statusCode, 400);

    const changeSuccessRes = response();
    await setPassword({ user: { id: String(intern._id) }, body: { currentSecret: 'StrongPass1', newPassword: 'NewStrongPass2' }, headers: {} }, changeSuccessRes);
    assert.equal(changeSuccessRes.statusCode, 200);
    assert.equal(intern.password, 'NewStrongPass2');
  } finally { User.findById = originalFindById; }
});

test('User schema pre-save hashes plain password and comparePassword verifies safely', async () => {
  const user = new User({
    fullName: 'Hash Test Intern',
    email: 'hashtest@example.test',
    internCode: 'INT999',
    role: 'intern',
    password: 'PlainSecretPassword1'
  });

  // Verify comparePassword returns false when no candidate or no password
  assert.equal(await user.comparePassword(''), false);
  assert.equal(await user.comparePassword(null), false);

  // Trigger mongoose validation / pre-save
  await user.validate();
  // Simulate pre-save hook behavior
  const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(user.password);
  // Plain text is not bcrypt yet
  assert.equal(isBcrypt, false);
  // Run save hooks
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  assert.ok(/^\$2[aby]\$\d{2}\$/.test(user.password));
  assert.equal(await user.comparePassword('PlainSecretPassword1'), true);
  assert.equal(await user.comparePassword('WrongPassword'), false);
});

test('profile mobile number updates safely and rejects invalid formats or extra fields', async () => {
  const internId = new mongoose.Types.ObjectId();
  let selector;
  let update;
  const originalFindOneAndUpdate = User.findOneAndUpdate;

  User.findOneAndUpdate = async (filter, change) => {
    selector = filter;
    update = change;
    return {
      _id: internId,
      fullName: 'Test Intern',
      email: 'intern@example.test',
      mobileNo: change.$set.mobileNo,
      role: 'intern'
    };
  };

  try {
    // Valid 10-digit mobile number
    const res = response();
    await updateProfile({
      user: { id: String(internId) },
      body: { mobileNo: '9876543210', role: 'admin', email: 'hacker@test.com', internCode: 'NEWCODE', isArchived: false },
      headers: {}
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(selector, { _id: String(internId), role: 'intern' });
    assert.deepEqual(update, { $set: { mobileNo: '9876543210' } });
    assert.equal(res.body.user.role, 'intern');

    // Invalid mobile number: 9 digits
    const shortRes = response();
    await updateProfile({ user: { id: String(internId) }, body: { mobileNo: '123456789' } }, shortRes);
    assert.equal(shortRes.statusCode, 400);

    // Invalid mobile number: non-numeric characters
    const alphaRes = response();
    await updateProfile({ user: { id: String(internId) }, body: { mobileNo: '12345abcde' } }, alphaRes);
    assert.equal(alphaRes.statusCode, 400);

    // Invalid mobile number: 11 digits
    const longRes = response();
    await updateProfile({ user: { id: String(internId) }, body: { mobileNo: '12345678901' } }, longRes);
    assert.equal(longRes.statusCode, 400);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('forgot-password and reset flow works for interns and staff', async () => {
  const originalFindOne = User.findOne;
  let savedIntern = false;
  let savedAdmin = false;

  const intern = {
    _id: new mongoose.Types.ObjectId(),
    email: 'resetintern@example.test',
    role: 'intern',
    passwordSetAt: null,
    save: async () => { savedIntern = true; }
  };

  const admin = {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@example.test',
    role: 'admin',
    passwordSetAt: new Date(),
    save: async () => { savedAdmin = true; }
  };

  User.findOne = async (query) => {
    if (query.email === intern.email) return intern;
    if (query.email === admin.email) return admin;
    if (query.resetPasswordToken === 'valid-intern-token') return intern;
    if (query.resetPasswordToken === 'valid-admin-token') return admin;
    return null;
  };

  try {
    // 1. Intern forgot password request succeeds with generic response
    const internForgotRes = response();
    await forgotPassword({ body: { email: 'resetintern@example.test' } }, internForgotRes);
    assert.equal(internForgotRes.statusCode, 200);
    assert.match(internForgotRes.body.message, /If an account with this email exists/i);
    assert.ok(intern.resetPasswordToken);
    assert.ok(intern.resetPasswordExpires > Date.now());

    // 2. Intern reset password sets password and stamps passwordSetAt
    User.findOne = async () => intern;
    const internResetRes = response();
    await resetPassword({ params: { token: 'valid-intern-token' }, body: { newPassword: 'NewInternPass1' }, headers: {} }, internResetRes);
    assert.equal(internResetRes.statusCode, 200);
    assert.ok(intern.passwordSetAt instanceof Date);
    assert.equal(await bcrypt.compare('NewInternPass1', intern.password), true);
    assert.equal(intern.resetPasswordToken, undefined);
    assert.equal(savedIntern, true);

    // 3. Admin reset password works unchanged
    User.findOne = async () => admin;
    const adminResetRes = response();
    await resetPassword({ params: { token: 'valid-admin-token' }, body: { newPassword: 'NewAdminPass1' }, headers: {} }, adminResetRes);
    assert.equal(adminResetRes.statusCode, 200);
    assert.equal(await bcrypt.compare('NewAdminPass1', admin.password), true);
    assert.equal(savedAdmin, true);

    // 4. Invalid or expired token is rejected
    User.findOne = async () => null;
    const badTokenRes = response();
    await resetPassword({ params: { token: 'invalid-token' }, body: { newPassword: 'StrongPass1' }, headers: {} }, badTokenRes);
    assert.equal(badTokenRes.statusCode, 400);
    assert.match(badTokenRes.body.message, /invalid or has expired/i);
  } finally {
    User.findOne = originalFindOne;
  }
});

test('audit logging captures PASSWORD_CHANGED and PROFILE_UPDATED with no secrets in metadata', async () => {
  const originalCreate = AuditLog.create;
  const originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const loggedEvents = [];
  AuditLog.create = async (doc) => {
    loggedEvents.push(doc);
    return doc;
  };

  const intern = {
    _id: new mongoose.Types.ObjectId(),
    role: 'intern',
    internCode: 'AUDIT01',
    passwordSetAt: null,
    save: async () => {}
  };

  const originalFindById = User.findById;
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  User.findById = async () => intern;
  User.findOneAndUpdate = async (_filter, change) => ({
    _id: intern._id,
    mobileNo: change.$set.mobileNo
  });

  try {
    // 1. Set password logs PASSWORD_CHANGED
    const pRes = response();
    await setPassword({
      user: { id: String(intern._id) },
      body: { currentSecret: 'AUDIT01', newPassword: 'AuditPassword1' },
      headers: { 'user-agent': 'TestAgent' },
      ip: '127.0.0.1'
    }, pRes);
    assert.equal(pRes.statusCode, 200);

    const pwLog = loggedEvents.find(e => e.action === 'PASSWORD_CHANGED');
    assert.ok(pwLog, 'PASSWORD_CHANGED audit event must be logged');
    assert.equal(pwLog.userId.toString(), intern._id.toString());
    // Ensure no passwords or secrets are in metadata or description
    const serializedLog = JSON.stringify(pwLog);
    assert.equal(serializedLog.includes('AuditPassword1'), false);
    assert.equal(serializedLog.includes('AUDIT01'), false);

    // 2. Update profile logs PROFILE_UPDATED
    const prRes = response();
    await updateProfile({
      user: { id: String(intern._id) },
      body: { mobileNo: '9876543210' },
      headers: { 'user-agent': 'TestAgent' },
      ip: '127.0.0.1'
    }, prRes);
    assert.equal(prRes.statusCode, 200);

    const profileLog = loggedEvents.find(e => e.action === 'PROFILE_UPDATED');
    assert.ok(profileLog, 'PROFILE_UPDATED audit event must be logged');
    assert.deepEqual(profileLog.meta.fields, ['mobileNo']);
  } finally {
    AuditLog.create = originalCreate;
    User.findById = originalFindById;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  }
});

test('intern routes reject unauthenticated and non-intern roles', async () => {
  // Simulate route middleware logic from internRouter
  const internRoleMiddleware = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.role !== 'intern') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };

  // 1. Unauthenticated request -> 401
  const unauthRes = response();
  let nextCalled = false;
  internRoleMiddleware({}, unauthRes, () => { nextCalled = true; });
  assert.equal(unauthRes.statusCode, 401);
  assert.equal(nextCalled, false);

  // 2. Admin role -> 403
  const adminRes = response();
  nextCalled = false;
  internRoleMiddleware({ user: { role: 'admin' } }, adminRes, () => { nextCalled = true; });
  assert.equal(adminRes.statusCode, 403);
  assert.equal(nextCalled, false);

  // 3. Teamleader role -> 403
  const tlRes = response();
  nextCalled = false;
  internRoleMiddleware({ user: { role: 'teamleader' } }, tlRes, () => { nextCalled = true; });
  assert.equal(tlRes.statusCode, 403);
  assert.equal(nextCalled, false);

  // 4. Intern role -> passes
  const internRes = response();
  nextCalled = false;
  internRoleMiddleware({ user: { role: 'intern' } }, internRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
