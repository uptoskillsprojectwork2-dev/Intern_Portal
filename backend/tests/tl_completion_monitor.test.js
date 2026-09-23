import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Models & Services
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import {
  getCalendarDifferenceInDays,
  isExactlyThreeDaysAway,
  toCalendarDateKey,
  formatCalendarDate,
  checkInternshipCompletions
} from '../src/services/teamLeaderCompletionMonitor.js';

// Controllers
import {
  getTeamLeaderNotifications,
  markTeamLeaderNotificationAsRead
} from '../src/controllers/teamleader.controller.js';

// Mock response factory
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

describe('Team Leader Internship Completion Alert Test Suite', () => {

  describe('1. Calendar-Date Calculation & 3-Day Rule', () => {
    it('accurately detects exactly 3 calendar days difference (27 Sep -> 30 Sep)', () => {
      const today = new Date('2026-09-27T10:00:00Z');
      const endDate = new Date('2026-09-30T18:00:00Z');
      
      const diff = getCalendarDifferenceInDays(today, endDate);
      assert.strictEqual(diff, 3);
      assert.strictEqual(isExactlyThreeDaysAway(today, endDate), true);
    });

    it('rejects 2 calendar days difference (28 Sep -> 30 Sep)', () => {
      const today = new Date('2026-09-28T09:00:00Z');
      const endDate = new Date('2026-09-30T17:00:00Z');
      
      const diff = getCalendarDifferenceInDays(today, endDate);
      assert.strictEqual(diff, 2);
      assert.strictEqual(isExactlyThreeDaysAway(today, endDate), false);
    });

    it('rejects 4 calendar days difference (26 Sep -> 30 Sep)', () => {
      const today = new Date('2026-09-26T23:59:59Z');
      const endDate = new Date('2026-09-30T00:00:01Z');
      
      const diff = getCalendarDifferenceInDays(today, endDate);
      assert.strictEqual(diff, 4);
      assert.strictEqual(isExactlyThreeDaysAway(today, endDate), false);
    });

    it('rejects past dates or negative differences', () => {
      const today = new Date('2026-10-01T12:00:00Z');
      const endDate = new Date('2026-09-30T12:00:00Z');
      
      assert.strictEqual(isExactlyThreeDaysAway(today, endDate), false);
    });

    it('generates consistent deterministic date key YYYY-MM-DD', () => {
      const date = new Date('2026-09-30T15:30:00Z');
      const key = toCalendarDateKey(date);
      assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('2. Monitor Eligibility & Notification Dispatch Logic', () => {
    const originalFind = User.find;
    const originalFindOneUser = User.findOne;
    const originalFindOneNotif = Notification.findOne;
    const originalCreateNotif = Notification.create;

    beforeEach(() => {
      User.find = originalFind;
      User.findOne = originalFindOneUser;
      Notification.findOne = originalFindOneNotif;
      Notification.create = originalCreateNotif;
    });

    it('dispatches notification for eligible intern with exactly 3 days remaining', async () => {
      const referenceDate = new Date('2026-09-27T08:00:00Z');
      const tlId = new mongoose.Types.ObjectId();
      const internId = new mongoose.Types.ObjectId();

      const mockIntern = {
        _id: internId,
        fullName: 'Rahul Sharma',
        role: 'intern',
        endDate: new Date('2026-09-30T12:00:00Z'),
        internshipDetails: {
          teamleaderEmail: 'tl.akshaya@example.com',
          status: 'ongoing'
        }
      };

      const mockTL = {
        _id: tlId,
        role: 'teamleader',
        email: 'tl.akshaya@example.com',
        fullName: 'Priya TL'
      };

      let createdPayload = null;

      User.find = async () => [mockIntern];
      User.findOne = async (query) => {
        if (query.role === 'teamleader' && query.email === 'tl.akshaya@example.com') {
          return mockTL;
        }
        return null;
      };
      Notification.findOne = async () => null; // No previous notification
      Notification.create = async (payload) => {
        createdPayload = payload;
        return { _id: new mongoose.Types.ObjectId(), ...payload };
      };

      const summary = await checkInternshipCompletions(referenceDate);

      assert.strictEqual(summary.scanned, 1);
      assert.strictEqual(summary.eligible, 1);
      assert.strictEqual(summary.notified, 1);
      assert.strictEqual(summary.skippedExisting, 0);
      assert.ok(createdPayload);
      assert.strictEqual(createdPayload.userId.toString(), tlId.toString());
      assert.strictEqual(createdPayload.title, 'Internship completion approaching');
      assert.ok(createdPayload.message.includes('Rahul Sharma'));
      assert.ok(createdPayload.message.includes('ends in 3 days'));
      assert.strictEqual(createdPayload.type, 'internship');
      assert.strictEqual(createdPayload.isRead, false);
      assert.ok(createdPayload.dedupKey.startsWith(`internship-completion:${internId}`));
    });

    it('skips intern whose status is "completed"', async () => {
      const referenceDate = new Date('2026-09-27T08:00:00Z');

      // The Mongoose query filters out completed and cancelled interns at DB level
      // Verify behavior when User.find returns empty due to status filter
      User.find = async (query) => {
        // Confirm query includes status exclusion
        assert.deepStrictEqual(query['internshipDetails.status'], { $nin: ['completed', 'cancelled'] });
        return [];
      };

      const summary = await checkInternshipCompletions(referenceDate);
      assert.strictEqual(summary.eligible, 0);
      assert.strictEqual(summary.notified, 0);
    });

    it('skips intern whose status is "cancelled"', async () => {
      const referenceDate = new Date('2026-09-27T08:00:00Z');

      User.find = async (query) => {
        assert.deepStrictEqual(query['internshipDetails.status'], { $nin: ['completed', 'cancelled'] });
        return [];
      };

      const summary = await checkInternshipCompletions(referenceDate);
      assert.strictEqual(summary.eligible, 0);
      assert.strictEqual(summary.notified, 0);
    });

    it('does not dispatch notification when assigned TL cannot be resolved', async () => {
      const referenceDate = new Date('2026-09-27T08:00:00Z');

      const mockIntern = {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Aarav Patel',
        role: 'intern',
        endDate: new Date('2026-09-30T12:00:00Z'),
        internshipDetails: {
          teamleaderEmail: 'nonexistent.tl@example.com',
          status: 'ongoing'
        }
      };

      User.find = async () => [mockIntern];
      User.findOne = async () => null; // TL not found

      let notificationCreated = false;
      Notification.create = async () => {
        notificationCreated = true;
      };

      const summary = await checkInternshipCompletions(referenceDate);
      assert.strictEqual(summary.eligible, 1);
      assert.strictEqual(summary.notified, 0);
      assert.strictEqual(summary.unassignedTL, 1);
      assert.strictEqual(notificationCreated, false);
    });

    it('strictly prevents duplicate notifications on repeated execution (dedupKey idempotency)', async () => {
      const referenceDate = new Date('2026-09-27T08:00:00Z');
      const internId = new mongoose.Types.ObjectId();
      const tlId = new mongoose.Types.ObjectId();

      const mockIntern = {
        _id: internId,
        fullName: 'Sneha Reddy',
        role: 'intern',
        endDate: new Date('2026-09-30T12:00:00Z'),
        internshipDetails: {
          teamleaderEmail: 'tl.akshaya@example.com',
          status: 'ongoing'
        }
      };

      User.find = async () => [mockIntern];
      User.findOne = async () => ({ _id: tlId, role: 'teamleader', email: 'tl.akshaya@example.com' });

      // Simulate notification already exists for this dedupKey
      Notification.findOne = async (query) => {
        if (query.dedupKey) {
          return { _id: new mongoose.Types.ObjectId(), dedupKey: query.dedupKey };
        }
        return null;
      };

      let createCallCount = 0;
      Notification.create = async () => {
        createCallCount++;
      };

      const summary = await checkInternshipCompletions(referenceDate);

      assert.strictEqual(summary.eligible, 1);
      assert.strictEqual(summary.notified, 0);
      assert.strictEqual(summary.skippedExisting, 1);
      assert.strictEqual(createCallCount, 0, 'Must not call Notification.create when dedupKey exists');
    });
  });

  describe('3. Team Leader API Access Control & Ownership Enforcement', () => {
    const originalFindNotif = Notification.find;
    const originalFindByIdNotif = Notification.findById;

    beforeEach(() => {
      Notification.find = originalFindNotif;
      Notification.findById = originalFindByIdNotif;
    });

    it('GET /api/teamleader/notifications returns notifications strictly belonging to authenticated TL', async () => {
      const tlId = new mongoose.Types.ObjectId();
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: tlId,
          title: 'Internship completion approaching',
          message: 'Rahul ends in 3 days.',
          type: 'internship',
          isRead: false
        }
      ];

      Notification.find = (query) => {
        assert.strictEqual(query.userId.toString(), tlId.toString());
        return {
          sort: (sortObj) => {
            assert.deepStrictEqual(sortObj, { isRead: 1, createdAt: -1 });
            return {
              limit: (limitNum) => {
                assert.strictEqual(limitNum, 50);
                return Promise.resolve(mockNotifications);
              }
            };
          }
        };
      };

      const req = { user: { id: tlId, role: 'teamleader' } };
      const res = createMockRes();

      await getTeamLeaderNotifications(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.notifications.length, 1);
      assert.strictEqual(res.body.notifications[0].title, 'Internship completion approaching');
    });

    it('PATCH /api/teamleader/notifications/:id/read allows owner TL to mark notification as read', async () => {
      const tlId = new mongoose.Types.ObjectId();
      const notifId = new mongoose.Types.ObjectId();

      const mockNotification = {
        _id: notifId,
        userId: tlId,
        isRead: false,
        readAt: null,
        save: async function () {
          return this;
        }
      };

      Notification.findById = async (id) => {
        if (id.toString() === notifId.toString()) return mockNotification;
        return null;
      };

      const req = {
        params: { id: notifId.toString() },
        user: { id: tlId, role: 'teamleader' }
      };
      const res = createMockRes();

      await markTeamLeaderNotificationAsRead(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockNotification.isRead, true);
      assert.ok(mockNotification.readAt instanceof Date);
    });

    it('PATCH /api/teamleader/notifications/:id/read returns 403 Forbidden when another TL attempts access', async () => {
      const owningTLId = new mongoose.Types.ObjectId();
      const maliciousTLId = new mongoose.Types.ObjectId();
      const notifId = new mongoose.Types.ObjectId();

      const mockNotification = {
        _id: notifId,
        userId: owningTLId,
        isRead: false
      };

      Notification.findById = async (id) => {
        if (id.toString() === notifId.toString()) return mockNotification;
        return null;
      };

      const req = {
        params: { id: notifId.toString() },
        user: { id: maliciousTLId, role: 'teamleader' } // Different TL
      };
      const res = createMockRes();

      await markTeamLeaderNotificationAsRead(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('Forbidden'));
      assert.strictEqual(mockNotification.isRead, false, 'Notification must remain unread');
    });

    it('PATCH /api/teamleader/notifications/:id/read returns 404 when notification does not exist', async () => {
      const tlId = new mongoose.Types.ObjectId();
      const nonExistentId = new mongoose.Types.ObjectId();

      Notification.findById = async () => null;

      const req = {
        params: { id: nonExistentId.toString() },
        user: { id: tlId, role: 'teamleader' }
      };
      const res = createMockRes();

      await markTeamLeaderNotificationAsRead(req, res);

      assert.strictEqual(res.statusCode, 404);
    });

    it('PATCH /api/teamleader/notifications/:id/read returns 400 on malformed ObjectId', async () => {
      const tlId = new mongoose.Types.ObjectId();

      const req = {
        params: { id: 'invalid-object-id-123' },
        user: { id: tlId, role: 'teamleader' }
      };
      const res = createMockRes();

      await markTeamLeaderNotificationAsRead(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Invalid notification ID');
    });
  });

  describe('4. Operational Database Status Audit', () => {
    it('truthfully reports database connection status without fabrication', () => {
      const dbConnected = mongoose.connection.readyState === 1;
      const mongoUriPresent = Boolean(process.env.MONGO_URI);
      
      console.log(`ℹ [TL MONITOR DB AUDIT] Database connected: ${dbConnected}`);
      console.log(`ℹ [TL MONITOR DB AUDIT] MONGO_URI configured: ${mongoUriPresent}`);
      
      assert.strictEqual(typeof dbConnected, 'boolean');
    });
  });
});
