import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import {
  archiveCompletedInterns,
  purgeArchivedInterns,
  sendArchiveWarnings,
} from '../src/jobs/retention.job.js';

const withUserStubs = async ({ batch, updateOne }) => {
  const originalFind = User.find;
  const originalUpdateOne = User.updateOne;
  User.find = (query) => ({
    sort() { return this; },
    limit() { return Promise.resolve(query._id?.$gt ? [] : batch); },
  });
  User.updateOne = updateOne;
  return () => { User.find = originalFind; User.updateOne = originalUpdateOne; };
};

test('retention lifecycle audits follow successful archive and purge writes', async () => {
  const today = new Date('2026-01-24T00:00:00.000Z');
  const archivedIntern = {
    _id: new mongoose.Types.ObjectId(),
    endDate: new Date('2025-12-01T00:00:00.000Z'),
    internshipDetails: { status: 'completed' },
  };
  let archivedState = false;
  let purgedState = false;
  const events = [];
  const restore = await withUserStubs({
    batch: [archivedIntern],
    updateOne: async (_filter, update) => {
      if (update.$set?.isArchived) archivedState = true;
      if (update.$set?.personalDataPurged) purgedState = true;
      return { modifiedCount: 1 };
    },
  });
  try {
    const archiveCount = await archiveCompletedInterns({
      graceDays: 30,
      dryRun: false,
      today,
      audit: async (entry) => { assert.equal(archivedState, true); events.push(entry.action); },
      notify: async () => { events.push('ARCHIVE_NOTIFICATION'); },
    });
    assert.equal(archiveCount, 1);
    assert.deepEqual(events, ['INTERN_ARCHIVED', 'ARCHIVE_NOTIFICATION']);

    events.length = 0;
    archivedIntern.isArchived = true;
    archivedIntern.archivedAt = new Date('2025-10-01T00:00:00.000Z');
    const purgeCount = await purgeArchivedInterns({
      purgeDays: 90,
      dryRun: false,
      today,
      audit: async (entry) => { assert.equal(purgedState, true); events.push(entry.action); },
      notify: async () => { events.push('PURGE_NOTIFICATION'); },
    });
    assert.equal(purgeCount, 1);
    assert.deepEqual(events, ['INTERN_PERSONAL_DATA_PURGED', 'PURGE_NOTIFICATION']);
  } finally { restore(); }
});

test('archive warning audit follows sent mail and omits the intern email', async () => {
  const today = new Date('2026-01-24T00:00:00.000Z');
  const intern = {
    _id: new mongoose.Types.ObjectId(),
    email: 'private@example.test',
    fullName: 'Test Intern',
    endDate: new Date('2026-01-01T00:00:00.000Z'),
    save: async () => {},
  };
  const events = [];
  const restore = await withUserStubs({ batch: [intern], updateOne: async () => ({ modifiedCount: 0 }) });
  try {
    const warnings = await sendArchiveWarnings({
      graceDays: 30,
      dryRun: false,
      today,
      send: async () => { events.push('EMAIL_SENT'); },
      notify: async () => { events.push('NOTIFIED'); },
      audit: async (entry) => { events.push(entry.action); assert.equal('email' in entry.meta, false); },
    });
    assert.equal(warnings, 1);
    assert.deepEqual(events, ['EMAIL_SENT', 'INTERN_ARCHIVE_WARNING', 'NOTIFIED']);
  } finally { restore(); }
});

test('dry-run retention warnings do not create lifecycle audit events', async () => {
  const today = new Date('2026-01-24T00:00:00.000Z');
  const intern = {
    _id: new mongoose.Types.ObjectId(),
    email: 'private@example.test',
    endDate: new Date('2026-01-01T00:00:00.000Z'),
  };
  const restore = await withUserStubs({ batch: [intern], updateOne: async () => ({ modifiedCount: 0 }) });
  let auditCalls = 0;
  try {
    const warnings = await sendArchiveWarnings({
      graceDays: 30,
      dryRun: true,
      today,
      audit: async () => { auditCalls += 1; },
    });
    assert.equal(warnings, 1);
    assert.equal(auditCalls, 0);
  } finally { restore(); }
});
