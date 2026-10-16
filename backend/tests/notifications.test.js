import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import { createNotification } from '../src/utils/notificationService.js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../src/controllers/notification.controller.js';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import { getNotificationDestination } from '../../frontend/src/features/shared/utils/notificationDestination.js';

const response = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('in-app notification triggers a safe Brevo email to its owner', async () => {
  const originals = {
    readyState: mongoose.connection.readyState,
    create: Notification.create,
    findById: User.findById,
    createTransport: nodemailer.createTransport,
    env: Object.fromEntries(['BREVO_SMTP_USER', 'BREVO_SMTP_KEY', 'BREVO_SENDER_EMAIL'].map((key) => [key, process.env[key]])),
  };
  const sent = [];
  const userId = new mongoose.Types.ObjectId();
  mongoose.connection.readyState = 1;
  process.env.BREVO_SMTP_USER = 'smtp-user';
  process.env.BREVO_SMTP_KEY = 'smtp-key';
  process.env.BREVO_SENDER_EMAIL = 'verified@example.org';
  Notification.create = async (document) => ({ _id: 'notification-1', ...document });
  User.findById = () => ({ select: () => ({ lean: async () => ({ email: 'person@example.org', fullName: '<User>', personalDataPurged: false }) }) });
  nodemailer.createTransport = (config) => ({ sendMail: (mail) => { sent.push({ config, mail }); return Promise.resolve({ messageId: 'test-message' }); } });
  try {
    const notification = await createNotification({ userId, title: 'Certificate ready', message: '<script>alert(1)</script>', type: 'certificate' });
    assert.equal(notification.userId, userId);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].config.host, 'smtp-relay.brevo.com');
    assert.equal(sent[0].mail.to, 'person@example.org');
    assert.match(sent[0].mail.html, /&lt;User&gt;/);
    assert.match(sent[0].mail.html, /&lt;script&gt;/);
  } finally {
    mongoose.connection.readyState = originals.readyState;
    Notification.create = originals.create;
    User.findById = originals.findById;
    nodemailer.createTransport = originals.createTransport;
    for (const [key, value] of Object.entries(originals.env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('notification list and unread count are scoped to the authenticated user', async () => {
  const originalFind = Notification.find;
  const originalCount = Notification.countDocuments;
  const userId = new mongoose.Types.ObjectId().toString();
  const items = [{ _id: 'one', userId, isRead: false }];
  const filters = [];
  Notification.find = (filter) => {
    filters.push(filter);
    return { sort() { return this; }, limit() { return this; }, lean: async () => items };
  };
  Notification.countDocuments = async (filter) => { filters.push(filter); return 3; };
  try {
    const listRes = response();
    await getNotifications({ user: { id: userId } }, listRes);
    assert.deepEqual(listRes.body, { notifications: items, unreadCount: 3 });
    assert.deepEqual(filters[0], { userId });
    assert.deepEqual(filters[1], { userId, isRead: false });

    const countRes = response();
    await getUnreadNotificationCount({ user: { id: userId } }, countRes);
    assert.deepEqual(countRes.body, { unreadCount: 3 });
    assert.deepEqual(filters[2], { userId, isRead: false });
  } finally { Notification.find = originalFind; Notification.countDocuments = originalCount; }
});

test('mark-read APIs only update the owner notification', async () => {
  const originalFindOneAndUpdate = Notification.findOneAndUpdate;
  const originalUpdateMany = Notification.updateMany;
  const userId = new mongoose.Types.ObjectId().toString();
  const notificationId = new mongoose.Types.ObjectId().toString();
  const filters = [];
  Notification.findOneAndUpdate = async (filter, update) => {
    filters.push({ filter, update });
    return { _id: notificationId, userId, isRead: true };
  };
  Notification.updateMany = async (filter, update) => {
    filters.push({ filter, update });
    return { modifiedCount: 2 };
  };
  try {
    const oneRes = response();
    await markNotificationAsRead({ params: { id: notificationId }, user: { id: userId } }, oneRes);
    assert.equal(oneRes.statusCode, 200);
    assert.deepEqual(filters[0].filter, { _id: notificationId, userId });
    assert.equal(filters[0].update.$set.isRead, true);

    const allRes = response();
    await markAllNotificationsAsRead({ user: { id: userId } }, allRes);
    assert.deepEqual(filters[1].filter, { userId, isRead: false });
    assert.deepEqual(allRes.body, { markedRead: 2, readAt: filters[1].update.$set.readAt });

    const invalidRes = response();
    await markNotificationAsRead({ params: { id: 'bad-id' }, user: { id: userId } }, invalidRes);
    assert.equal(invalidRes.statusCode, 400);
  } finally { Notification.findOneAndUpdate = originalFindOneAndUpdate; Notification.updateMany = originalUpdateMany; }
});

test('notification API requires a session and permits only portal roles', async () => {
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/notifications/unread-count`;
    assert.equal((await fetch(url)).status, 401);
    const token = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'guest' }, process.env.JWT_SECRET);
    const denied = await fetch(url, { headers: { Cookie: `token=${token}` } });
    assert.equal(denied.status, 403);
  } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

test('notification routes complete list, count, mark-one, and mark-all for every portal role', async () => {
  const originalFind = Notification.find;
  const originalCount = Notification.countDocuments;
  const originalFindOneAndUpdate = Notification.findOneAndUpdate;
  const originalUpdateMany = Notification.updateMany;
  const userIds = ['admin', 'teamleader', 'intern'].map(() => new mongoose.Types.ObjectId().toString());
  const notificationId = new mongoose.Types.ObjectId().toString();
  const observed = [];
  Notification.find = (filter) => {
    observed.push(filter);
    return { sort() { return this; }, limit() { return this; }, lean: async () => [{ _id: notificationId, userId: filter.userId, isRead: false }] };
  };
  Notification.countDocuments = async (filter) => { observed.push(filter); return 1; };
  Notification.findOneAndUpdate = async (filter, update) => { observed.push(filter); return { _id: notificationId, userId: filter.userId, isRead: update.$set.isRead }; };
  Notification.updateMany = async (filter) => { observed.push(filter); return { modifiedCount: 1 }; };
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/notifications`;
    for (const [index, role] of ['admin', 'teamleader', 'intern'].entries()) {
      const userId = userIds[index];
      const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET);
      const headers = { Cookie: `token=${token}`, 'Content-Type': 'application/json' };
      const listResponse = await fetch(base, { headers });
      assert.equal(listResponse.status, 200);
      assert.equal((await listResponse.json()).unreadCount, 1);
      assert.equal((await fetch(`${base}/unread-count`, { headers })).status, 200);
      assert.equal((await fetch(`${base}/${notificationId}/read`, { method: 'PATCH', headers })).status, 200);
      assert.equal((await fetch(`${base}/read-all`, { method: 'PATCH', headers })).status, 200);
    }
    assert.ok(observed.every((filter) => userIds.includes(String(filter.userId))));
    assert.equal(observed.filter((filter) => String(filter.userId) === userIds[0]).length, 5);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    Notification.find = originalFind;
    Notification.countDocuments = originalCount;
    Notification.findOneAndUpdate = originalFindOneAndUpdate;
    Notification.updateMany = originalUpdateMany;
  }
});

test('notification links use each role dashboard and route admin retention events correctly', () => {
  const certificate = { title: 'Certificate ready', type: 'certificate' };
  assert.equal(getNotificationDestination(certificate, 'intern'), '/intern/dashboard?view=certificates');
  assert.equal(getNotificationDestination(certificate, 'teamleader'), '/teamleader/dashboard?view=requests');
  assert.equal(getNotificationDestination(certificate, 'admin'), '/admin/dashboard?view=requests');
  assert.equal(getNotificationDestination({ title: 'Account restored', type: 'internship' }, 'admin'), '/admin/dashboard?view=retention');
});
