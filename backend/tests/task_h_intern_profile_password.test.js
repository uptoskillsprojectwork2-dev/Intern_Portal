import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import app from '../src/app.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.model.js';

const TEST_DB_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/uptoskill_test_task_h';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-with-a-long-random-secret';

// Configure mock Brevo environment
process.env.BREVO_SMTP_USER = 'mock_smtp_user';
process.env.BREVO_SMTP_KEY = 'mock_smtp_key';
process.env.BREVO_SENDER_EMAIL = 'governance@uptoskills.com';

// Stub nodemailer so no actual emails are sent during tests
const sentEmails = [];
nodemailer.createTransport = () => ({
  sendMail: async (options) => {
    sentEmails.push({ ...options, sentAt: new Date() });
    return { messageId: 'mock-mail-task-h-' + Math.random().toString(36).substring(2, 9) };
  }
});

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

test('Task H: Intern Profile and Password Setup Comprehensive Suite', async (t) => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();

  let server;
  let baseUrl;

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

  // Setup initial users
  const admin = await User.create({
    fullName: 'Admin User',
    email: 'admin_taskh@uptoskills.com',
    password: 'AdminPassword123',
    role: 'admin'
  });
  const adminToken = createToken(admin);

  const teamleader = await User.create({
    fullName: 'TL User',
    email: 'tl_taskh@uptoskills.com',
    password: 'TLPassword123',
    role: 'teamleader'
  });

  let newIntern;
  let internToken;

  await t.test('1. A new intern is created without password and has internCode', async () => {
    const res = await fetch(`${baseUrl}/api/admin/create-intern`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: 'Bob Intern',
        email: 'bob_intern@uptoskills.com',
        mobileNo: '9876543210',
        domain: 'Web Development',
        startDate: '2026-01-01',
        endDate: '2026-06-01',
        teamleaderEmail: teamleader.email
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user.id);

    newIntern = await User.findById(data.user.id);
    assert.ok(newIntern);
    assert.ok(newIntern.internCode, 'internCode must be generated');
    assert.equal(newIntern.passwordSetAt, null);
    assert.equal(newIntern.password, undefined, 'password must not be set initially');
  });

  await t.test('2. New intern logs in with intern code as the secret', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com',
        password: newIntern.internCode
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.role, 'intern');
    assert.equal(data.user.email, 'bob_intern@uptoskills.com');
    internToken = data.token;

    // Check AuditLog entry
    const log = await AuditLog.findOne({
      actorId: newIntern._id,
      action: 'LOGIN'
    });
    assert.ok(log, 'LOGIN audit log should be recorded');
  });

  await t.test('3. Login with wrong intern code fails with generic message', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com',
        password: 'WRONG_INTERN_CODE'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.message, 'Invalid credentials');
  });

  await t.test('4. GET /api/intern/profile returns hasPassword false before setting password', async () => {
    const res = await fetch(`${baseUrl}/api/intern/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${internToken}`
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.hasPassword, false);
    assert.equal(data.user.passwordSetAt, null);
    assert.equal(data.user.internCode, newIntern.internCode);
  });

  await t.test('5. Setting password rejects invalid currentSecret (must be internCode initially)', async () => {
    const res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: 'wrongSecret',
        newPassword: 'ValidPass123'
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /invalid current credentials/i);
  });

  await t.test('6. Setting password enforces password complexity rules (min 8 chars, 1 letter, 1 number)', async () => {
    // Too short
    let res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: newIntern.internCode,
        newPassword: 'short'
      })
    });
    assert.equal(res.status, 400);

    // Only letters (no number)
    res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: newIntern.internCode,
        newPassword: 'onlylettershere'
      })
    });
    assert.equal(res.status, 400);

    // Only numbers (no letter)
    res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: newIntern.internCode,
        newPassword: '1234567890'
      })
    });
    assert.equal(res.status, 400);
  });

  await t.test('7. Intern successfully sets password with valid internCode and newPassword', async () => {
    const res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: newIntern.internCode,
        newPassword: 'MyNewSecurePass1'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /password updated successfully/i);

    // Verify DB state
    const updated = await User.findById(newIntern._id);
    assert.ok(updated.password);
    assert.ok(updated.passwordSetAt instanceof Date);

    // Verify AuditLog PASSWORD_CHANGED
    const log = await AuditLog.findOne({
      actorId: newIntern._id,
      action: 'PASSWORD_CHANGED'
    });
    assert.ok(log, 'Audit log for PASSWORD_CHANGED must exist');
    assert.equal(log.meta.password, undefined, 'Password must never be in audit meta');
  });

  await t.test('8. Once password exists, intern code NO LONGER works for login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com',
        password: newIntern.internCode
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.message, 'Invalid credentials');
  });

  await t.test('9. Intern can log in with their newly set password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com',
        password: 'MyNewSecurePass1'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.ok(data.user.passwordSetAt);
    internToken = data.token;
  });

  await t.test('10. Next password change requires the current password (internCode rejected)', async () => {
    // Attempt with old intern code should fail
    let res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: newIntern.internCode,
        newPassword: 'BrandNewPass2'
      })
    });
    assert.equal(res.status, 400);

    // Attempt with correct current password succeeds
    res = await fetch(`${baseUrl}/api/intern/set-password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        currentSecret: 'MyNewSecurePass1',
        newPassword: 'BrandNewPass2'
      })
    });
    assert.equal(res.status, 200);

    // Verify login with BrandNewPass2 works
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com',
        password: 'BrandNewPass2'
      })
    });
    assert.equal(loginRes.status, 200);
  });

  await t.test('11. Profile update validates mobile number format (10 digits)', async () => {
    // Non-10 digits
    let res = await fetch(`${baseUrl}/api/intern/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        mobileNo: '123'
      })
    });
    assert.equal(res.status, 400);

    // Alphabetic
    res = await fetch(`${baseUrl}/api/intern/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        mobileNo: 'abcdefghij'
      })
    });
    assert.equal(res.status, 400);
  });

  await t.test('12. Profile update updates mobileNo and ignores extra/unauthorized fields', async () => {
    const res = await fetch(`${baseUrl}/api/intern/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internToken}`
      },
      body: JSON.stringify({
        mobileNo: '9123456789',
        role: 'admin',
        internCode: 'HACKED-CODE',
        isArchived: true,
        email: 'hacked@uptoskills.com'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.mobileNo, '9123456789');
    assert.equal(data.user.role, 'intern');
    assert.equal(data.user.internCode, newIntern.internCode);
    assert.equal(data.user.email, 'bob_intern@uptoskills.com');

    // DB verify
    const dbIntern = await User.findById(newIntern._id);
    assert.equal(dbIntern.mobileNo, '9123456789');
    assert.equal(dbIntern.role, 'intern');
    assert.equal(dbIntern.internCode, newIntern.internCode);

    // AuditLog PROFILE_UPDATED
    const log = await AuditLog.findOne({
      actorId: newIntern._id,
      action: 'PROFILE_UPDATED'
    });
    assert.ok(log, 'Audit log for PROFILE_UPDATED must exist');
    assert.equal(log.meta.newMobile, '9123456789');
  });

  await t.test('13. Forgot password works for intern account and sends reset link', async () => {
    sentEmails.length = 0;

    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob_intern@uptoskills.com'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /reset link has been sent/i);

    // Verify email was sent and token was generated in DB
    const dbIntern = await User.findById(newIntern._id);
    assert.ok(dbIntern.resetPasswordToken);
    assert.ok(dbIntern.resetPasswordExpires > Date.now());
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'bob_intern@uptoskills.com');
  });

  await t.test('14. Reset password works for an intern who never set a password and creates one', async () => {
    // Create another intern who never set a password
    const intern2 = await User.create({
      fullName: 'Never Set Intern',
      email: 'never_set@uptoskills.com',
      internCode: 'INT-NEVER-001',
      role: 'intern'
    });

    // Request forgot password
    sentEmails.length = 0;
    await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'never_set@uptoskills.com' })
    });

    assert.equal(sentEmails.length, 1);
    const emailHtml = sentEmails[0].html;
    const tokenMatch = emailHtml.match(/reset-password\/([a-f0-9]+)/);
    assert.ok(tokenMatch, 'Reset token must be present in email link');
    const resetToken = tokenMatch[1];

    // Reset password
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password/${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: 'FreshResetPassword1' })
    });

    assert.equal(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.match(resetData.message, /password reset successful/i);

    // Intern should now have password and passwordSetAt
    const updatedIntern2 = await User.findById(intern2._id);
    assert.ok(updatedIntern2.password);
    assert.ok(updatedIntern2.passwordSetAt instanceof Date);

    // Login with new password works
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'never_set@uptoskills.com',
        password: 'FreshResetPassword1'
      })
    });
    assert.equal(loginRes.status, 200);

    // Old internCode login fails
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'never_set@uptoskills.com',
        password: 'INT-NEVER-001'
      })
    });
    assert.equal(oldLoginRes.status, 401);
  });

  await t.test('15. Admin and TL login and reset still work as before', async () => {
    // Admin login
    let res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin_taskh@uptoskills.com',
        password: 'AdminPassword123'
      })
    });
    assert.equal(res.status, 200);
    let data = await res.json();
    assert.equal(data.user.role, 'admin');

    // TL login
    res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tl_taskh@uptoskills.com',
        password: 'TLPassword123'
      })
    });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.user.role, 'teamleader');

    // Wrong password for Admin fails
    res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin_taskh@uptoskills.com',
        password: 'WrongPassword'
      })
    });
    assert.equal(res.status, 401);
    data = await res.json();
    assert.equal(data.message, 'Invalid credentials');
  });
});
