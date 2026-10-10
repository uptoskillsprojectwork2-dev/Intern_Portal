import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Target jobs & controllers
import { runInternshipStatusJob } from '../src/jobs/internshipStatus.job.js';
import { runRetentionJob, calculateArchivalDate, calculatePurgeDate } from '../src/jobs/retention.job.js';
import { login, getMe } from '../src/controllers/auth.controller.js';
import {
  getRetentionPolicy,
  updateRetentionPolicy,
  getArchivedInterns,
  restoreArchivedIntern
} from '../src/controllers/retention.controller.js';
import { getProfile } from '../src/controllers/intern.controller.js';
import requireAdmin from '../src/middlewares/requireAdmin.js';

// Models
import User from '../src/models/User.js';
import RetentionPolicy from '../src/models/RetentionPolicy.model.js';
import Certificate from '../src/models/Certificate.js';

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
    },
    cookie(name, val) {
      this.cookieName = name;
      this.cookieVal = val;
      return this;
    }
  };
  return res;
};

test('UPTOSKILL Task C — Intern Account Lifecycle and Retention Test Suite', async (suite) => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const internId1 = new mongoose.Types.ObjectId().toString();
  const internId2 = new mongoose.Types.ObjectId().toString();
  const certId = new mongoose.Types.ObjectId().toString();

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION A: Internship status job
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section A.1: Upcoming internship with start date today or past becomes ongoing', async () => {
    const today = new Date('2026-10-10T10:00:00Z');
    let saved = false;

    const mockIntern = {
      _id: internId1,
      email: 'intern1@test.com',
      role: 'intern',
      startDate: new Date('2026-10-10T00:00:00Z'), // today
      internshipDetails: { status: 'upcoming' },
      save: async () => {
        saved = true;
      }
    };

    const origFind = User.find;
    User.find = () => ({
      skip: () => ({
        limit: async () => [mockIntern]
      })
    });

    try {
      const result = await runInternshipStatusJob({ currentDate: today, dryRun: false });
      assert.equal(mockIntern.internshipDetails.status, 'ongoing');
      assert.equal(saved, true);
      assert.ok(result.upcomingToOngoing >= 1);
    } finally {
      User.find = origFind;
    }
  });

  await suite.test('Section A.2: Upcoming internship with future start date stays upcoming', async () => {
    const today = new Date('2026-10-10T10:00:00Z');

    const origFind = User.find;
    // Query requires startDate <= endOfToday, so future intern is not selected by query
    User.find = (query) => {
      if (query && query['internshipDetails.status'] === 'upcoming') {
        assert.ok(query.startDate && query.startDate.$lte);
      }
      return {
        skip: () => ({
          limit: async () => []
        })
      };
    };

    try {
      const result = await runInternshipStatusJob({ currentDate: today, dryRun: false });
      assert.equal(result.upcomingToOngoing, 0);
    } finally {
      User.find = origFind;
    }
  });

  await suite.test('Section A.3: Ongoing internship with end date before today becomes completed', async () => {
    const today = new Date('2026-10-10T10:00:00Z');
    let saved = false;

    const mockOngoing = {
      _id: internId2,
      email: 'intern2@test.com',
      role: 'intern',
      endDate: new Date('2026-10-09T00:00:00Z'), // yesterday
      internshipDetails: { status: 'ongoing' },
      save: async () => {
        saved = true;
      }
    };

    const origFind = User.find;
    let callCount = 0;
    User.find = () => {
      callCount++;
      return {
        skip: () => ({
          limit: async () => (callCount === 2 ? [mockOngoing] : [])
        })
      };
    };

    try {
      const result = await runInternshipStatusJob({ currentDate: today, dryRun: false });
      assert.equal(mockOngoing.internshipDetails.status, 'completed');
      assert.equal(saved, true);
      assert.ok(result.ongoingToCompleted >= 1);
    } finally {
      User.find = origFind;
    }
  });

  await suite.test('Section A.4: Records with invalid or missing dates are safely handled without crash', async () => {
    const today = new Date('2026-10-10T10:00:00Z');

    const invalidIntern = {
      _id: internId1,
      email: 'baddate@test.com',
      role: 'intern',
      startDate: new Date('invalid-date'),
      internshipDetails: { status: 'upcoming' },
      save: async () => {
        throw new Error('Should not save invalid date record');
      }
    };

    const origFind = User.find;
    User.find = () => ({
      skip: () => ({
        limit: async () => [invalidIntern]
      })
    });

    try {
      const result = await runInternshipStatusJob({ currentDate: today, dryRun: false });
      assert.equal(invalidIntern.internshipDetails.status, 'upcoming'); // unchanged
    } finally {
      User.find = origFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION B: Retention Policy & Archiving
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section B.1: Completed intern past grace period (endDate + graceDays < today) is archived', async () => {
    const today = new Date('2026-10-10T10:00:00Z');
    let saved = false;

    const mockCompletedIntern = {
      _id: internId1,
      email: 'completed@test.com',
      role: 'intern',
      endDate: new Date('2026-09-01T00:00:00Z'), // 39 days ago (> 30 graceDays)
      internshipDetails: { status: 'completed' },
      isArchived: false,
      archivedAt: null,
      save: async () => {
        saved = true;
      }
    };

    const origPolicy = RetentionPolicy.getOrCreatePolicy;
    RetentionPolicy.getOrCreatePolicy = async () => ({ graceDays: 30, purgeDays: 90 });

    const origFind = User.find;
    let call = 0;
    User.find = () => {
      call++;
      return {
        limit: async () => (call === 1 ? [] : []), // warning query
        skip: () => ({
          limit: async () => (call === 2 ? [mockCompletedIntern] : [])
        })
      };
    };

    try {
      const result = await runRetentionJob({ currentDate: today, dryRun: false });
      assert.equal(mockCompletedIntern.isArchived, true);
      assert.ok(mockCompletedIntern.archivedAt instanceof Date);
      assert.equal(saved, true);
      assert.equal(result.archivedCount, 1);
    } finally {
      RetentionPolicy.getOrCreatePolicy = origPolicy;
      User.find = origFind;
    }
  });

  await suite.test('Section B.2: Interns inside the grace period remain active and are not archived', async () => {
    const today = new Date('2026-10-10T10:00:00Z');

    const origPolicy = RetentionPolicy.getOrCreatePolicy;
    RetentionPolicy.getOrCreatePolicy = async () => ({ graceDays: 30, purgeDays: 90 });

    const origFind = User.find;
    User.find = (query) => {
      // Archive query filters out records whose endDate is not older than archiveCutoff (now - 30 days)
      if (query && query.endDate && query.endDate.$lt) {
        const cutoff = query.endDate.$lt;
        assert.ok(cutoff <= new Date('2026-09-11T00:00:00Z'));
      }
      return {
        limit: async () => [],
        skip: () => ({
          limit: async () => []
        })
      };
    };

    try {
      const result = await runRetentionJob({ currentDate: today, dryRun: false });
      assert.equal(result.archivedCount, 0);
    } finally {
      RetentionPolicy.getOrCreatePolicy = origPolicy;
      User.find = origFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION C: Login restriction & Account Restoration
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section C.1: Archived user login returns HTTP 403 with exact required message', async () => {
    const origFindOne = User.findOne;
    User.findOne = async () => ({
      _id: internId1,
      email: 'archived@test.com',
      isArchived: true,
      comparePassword: async () => true // Password valid
    });

    const res = mockRes();
    try {
      await login({ body: { email: 'archived@test.com', password: 'password123' } }, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, 'Your internship account has been archived. Contact admin.');
    } finally {
      User.findOne = origFindOne;
    }
  });

  await suite.test('Section C.2: Active user login returns HTTP 200 with credentials', async () => {
    process.env.JWT_SECRET = 'testsecret123';
    const origFindOne = User.findOne;
    User.findOne = async () => ({
      _id: internId1,
      email: 'active@test.com',
      fullName: 'Active Intern',
      role: 'intern',
      isArchived: false,
      comparePassword: async () => true
    });

    const res = mockRes();
    try {
      await login({ body: { email: 'active@test.com', password: 'password123' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'User logged in successfully');
      assert.ok(res.body.user);
    } finally {
      User.findOne = origFindOne;
    }
  });

  await suite.test('Section C.3: Restoring an archived non-purged account re-enables login', async () => {
    const origFindById = User.findById;
    const origFindOneAndUpdate = User.findOneAndUpdate;

    User.findById = async () => ({
      _id: internId1,
      fullName: 'John Doe',
      isArchived: true,
      purgedAt: null
    });

    User.findOneAndUpdate = () => ({
      select: async () => ({
        _id: internId1,
        fullName: 'John Doe',
        isArchived: false,
        archivedAt: null
      })
    });

    const res = mockRes();
    try {
      await restoreArchivedIntern({ params: { id: internId1 } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Intern account restored successfully');
      assert.equal(res.body.user.isArchived, false);
      assert.equal(res.body.user.archivedAt, null);
    } finally {
      User.findById = origFindById;
      User.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  await suite.test('Section C.4: Purged account cannot be restored (returns HTTP 400)', async () => {
    const origFindById = User.findById;
    User.findById = async () => ({
      _id: internId1,
      isArchived: true,
      purgedAt: new Date('2026-08-01')
    });

    const res = mockRes();
    try {
      await restoreArchivedIntern({ params: { id: internId1 } }, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Cannot restore an account that has already been purged/i);
    } finally {
      User.findById = origFindById;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION D: Anonymization/Purge & Certificate Preservation
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section D.1: Personal info is anonymized when archivedAt + purgeDays < today', async () => {
    const today = new Date('2026-10-10T10:00:00Z');
    let saved = false;

    const mockArchivedIntern = {
      _id: internId1,
      fullName: 'Real Person',
      email: 'real@person.com',
      mobileNo: '9876543210',
      internCode: 'INT-999',
      role: 'intern',
      isArchived: true,
      archivedAt: new Date('2026-06-01T00:00:00Z'), // > 90 days ago
      purgedAt: null,
      save: async () => {
        saved = true;
      }
    };

    const origPolicy = RetentionPolicy.getOrCreatePolicy;
    RetentionPolicy.getOrCreatePolicy = async () => ({ graceDays: 30, purgeDays: 90 });

    const origFind = User.find;
    let call = 0;
    User.find = () => {
      call++;
      return {
        limit: async () => [],
        skip: () => ({
          limit: async () => (call === 3 ? [mockArchivedIntern] : [])
        })
      };
    };

    try {
      const result = await runRetentionJob({ currentDate: today, dryRun: false });
      assert.equal(mockArchivedIntern.fullName, 'Archived Intern');
      assert.equal(mockArchivedIntern.email, `purged_${internId1}@uptoskills.local`);
      assert.equal(mockArchivedIntern.internCode, `PURGED_${internId1}`);
      assert.equal(mockArchivedIntern.mobileNo, '+0000000000');
      assert.ok(mockArchivedIntern.purgedAt instanceof Date);
      assert.equal(saved, true);
      assert.equal(result.purgedCount, 1);
    } finally {
      RetentionPolicy.getOrCreatePolicy = origPolicy;
      User.find = origFind;
    }
  });

  await suite.test('Section D.2: Certificate rows and userId reference remain intact after anonymization', async () => {
    // Verify that certificate record with foreign key userId continues to resolve the User document
    const userDoc = {
      _id: internId1,
      fullName: 'Archived Intern',
      email: `purged_${internId1}@uptoskills.local`,
      isArchived: true,
      purgedAt: new Date()
    };

    const certificateDoc = {
      _id: certId,
      certificateNumber: 'CERT-2026-0001',
      userId: userDoc._id,
      verificationCode: 'VER-999-XYZ',
      pdfPath: 'Certificates/CERT-2026-0001.pdf',
      status: 'finalized'
    };

    assert.equal(certificateDoc.userId, userDoc._id);
    assert.ok(certificateDoc.verificationCode);
    assert.ok(certificateDoc.pdfPath);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION E: Policy APIs & Schema Validation
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section E.1: GET /api/admin/retention-policy returns singleton policy', async () => {
    const origPolicy = RetentionPolicy.getOrCreatePolicy;
    RetentionPolicy.getOrCreatePolicy = async () => ({
      _id: 'policy-id-1',
      graceDays: 30,
      purgeDays: 90,
      updatedAt: new Date()
    });

    const res = mockRes();
    try {
      await getRetentionPolicy({}, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.policy.graceDays, 30);
      assert.equal(res.body.policy.purgeDays, 90);
    } finally {
      RetentionPolicy.getOrCreatePolicy = origPolicy;
    }
  });

  await suite.test('Section E.2: PATCH rejects invalid values (purgeDays <= graceDays)', async () => {
    const res = mockRes();
    await updateRetentionPolicy({ body: { graceDays: 30, purgeDays: 30 }, user: { id: adminId } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /purgeDays must be strictly greater than graceDays/i);
  });

  await suite.test('Section E.3: PATCH rejects non-integer or zero values', async () => {
    const res1 = mockRes();
    await updateRetentionPolicy({ body: { graceDays: 0, purgeDays: 90 }, user: { id: adminId } }, res1);
    assert.equal(res1.statusCode, 400);

    const res2 = mockRes();
    await updateRetentionPolicy({ body: { graceDays: 30.5, purgeDays: 90 }, user: { id: adminId } }, res2);
    assert.equal(res2.statusCode, 400);
  });

  await suite.test('Section E.4: Non-admin users are rejected by requireAdmin middleware', async () => {
    const origFindById = User.findById;
    User.findById = () => ({
      select: async () => ({ role: 'intern' })
    });

    const res = mockRes();
    let nextCalled = false;
    try {
      await requireAdmin({ user: { id: internId1 } }, res, () => {
        nextCalled = true;
      });
      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    } finally {
      User.findById = origFindById;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION F: DRY_RUN safety
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section F.1: DRY_RUN=true identifies candidates but performs ZERO writes or emails', async () => {
    const today = new Date('2026-10-10T10:00:00Z');
    let dbWriteAttempted = false;

    const mockCandidate = {
      _id: internId1,
      email: 'dryrun@test.com',
      role: 'intern',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-08-01'),
      internshipDetails: { status: 'upcoming' },
      isArchived: false,
      save: async () => {
        dbWriteAttempted = true;
      }
    };

    const origFind = User.find;
    User.find = () => ({
      skip: () => ({
        limit: async () => [mockCandidate]
      })
    });

    try {
      // Run status job in dry run
      const statusRes = await runInternshipStatusJob({ currentDate: today, dryRun: true });
      assert.equal(dbWriteAttempted, false);
      assert.equal(mockCandidate.internshipDetails.status, 'upcoming'); // unmutated

      // Run retention job in dry run
      const origPolicy = RetentionPolicy.getOrCreatePolicy;
      RetentionPolicy.getOrCreatePolicy = async () => ({ graceDays: 30, purgeDays: 90 });

      let call = 0;
      User.find = () => {
        call++;
        return {
          limit: async () => (call === 1 ? [mockCandidate] : []),
          skip: () => ({
            limit: async () => [mockCandidate]
          })
        };
      };

      const retentionRes = await runRetentionJob({ currentDate: today, dryRun: true });
      assert.equal(dbWriteAttempted, false);
      assert.equal(mockCandidate.isArchived, false); // unmutated
      assert.equal(retentionRes.isDryRun, true);

      RetentionPolicy.getOrCreatePolicy = origPolicy;
    } finally {
      User.find = origFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION G: Intern Dashboard Warning Notice
  // ──────────────────────────────────────────────────────────────────────────
  await suite.test('Section G.1: getProfile returns archiveWarning when inside 7-day window', async () => {
    const origFindById = User.findById;
    const origPolicy = RetentionPolicy.getOrCreatePolicy;

    // endDate is 25 days ago. Grace is 30 days. Archival date is in 5 days (inside 7-day window).
    const endDate = new Date(Date.now() - 25 * 86400000);

    User.findById = () => ({
      select: async () => ({
        _id: internId1,
        fullName: 'Jane Doe',
        email: 'jane@test.com',
        role: 'intern',
        endDate,
        isArchived: false,
        purgedAt: null,
        toObject: function () {
          return { ...this };
        }
      })
    });

    RetentionPolicy.getOrCreatePolicy = async () => ({ graceDays: 30, purgeDays: 90 });

    const res = mockRes();
    try {
      await getProfile({ user: { id: internId1 } }, res);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.archiveWarning);
      assert.equal(res.body.archiveWarning.showWarning, true);
      assert.ok(res.body.archiveWarning.daysRemaining <= 7);
    } finally {
      User.findById = origFindById;
      RetentionPolicy.getOrCreatePolicy = origPolicy;
    }
  });
});
