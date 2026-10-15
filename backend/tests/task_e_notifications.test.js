import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Notification from '../src/models/Notification.model.js';
import { notify } from '../src/services/notification.service.js';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../src/controllers/notification.controller.js';
import connectToDB from '../src/config/database.js';

test('Task E: Notifications (Email and In-App) Test Suite', async (t) => {
  await connectToDB();

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const sampleRequest = new mongoose.Types.ObjectId();

  await t.test('1. Model: Notification schema, fields, and compound index', async () => {
    await Notification.syncIndexes();
    const indexes = await Notification.collection.indexes();
    const hasCompound = indexes.some(
      (idx) =>
        idx.key &&
        idx.key.userId === 1 &&
        idx.key.isRead === 1 &&
        idx.key.createdAt === -1
    );

    assert.ok(hasCompound, 'Compound index { userId: 1, isRead: 1, createdAt: -1 } must exist');
  });

  await t.test('2. Notification Service: notify() creates in-app notification with null requestId default', async () => {
    const notif = await notify(userA, 'REQUEST_SUBMITTED', {
      title: 'New Certificate Request',
      message: 'An intern submitted a request',
      email: false,
    });

    assert.ok(notif._id, 'Notification should be persisted with an _id');
    assert.equal(notif.userId.toString(), userA.toString());
    assert.equal(notif.type, 'REQUEST_SUBMITTED');
    assert.equal(notif.title, 'New Certificate Request');
    assert.equal(notif.isRead, false);
    assert.equal(notif.readAt, null);

    // Cleanup
    await Notification.deleteOne({ _id: notif._id });
  });

  await t.test('3. Notification Service: email failure does not fail notify() or throw', async () => {
    // Calling notify with email: true for a non-existent or un-configured user should never throw
    const notif = await notify(new mongoose.Types.ObjectId(), 'ARCHIVE_WARNING', {
      title: 'Archive Warning',
      message: 'Account will be archived in 7 days',
      email: true,
    });

    assert.ok(notif._id, 'Notification must still be created even if email delivery fails');
    await Notification.deleteOne({ _id: notif._id });
  });

  await t.test('4. Endpoints: getUnreadCount returns correct count for authenticated user', async () => {
    const n1 = await notify(userA, 'REQUEST_SUBMITTED', {
      title: 'Notif 1',
      message: 'Msg 1',
    });
    const n2 = await notify(userA, 'REQUEST_APPROVED', {
      title: 'Notif 2',
      message: 'Msg 2',
    });

    const req = { user: { id: userA.toString() } };
    let jsonResult = null;
    const res = {
      status(code) {
        assert.equal(code, 200);
        return this;
      },
      json(data) {
        jsonResult = data;
      },
    };

    await getUnreadCount(req, res);
    assert.ok(jsonResult, 'Must return JSON result');
    assert.equal(jsonResult.unreadCount, 2);

    // Cleanup
    await Notification.deleteMany({ _id: { $in: [n1._id, n2._id] } });
  });

  await t.test('5. Endpoints: getNotifications lists user notifications and filters unread', async () => {
    const n1 = await notify(userA, 'REQUEST_FORWARDED', {
      title: 'Forwarded',
      message: 'Msg',
    });
    const n2 = await notify(userA, 'REQUEST_REJECTED', {
      title: 'Rejected',
      message: 'Reason given',
    });
    // Mark n2 read
    await Notification.updateOne({ _id: n2._id }, { isRead: true, readAt: new Date() });

    // Test with unread=true
    const req = {
      user: { id: userA.toString() },
      query: { unread: 'true', page: '1' },
    };
    let jsonResult = null;
    const res = {
      status(code) {
        assert.equal(code, 200);
        return this;
      },
      json(data) {
        jsonResult = data;
      },
    };

    await getNotifications(req, res);
    assert.ok(jsonResult.notifications, 'Must return notifications array');
    assert.equal(jsonResult.notifications.length, 1);
    assert.equal(jsonResult.notifications[0]._id.toString(), n1._id.toString());
    assert.equal(jsonResult.unreadCount, 1);

    // Cleanup
    await Notification.deleteMany({ _id: { $in: [n1._id, n2._id] } });
  });

  await t.test('6. Security & Isolation: user cannot read or mark another user\'s notification (404)', async () => {
    // Create notif for User A
    const notifA = await notify(userA, 'REQUEST_APPROVED', {
      title: 'Approved',
      message: 'Approved for user A',
    });

    // User B attempts to mark User A's notification as read
    const reqB = {
      user: { id: userB.toString() },
      params: { id: notifA._id.toString() },
    };
    let statusCode = null;
    let jsonResult = null;
    const resB = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
      },
    };

    await markNotificationRead(reqB, resB);
    assert.equal(statusCode, 404, 'Must return 404 when notification belongs to someone else');
    assert.match(jsonResult.message, /not found/i);

    // Verify notifA is still unread
    const checkNotif = await Notification.findById(notifA._id);
    assert.equal(checkNotif.isRead, false);

    // Cleanup
    await Notification.deleteOne({ _id: notifA._id });
  });

  await t.test('7. Endpoints: markNotificationRead marks one read for the owner', async () => {
    const notif = await notify(userA, 'CERTIFICATE_SENT', {
      title: 'Certificate Sent',
      message: 'Your certificate is ready',
    });

    const req = {
      user: { id: userA.toString() },
      params: { id: notif._id.toString() },
    };
    let statusCode = null;
    let jsonResult = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
      },
    };

    await markNotificationRead(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResult.notification.isRead, true);
    assert.ok(jsonResult.notification.readAt, 'readAt date must be set');

    // Cleanup
    await Notification.deleteOne({ _id: notif._id });
  });

  await t.test('8. Endpoints: markAllNotificationsRead marks all read for authenticated user', async () => {
    const n1 = await notify(userA, 'REQUEST_SUBMITTED', { title: 'T1', message: 'M1' });
    const n2 = await notify(userA, 'REQUEST_FORWARDED', { title: 'T2', message: 'M2' });
    const nB = await notify(userB, 'REQUEST_SUBMITTED', { title: 'TB', message: 'MB' });

    const req = { user: { id: userA.toString() } };
    let jsonResult = null;
    const res = {
      status(code) {
        assert.equal(code, 200);
        return this;
      },
      json(data) {
        jsonResult = data;
      },
    };

    await markAllNotificationsRead(req, res);
    assert.equal(jsonResult.modifiedCount, 2);

    // Verify user B's notification is unaffected
    const checkB = await Notification.findById(nB._id);
    assert.equal(checkB.isRead, false, 'User B unread notifications must not be modified');

    // Cleanup
    await Notification.deleteMany({ _id: { $in: [n1._id, n2._id, nB._id] } });
  });

  await t.test('9. Required Event Types: all 6 defined event types are accepted', async () => {
    const types = [
      'REQUEST_SUBMITTED',
      'REQUEST_FORWARDED',
      'REQUEST_REJECTED',
      'REQUEST_APPROVED',
      'CERTIFICATE_SENT',
      'ARCHIVE_WARNING',
    ];

    for (const type of types) {
      const notif = await notify(userA, type, {
        title: `Test ${type}`,
        message: `Message for ${type}`,
        requestId: sampleRequest,
      });
      assert.equal(notif.type, type);
      await Notification.deleteOne({ _id: notif._id });
    }
  });

  await mongoose.disconnect();
});
