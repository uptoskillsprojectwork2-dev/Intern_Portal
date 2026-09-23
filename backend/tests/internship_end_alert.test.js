import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  getThreeDaysAheadWindow,
  createThreeDayCompletionAlerts
} from '../src/services/internshipEndAlert.service.js';

import {
  getTLNotifications,
  markNotificationRead
} from '../src/controllers/teamleader.controller.js';

import {
  startInternshipAlertScheduler,
  stopInternshipAlertScheduler
} from '../src/schedulers/internshipAlert.scheduler.js';

import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';

const mockRes = () => {
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

test('AUTOMATIC 3-DAY INTERNSHIP COMPLETION ALERT & NOTIFICATION SUITE', async (t) => {
  // Test IDs
  const tlAId = new mongoose.Types.ObjectId().toString();
  const tlBId = new mongoose.Types.ObjectId().toString();
  const internEndingIn3DaysId = new mongoose.Types.ObjectId().toString();
  const internEndingIn2DaysId = new mongoose.Types.ObjectId().toString();
  const internEndingIn4DaysId = new mongoose.Types.ObjectId().toString();
  const internCompletedId = new mongoose.Types.ObjectId().toString();
  const internNoTLId = new mongoose.Types.ObjectId().toString();

  // Reference date calculations
  const now = new Date();
  const datePlus3Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3, 12, 0, 0));
  const datePlus2Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 12, 0, 0));
  const datePlus4Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 4, 12, 0, 0));

  // In-memory notifications store
  let notificationsDb = [];

  // In-memory users store
  const usersDb = [
    {
      _id: new mongoose.Types.ObjectId(tlAId),
      fullName: 'Team Leader Alpha',
      email: 'tla@uptoskills.com',
      role: 'teamleader'
    },
    {
      _id: new mongoose.Types.ObjectId(tlBId),
      fullName: 'Team Leader Beta',
      email: 'tlb@uptoskills.com',
      role: 'teamleader'
    },
    {
      _id: new mongoose.Types.ObjectId(internEndingIn3DaysId),
      fullName: 'Intern Ending Soon',
      email: 'ending3@uptoskills.com',
      internCode: 'INT-3DAYS',
      domain: 'Web Development',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus3Days,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'ongoing'
      }
    },
    {
      _id: new mongoose.Types.ObjectId(internEndingIn2DaysId),
      fullName: 'Intern Ending in 2 Days',
      email: 'ending2@uptoskills.com',
      internCode: 'INT-2DAYS',
      domain: 'Data Science',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus2Days,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'ongoing'
      }
    },
    {
      _id: new mongoose.Types.ObjectId(internEndingIn4DaysId),
      fullName: 'Intern Ending in 4 Days',
      email: 'ending4@uptoskills.com',
      internCode: 'INT-4DAYS',
      domain: 'AI/ML',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus4Days,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'ongoing'
      }
    },
    {
      _id: new mongoose.Types.ObjectId(internCompletedId),
      fullName: 'Intern Already Completed',
      email: 'completed@uptoskills.com',
      internCode: 'INT-COMPLETED',
      domain: 'Cloud',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus3Days,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'completed' // Should be excluded even though endDate is in 3 days
      }
    },
    {
      _id: new mongoose.Types.ObjectId(internNoTLId),
      fullName: 'Intern With No TL',
      email: 'notl@uptoskills.com',
      internCode: 'INT-NOTL',
      domain: 'DevOps',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus3Days,
      internshipDetails: {
        status: 'ongoing'
      }
    }
  ];

  // Backups
  const origUserFind = User.find;
  const origUserFindById = User.findById;
  const origUserFindOne = User.findOne;
  const origNotifFind = Notification.find;
  const origNotifFindById = Notification.findById;
  const origNotifFindOne = Notification.findOne;
  const origNotifCreate = Notification.create;

  t.after(() => {
    User.find = origUserFind;
    User.findById = origUserFindById;
    User.findOne = origUserFindOne;
    Notification.find = origNotifFind;
    Notification.findById = origNotifFindById;
    Notification.findOne = origNotifFindOne;
    Notification.create = origNotifCreate;
  });

  // Stubs
  User.find = function (filter) {
    let result = [...usersDb];
    if (filter.role) {
      result = result.filter((u) => u.role === filter.role);
    }
    if (filter['internshipDetails.status'] && filter['internshipDetails.status'].$nin) {
      const nin = filter['internshipDetails.status'].$nin;
      result = result.filter(
        (u) => !nin.includes(u.internshipDetails?.status)
      );
    }
    if (filter.endDate && filter.endDate.$gte && filter.endDate.$lte) {
      result = result.filter((u) => {
        if (!u.endDate) return false;
        return u.endDate >= filter.endDate.$gte && u.endDate <= filter.endDate.$lte;
      });
    }
    if (filter.$or) {
      result = result.filter((u) => {
        return filter.$or.some((cond) => {
          if (cond['internshipDetails.teamLeader']) {
            return !!u.internshipDetails?.teamLeader;
          }
          if (cond['internshipDetails.teamleaderEmail']) {
            return !!u.internshipDetails?.teamleaderEmail;
          }
          return false;
        });
      });
    }
    const query = Promise.resolve(result.map((r) => ({ ...r })));
    query.populate = () => query;
    query.lean = () => query;
    query.sort = () => query;
    query.limit = () => query;
    return query;
  };

  User.findById = function (id) {
    const idStr = id?.toString();
    const found = usersDb.find((u) => u._id.toString() === idStr);
    const query = Promise.resolve(found ? { ...found } : null);
    query.select = () => query;
    return query;
  };

  User.findOne = function (filter) {
    let found = null;
    if (filter._id) {
      found = usersDb.find((u) => u._id.toString() === filter._id.toString());
    } else if (filter.email) {
      found = usersDb.find((u) => u.email.toLowerCase() === filter.email.toLowerCase());
    }
    if (found && filter.role && found.role !== filter.role) {
      found = null;
    }
    const query = Promise.resolve(found ? { ...found } : null);
    query.select = () => query;
    return query;
  };

  Notification.create = async function (doc) {
    // Check unique dedupeKey constraint
    if (doc.dedupeKey) {
      const existing = notificationsDb.find((n) => n.dedupeKey === doc.dedupeKey);
      if (existing) {
        const err = new Error('E11000 duplicate key error collection: notifications index: dedupeKey');
        err.code = 11000;
        throw err;
      }
    }
    const created = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        return this;
      }
    };
    notificationsDb.push(created);
    return created;
  };

  Notification.find = function (filter) {
    let list = [...notificationsDb];
    if (filter.userId) {
      list = list.filter((n) => n.userId.toString() === filter.userId.toString());
    }
    return {
      sort: () => ({
        limit: () => Promise.resolve(list)
      })
    };
  };

  Notification.findById = function (id) {
    const idStr = id?.toString();
    const found = notificationsDb.find((n) => n._id.toString() === idStr);
    if (!found) {
      return Promise.resolve(null);
    }
    return Promise.resolve(found);
  };

  Notification.findOne = function (filter) {
    let found = null;
    if (filter.dedupeKey) {
      found = notificationsDb.find((n) => n.dedupeKey === filter.dedupeKey);
    } else if (filter._id) {
      found = notificationsDb.find((n) => n._id.toString() === filter._id.toString());
    }
    const query = Promise.resolve(found ? { ...found } : null);
    query.select = () => query;
    return query;
  };

  // 1. DATE CALCULATION ACCURACY
  await t.test('1. Exact 3-day window calculation matches Date X - 3 boundary', () => {
    const testNow = new Date('2026-05-10T14:30:00.000Z');
    const { startOfDay, endOfDay, dateKey } = getThreeDaysAheadWindow(testNow);

    // 2026-05-10 + 3 days = 2026-05-13
    assert.equal(dateKey, '2026-05-13');
    assert.equal(startOfDay.toISOString(), '2026-05-13T00:00:00.000Z');
    assert.equal(endOfDay.toISOString(), '2026-05-13T23:59:59.999Z');

    // Confirm that 2 days ahead and 4 days ahead are NOT in this window
    const plus2 = new Date('2026-05-12T12:00:00.000Z');
    const plus4 = new Date('2026-05-14T12:00:00.000Z');
    assert.equal(plus2 >= startOfDay && plus2 <= endOfDay, false, '2 days ahead must not match');
    assert.equal(plus4 >= startOfDay && plus4 <= endOfDay, false, '4 days ahead must not match');
  });

  // 2. ONLY INTERNS ENDING EXACTLY 3 DAYS AHEAD ARE PROCESSED
  await t.test('2. Only interns ending in exactly 3 days generate alerts (not 2 days, not 4 days, not completed)', async () => {
    notificationsDb = []; // Reset notifications
    const stats = await createThreeDayCompletionAlerts(now);

    assert.equal(stats.created, 1, 'Only 1 intern should match the 3-day window and active status');
    assert.equal(notificationsDb.length, 1);

    const alert = notificationsDb[0];
    assert.equal(alert.userId.toString(), tlAId, 'Notification must be assigned to the intern TL');
    assert.equal(alert.type, 'internship');
    assert.ok(alert.title.toLowerCase().includes('3 days'));
    assert.ok(alert.message.includes('Intern Ending Soon'));
    assert.equal(alert.metadata.daysRemaining, 3);
    assert.equal(alert.metadata.internId.toString(), internEndingIn3DaysId);
  });

  // 3. DEDUPLICATION PREVENTS DUPLICATE ALERTS ON SUBSEQUENT RUNS
  await t.test('3. Scheduler deduplication prevents duplicate notifications on re-run', async () => {
    // Re-run the alert service for the same day
    const stats = await createThreeDayCompletionAlerts(now);

    assert.equal(stats.created, 0, 'No new notifications should be created on re-run');
    assert.equal(stats.skipped, 1, 'Existing alert should be skipped due to dedupeKey');
    assert.equal(notificationsDb.length, 1, 'Notification table must remain deduplicated');
  });

  // 4. UNASSIGNED INTERNS ARE HANDLED SAFELY WITHOUT CRASHING
  await t.test('4. Intern without assigned TL is skipped safely without crashing', async () => {
    // The query matched internNoTLId as well if it had datePlus3Days, but it was skipped safely
    const alertsForNoTL = notificationsDb.filter(
      (n) => n.metadata?.internId?.toString() === internNoTLId
    );
    assert.equal(alertsForNoTL.length, 0, 'No notification created for unassigned intern');
  });

  // 5. TL NOTIFICATION API - GET NOTIFICATIONS
  await t.test('5. TL can retrieve their own notifications (and not other TLs)', async () => {
    const reqTL_A = {
      user: { id: tlAId, role: 'teamleader' }
    };
    const resA = mockRes();
    await getTLNotifications(reqTL_A, resA);

    assert.equal(resA.statusCode, 200);
    assert.equal(resA.body.notifications.length, 1);
    assert.equal(resA.body.notifications[0].userId.toString(), tlAId);

    // TL B should have 0 notifications
    const reqTL_B = {
      user: { id: tlBId, role: 'teamleader' }
    };
    const resB = mockRes();
    await getTLNotifications(reqTL_B, resB);

    assert.equal(resB.statusCode, 200);
    assert.equal(resB.body.notifications.length, 0);
  });

  // 6. TL NOTIFICATION API - MARK NOTIFICATION READ
  await t.test('6. TL can mark their notification as read', async () => {
    const notifId = notificationsDb[0]._id.toString();
    const req = {
      user: { id: tlAId, role: 'teamleader' },
      params: { id: notifId }
    };
    const res = mockRes();
    await markNotificationRead(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.notification.isRead, true);
    assert.ok(res.body.notification.readAt, 'readAt timestamp must be set');
  });

  // 7. SECURITY: TL CANNOT MARK ANOTHER USER NOTIFICATION AS READ (403)
  await t.test('7. TL cannot mark another user notification as read (403 Forbidden)', async () => {
    const notifId = notificationsDb[0]._id.toString();
    const reqTL_B = {
      user: { id: tlBId, role: 'teamleader' },
      params: { id: notifId }
    };
    const res = mockRes();
    await markNotificationRead(reqTL_B, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Access denied to this notification');
  });

  // 8. ERROR HANDLING: INVALID OR NON-EXISTENT NOTIFICATION ID
  await t.test('8. Malformed or non-existent notification ID is rejected gracefully', async () => {
    // Malformed ID
    const reqBad = {
      user: { id: tlAId, role: 'teamleader' },
      params: { id: 'invalid-id-format' }
    };
    const resBad = mockRes();
    await markNotificationRead(reqBad, resBad);
    assert.equal(resBad.statusCode, 400);

    // Non-existent ID
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const reqNotFound = {
      user: { id: tlAId, role: 'teamleader' },
      params: { id: nonExistentId }
    };
    const resNotFound = mockRes();
    await markNotificationRead(reqNotFound, resNotFound);
    assert.equal(resNotFound.statusCode, 404);
  });

  // 9. FALLBACK RESOLUTION VIA TL EMAIL
  await t.test('9. Resolves TL via teamleaderEmail when teamLeader ObjectId is omitted', async () => {
    const internWithOnlyEmailId = new mongoose.Types.ObjectId().toString();
    usersDb.push({
      _id: new mongoose.Types.ObjectId(internWithOnlyEmailId),
      fullName: 'Intern Only Email TL',
      email: 'onlyemail@uptoskills.com',
      internCode: 'INT-EMAILTL',
      domain: 'Mobile App Dev',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus3Days,
      internshipDetails: {
        teamLeader: null,
        teamleaderEmail: 'tlb@uptoskills.com', // assigned to TL Beta
        status: 'ongoing'
      }
    });

    const stats = await createThreeDayCompletionAlerts(now);
    assert.ok(stats.created >= 1);

    const alertForEmailTL = notificationsDb.find(
      (n) => n.metadata?.internId?.toString() === internWithOnlyEmailId
    );
    assert.ok(alertForEmailTL, 'Alert must be created for intern with only teamleaderEmail');
    assert.equal(alertForEmailTL.userId.toString(), tlBId, 'Notification must be sent to TL Beta');
  });

  // 10. STATUS FILTERING EXCLUDES CANCELLED INTERNS
  await t.test('10. Status filtering excludes cancelled interns', async () => {
    const internCancelledId = new mongoose.Types.ObjectId().toString();
    usersDb.push({
      _id: new mongoose.Types.ObjectId(internCancelledId),
      fullName: 'Intern Cancelled Status',
      email: 'cancelledstatus@uptoskills.com',
      internCode: 'INT-CANCELLED',
      domain: 'Security',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: datePlus3Days,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'cancelled'
      }
    });

    await createThreeDayCompletionAlerts(now);
    const alertForCancelled = notificationsDb.find(
      (n) => n.metadata?.internId?.toString() === internCancelledId
    );
    assert.equal(alertForCancelled, undefined, 'Cancelled intern must not generate alert');
  });

  // 11. RESCHEDULED END DATE ALLOWS NEW ALERT
  await t.test('11. Updating intern end date to a new date allows a new 3-day alert', async () => {
    const futureDate = new Date('2026-11-20T12:00:00.000Z');
    const rescheduledNow = new Date('2026-11-17T12:00:00.000Z'); // 3 days before Nov 20

    const internRescheduledId = new mongoose.Types.ObjectId().toString();
    usersDb.push({
      _id: new mongoose.Types.ObjectId(internRescheduledId),
      fullName: 'Intern Rescheduled',
      email: 'rescheduled@uptoskills.com',
      internCode: 'INT-RESCHED',
      domain: 'DevOps',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: futureDate,
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@uptoskills.com',
        status: 'ongoing'
      }
    });

    const stats = await createThreeDayCompletionAlerts(rescheduledNow);
    assert.equal(stats.created, 1);

    const alert = notificationsDb.find(
      (n) => n.metadata?.internId?.toString() === internRescheduledId
    );
    assert.ok(alert);
    assert.equal(alert.dedupeKey, `internship-ending-3-days:${internRescheduledId}:2026-11-20`);
  });

  // 12. SCHEDULER LIFECYCLE
  await t.test('12. Background scheduler starts and stops cleanly without error', () => {
    assert.doesNotThrow(() => {
      startInternshipAlertScheduler();
      stopInternshipAlertScheduler();
    });
  });
});
