import cron from 'node-cron';
import User from '../models/User.js';
import RetentionPolicy from '../models/RetentionPolicy.js';
import { sendEmail } from '../utils/sendEmail.js';
import { logAudit } from '../utils/auditLogger.js';
import { createNotification } from '../utils/notificationService.js';

const BATCH_SIZE = 100;
const DAY_MS = 86400000;
const dryRunEnabled = () => String(process.env.DRY_RUN).toLowerCase() === 'true';
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const startOfUtcDay = (date = new Date()) => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};

const plusDays = (date, days) => {
  const value = startOfUtcDay(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
};

async function forEachBatch(query, callback) {
  let lastId = null;
  while (true) {
    const batch = await User.find({ ...query, ...(lastId ? { _id: { $gt: lastId } } : {}) })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE);
    if (!batch.length) break;
    lastId = batch[batch.length - 1]._id;
    await callback(batch);
  }
}

export async function sendArchiveWarnings({ graceDays, dryRun, today, notify = createNotification, audit = logAudit, send = sendEmail }) {
  let warnings = 0;
  const targetEndDate = plusDays(today, 7 - graceDays);
  await forEachBatch({
    role: 'intern',
    isArchived: { $ne: true },
    personalDataPurged: { $ne: true },
    endDate: { $gte: targetEndDate, $lt: plusDays(targetEndDate, 1) },
  }, async (batch) => {
    for (const intern of batch) {
      if (!intern.endDate || !intern.email) continue;
      const archiveDate = plusDays(intern.endDate, graceDays);
      const daysUntilArchive = Math.round((archiveDate - today) / DAY_MS);
      if (daysUntilArchive !== 7) continue;
      if (intern.archiveWarningSentAt && startOfUtcDay(intern.archiveWarningSentAt).getTime() === today.getTime()) continue;

      if (dryRun) {
        console.log(`[retention] DRY RUN: would email ${intern.email} that account archives on ${archiveDate.toISOString().slice(0, 10)}`);
      } else {
        try {
          await send({
            to: intern.email,
            subject: 'Your UPTOSKILL internship account will be archived in 7 days',
            html: `<p>Hello ${escapeHtml(intern.fullName || 'Intern')},</p><p>Your internship portal account is scheduled for archival on ${archiveDate.toLocaleDateString('en-IN')}. You can still sign in and access your certificates until then. Contact an administrator if you need help.</p>`,
          });
          await audit({
            actor: { _id: null, role: 'system' },
            action: 'INTERN_ARCHIVE_WARNING',
            targetType: 'User',
            targetId: intern._id,
            entityType: 'User',
            entityId: intern._id,
            meta: { warningDays: 7, archiveDate: archiveDate.toISOString() },
            req: { ip: 'system', headers: { 'user-agent': 'retention-job' } }
          });
          intern.archiveWarningSentAt = new Date();
          await intern.save();

          await notify({
            userId: intern._id,
            title: 'Internship archive warning',
            message: `Your internship account is scheduled for archival on ${archiveDate.toLocaleDateString('en-IN')}.`,
            type: 'internship',
          email: false,
          });
        } catch (error) {
          console.error(`[retention] warning email failed for ${intern._id}:`, error.message);
          continue;
        }
      }
      warnings += 1;
    }
  });
  return warnings;
}

export async function archiveCompletedInterns({ graceDays, dryRun, today, notify = createNotification, audit = logAudit }) {
  let archived = 0;
  await forEachBatch({
    role: 'intern',
    isArchived: { $ne: true },
    'internshipDetails.status': 'completed',
    endDate: { $lt: today },
  }, async (batch) => {
    const eligible = batch.filter((intern) => intern.endDate &&
      (!intern.archiveRestoredAt || new Date(intern.endDate) > intern.archiveRestoredAt) &&
      plusDays(intern.endDate, graceDays) < today);
    for (const intern of eligible) {
      console.log(`[retention] ${dryRun ? 'DRY RUN: would archive' : 'archiving'} ${intern._id}`);
      if (dryRun) {
        archived += 1;
        continue;
      }
      const result = await User.updateOne(
        { _id: intern._id, isArchived: { $ne: true } },
        { $set: { isArchived: true, archivedAt: new Date() } }
      );
      if (result.modifiedCount) {
        await audit({
          actor: { _id: null, role: 'system' },
          action: 'INTERN_ARCHIVED',
          targetType: 'User',
          targetId: intern._id,
          entityType: 'User',
          entityId: intern._id,
          meta: { archiveReason: 'internship_completed', graceDays, archivedAt: new Date().toISOString() },
          req: { ip: 'system', headers: { 'user-agent': 'retention-job' } }
        });
        await notify({
          userId: intern._id,
          title: 'Internship account archived',
          message: 'Your internship account has been archived and is pending the configured retention period.',
          type: 'internship',
        });
        archived += 1;
      }
    }
  });
  return archived;
}

export async function purgeArchivedInterns({ purgeDays, dryRun, today, notify = createNotification, audit = logAudit }) {
  let purged = 0;
  const cutoff = plusDays(today, -purgeDays);
  await forEachBatch({
    role: 'intern',
    isArchived: true,
    personalDataPurged: { $ne: true },
    archivedAt: { $lt: cutoff },
  }, async (batch) => {
    for (const intern of batch) {
      const id = intern._id.toString();
      console.log(`[retention] ${dryRun ? 'DRY RUN: would anonymize' : 'anonymizing'} ${id}`);
      if (dryRun) {
        purged += 1;
        continue;
      }
      const result = await User.updateOne({ _id: intern._id, isArchived: true, personalDataPurged: { $ne: true } }, {
        $set: {
          fullName: `Former Intern ${id.slice(-8)}`,
          email: `purged-${id}@privacy.invalid`,
          internCode: `PURGED-${id}`,
          mobileNo: '',
          personalDataPurged: true,
        },
        $unset: { archiveWarningSentAt: 1 },
      });
      if (result.modifiedCount) {
        await audit({
          actor: { _id: null, role: 'system' },
          action: 'INTERN_PERSONAL_DATA_PURGED',
          targetType: 'User',
          targetId: intern._id,
          entityType: 'User',
          entityId: intern._id,
          meta: { purgeDays, archivedAt: intern.archivedAt ? new Date(intern.archivedAt).toISOString() : null },
          req: { ip: 'system', headers: { 'user-agent': 'retention-job' } }
        });
        await notify({
          userId: intern._id,
          title: 'Personal data purged',
          message: 'Your internship personal data has been anonymized after the retention window expired.',
          type: 'system',
        });
        purged += 1;
      }
    }
  });
  return purged;
}

export async function runRetentionJob({ dryRun = dryRunEnabled(), now = new Date() } = {}) {
  const today = startOfUtcDay(now);
  const policy = await RetentionPolicy.findOne({ policyKey: 'intern' }).lean();
  const graceDays = policy?.graceDays ?? 30;
  const purgeDays = policy?.purgeDays ?? 90;

  const warnings = await sendArchiveWarnings({ graceDays, dryRun, today });
  const archived = await archiveCompletedInterns({ graceDays, dryRun, today });
  const purged = await purgeArchivedInterns({ purgeDays, dryRun, today });
  return { warnings, archived, purged, dryRun };
}

export function scheduleRetentionJob() {
  return cron.schedule('5 2 * * *', () => {
    runRetentionJob().catch((error) => console.error('[retention] job failed:', error));
  }, { timezone: process.env.JOBS_TIMEZONE || 'Asia/Kolkata' });
}
