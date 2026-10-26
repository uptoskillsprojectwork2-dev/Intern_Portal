import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../src/models/User.js';
import { login, resetPassword } from '../src/controllers/auth.controller.js';
import { setPassword, updateProfile } from '../src/controllers/intern.controller.js';
import { setPasswordValidator, updateProfileValidator } from '../src/validators/intern.validator.js';
import { PASSWORD_CHANGED, PROFILE_UPDATED } from '../src/utils/auditActions.js';
import AuditLog from '../src/models/AuditLog.model.js';

// Stub AuditLog.create to prevent MongoDB timeout buffering during unit tests
AuditLog.create = async () => ({});

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    cookie(name, val) {
      this.cookies[name] = val;
      return this;
    }
  };
  return res;
};

test('Task H: Intern Profile and Password Setup Unit Tests', async (t) => {

  await t.test('1. New intern without password logs in successfully with intern code', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'New Intern',
      email: 'newintern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: null,
      passwordSetAt: null,
      isArchived: false,
      createdAt: new Date(),
      comparePassword: async () => false
    };

    const origFindOne = User.findOne;
    User.findOne = async () => mockUser;

    const req = {
      body: {
        email: 'newintern@example.com',
        password: 'INT-2026-001'
      }
    };
    const res = mockRes();

    await login(req, res);

    User.findOne = origFindOne;

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'User logged in successfully');
    assert.equal(res.body.user.email, 'newintern@example.com');
  });

  await t.test('2. New intern login fails with wrong intern code / wrong password', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'New Intern',
      email: 'newintern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: null,
      passwordSetAt: null,
      isArchived: false,
      createdAt: new Date(),
      comparePassword: async () => false
    };

    const origFindOne = User.findOne;
    User.findOne = async () => mockUser;

    const req = {
      body: {
        email: 'newintern@example.com',
        password: 'WRONG-CODE'
      }
    };
    const res = mockRes();

    await login(req, res);

    User.findOne = origFindOne;

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid credentials');
  });

  await t.test('3. setPassword rejects if currentSecret does not match internCode (no password yet)', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'New Intern',
      email: 'newintern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: null,
      passwordSetAt: null,
      save: async () => {}
    };

    const origFindById = User.findById;
    User.findById = async () => mockUser;

    const req = {
      user: { id: '507f1f77bcf86cd799439011', role: 'intern' },
      body: {
        currentSecret: 'WRONG-SECRET',
        newPassword: 'ValidPassword123'
      }
    };
    const res = mockRes();

    await setPassword(req, res);

    User.findById = origFindById;

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /must match your intern code/i);
  });

  await t.test('4. setPassword validator rejects password under 8 chars or lacking number/letter', async () => {
    const runValidators = async (body) => {
      const req = { body };
      const res = mockRes();
      for (const middleware of setPasswordValidator) {
        let nextCalled = false;
        await middleware(req, res, () => { nextCalled = true; });
        if (!nextCalled) break;
      }
      return validationResult(req);
    };

    const resTooShort = await runValidators({ currentSecret: 'INT-01', newPassword: 'Pass1' });
    assert.equal(resTooShort.isEmpty(), false);

    const resNoNumber = await runValidators({ currentSecret: 'INT-01', newPassword: 'OnlyLettersHere' });
    assert.equal(resNoNumber.isEmpty(), false);

    const resNoLetter = await runValidators({ currentSecret: 'INT-01', newPassword: '1234567890' });
    assert.equal(resNoLetter.isEmpty(), false);

    const resValid = await runValidators({ currentSecret: 'INT-01', newPassword: 'ValidPassword1' });
    assert.equal(resValid.isEmpty(), true);
  });

  await t.test('5. setPassword succeeds with internCode when no password exists, setting passwordSetAt', async () => {
    let saved = false;
    let savedPassword = null;
    let savedPasswordSetAt = null;

    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'New Intern',
      email: 'newintern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: null,
      passwordSetAt: null,
      save: async function() {
        saved = true;
        savedPassword = this.password;
        savedPasswordSetAt = this.passwordSetAt;
      }
    };

    const origFindById = User.findById;
    User.findById = async () => mockUser;

    const req = {
      user: { id: '507f1f77bcf86cd799439011', role: 'intern' },
      body: {
        currentSecret: 'INT-2026-001',
        newPassword: 'MySecurePassword1'
      }
    };
    const res = mockRes();

    await setPassword(req, res);

    User.findById = origFindById;

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.ok(savedPasswordSetAt instanceof Date);
    assert.ok(bcrypt.compareSync('MySecurePassword1', savedPassword));
  });

  await t.test('6. After password is set, login with intern code is rejected, password works', async () => {
    const hashedPassword = bcrypt.hashSync('MySecurePassword1', 10);
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Intern with Password',
      email: 'intern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: hashedPassword,
      passwordSetAt: new Date(),
      isArchived: false,
      createdAt: new Date(),
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    };

    const origFindOne = User.findOne;
    User.findOne = async () => mockUser;

    // Login with intern code
    const reqCode = {
      body: {
        email: 'intern@example.com',
        password: 'INT-2026-001'
      }
    };
    const resCode = mockRes();
    await login(reqCode, resCode);
    assert.equal(resCode.statusCode, 401);
    assert.equal(resCode.body.message, 'Invalid credentials');

    // Login with new password
    const reqPass = {
      body: {
        email: 'intern@example.com',
        password: 'MySecurePassword1'
      }
    };
    const resPass = mockRes();
    await login(reqPass, resPass);
    assert.equal(resPass.statusCode, 200);
    assert.equal(resPass.body.message, 'User logged in successfully');

    User.findOne = origFindOne;
  });

  await t.test('7. When password exists, setPassword requires current password', async () => {
    const hashedPassword = bcrypt.hashSync('CurrentPassword1', 10);
    let saved = false;

    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Intern with Password',
      email: 'intern@example.com',
      internCode: 'INT-2026-001',
      role: 'intern',
      password: hashedPassword,
      passwordSetAt: new Date('2026-01-01'),
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function() {
        saved = true;
      }
    };

    const origFindById = User.findById;
    User.findById = async () => mockUser;

    // Wrong current password
    const reqWrong = {
      user: { id: '507f1f77bcf86cd799439011', role: 'intern' },
      body: {
        currentSecret: 'WrongPassword9',
        newPassword: 'BrandNewPassword1'
      }
    };
    const resWrong = mockRes();
    await setPassword(reqWrong, resWrong);
    assert.equal(resWrong.statusCode, 400);
    assert.match(resWrong.body.message, /Current password is incorrect/i);

    // Right current password
    const reqRight = {
      user: { id: '507f1f77bcf86cd799439011', role: 'intern' },
      body: {
        currentSecret: 'CurrentPassword1',
        newPassword: 'BrandNewPassword1'
      }
    };
    const resRight = mockRes();
    await setPassword(reqRight, resRight);
    assert.equal(resRight.statusCode, 200);
    assert.equal(saved, true);

    User.findById = origFindById;
  });

  await t.test('8. updateProfile modifies ONLY mobileNo and ignores extra fields like role or email', async () => {
    let saved = false;
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Intern Name',
      email: 'intern@example.com',
      internCode: 'INT-001',
      mobileNo: '9876543210',
      role: 'intern',
      save: async function() {
        saved = true;
      }
    };

    const origFindById = User.findById;
    User.findById = async () => mockUser;

    const req = {
      user: { id: '507f1f77bcf86cd799439011', role: 'intern' },
      body: {
        mobileNo: '9123456789',
        role: 'admin',
        email: 'hacked@hack.com',
        internCode: 'HACKED-CODE',
        isAdmin: true
      }
    };
    const res = mockRes();

    await updateProfile(req, res);

    User.findById = origFindById;

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(mockUser.mobileNo, '9123456789');
    assert.equal(mockUser.role, 'intern');
    assert.equal(mockUser.email, 'intern@example.com');
    assert.equal(mockUser.internCode, 'INT-001');
    assert.equal(mockUser.isAdmin, undefined);
  });

  await t.test('9. updateProfile validator validates 10-digit mobileNo', async () => {
    const runValidators = async (body) => {
      const req = { body };
      const res = mockRes();
      for (const middleware of updateProfileValidator) {
        let nextCalled = false;
        await middleware(req, res, () => { nextCalled = true; });
        if (!nextCalled) break;
      }
      return validationResult(req);
    };

    const resTooShort = await runValidators({ mobileNo: '12345' });
    assert.equal(resTooShort.isEmpty(), false);

    const resLetters = await runValidators({ mobileNo: '98765abcde' });
    assert.equal(resLetters.isEmpty(), false);

    const resValid = await runValidators({ mobileNo: '9876543210' });
    assert.equal(resValid.isEmpty(), true);
  });

  await t.test('10. resetPassword sets password and passwordSetAt for an intern who never had a password', async () => {
    const crypto = await import('crypto');
    const rawToken = 'dummytoken12345678';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    let saved = false;
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Intern Without Password',
      email: 'intern@example.com',
      role: 'intern',
      password: null,
      passwordSetAt: null,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() + 60000,
      save: async function() {
        saved = true;
      }
    };

    const origFindOne = User.findOne;
    User.findOne = async () => mockUser;

    const req = {
      params: { token: rawToken },
      body: { newPassword: 'ResetPassword99' }
    };
    const res = mockRes();

    await resetPassword(req, res);

    User.findOne = origFindOne;

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.ok(mockUser.passwordSetAt instanceof Date);
    assert.ok(bcrypt.compareSync('ResetPassword99', mockUser.password));
  });

  await t.test('11. Admin login continues to work with password and bcrypt compare', async () => {
    const hashedPassword = bcrypt.hashSync('AdminSecurePass1', 10);
    const mockAdmin = {
      _id: '507f1f77bcf86cd799439099',
      fullName: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      password: hashedPassword,
      createdAt: new Date(),
      comparePassword: async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    };

    const origFindOne = User.findOne;
    User.findOne = async () => mockAdmin;

    const req = {
      body: {
        email: 'admin@example.com',
        password: 'AdminSecurePass1'
      }
    };
    const res = mockRes();

    await login(req, res);

    User.findOne = origFindOne;

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.role, 'admin');
  });
});
