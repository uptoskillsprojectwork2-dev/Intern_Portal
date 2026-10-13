import cron from 'node-cron';
import User from '../src/models/User.js';
import RetentionPolicy from '../src/models/RetentionPolicy.model.js';
import { sendEmail } from '../src/utils/sendEmail.js';

export const getRetentionPolicyDocument = async () => {
  let policy = await RetentionPolicy.findOne();
  if (!policy) {
    policy = await RetentionPolicy.create({ graceDays: 30, purgeDays: 90 });
  }
  return policy;
};

export const runRetentionJob = async () => {
  const isDryRun = process.env.DRY_RUN === 'true';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`[JOB: Retention] Running retention & archiving job. Dry-Run mode: ${isDryRun}`);

  try {
    const policy = await getRetentionPolicyDocument();
    const graceMs = policy.graceDays * 24 * 60 * 60 * 1000;
    const purgeMs = policy.purgeDays * 24 * 60 * 60 * 1000;
    const warningMs = Math.max(0, (policy.graceDays - 7)) * 24 * 60 * 60 * 1000;

    // 1. Send warning email 7 days before archival
    const warningCandidates = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      endDate: { $exists: true, $ne: null }
    }).limit(100);

    for (const intern of warningCandidates) {
      if (!intern.endDate) continue;
      const end = new Date(intern.endDate);
      const archiveDate = new Date(end.getTime() + graceMs);
      const warnDate = new Date(end.getTime() + warningMs);

      if (today >= warnDate && today < archiveDate) {
        const daysLeft = Math.max(1, Math.ceil((archiveDate - today) / (1000 * 60 * 60 * 24)));
        console.log(`[JOB: Retention] Sending 7-day warning email to intern ${intern._id} (${intern.email}). Archival in ~${daysLeft} days.`);
        // TODO: logAction('RETENTION_WARNING_EMAIL_SENT', intern._id, { daysLeft });
        if (!isDryRun && intern.email && !intern.email.includes('@deleted.invalid')) {
          try {
            await sendEmail({
              to: intern.email,
              subject: 'Notice: Internship Account Archival Warning',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #d97706;">Account Archival Notice</h2>
                  <p>Hello ${intern.fullName},</p>
                  <p>Your internship end date was <strong>${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>. Under our data retention policy, your intern account will be archived in approximately <strong>${daysLeft} day(s)</strong>.</p>
                  <p>During the grace period, you can still log in to view and download your certificates. After archival, account access will be restricted.</p>
                  <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">Best regards,<br/><strong>UPTOSKILL Admin Team</strong></p>
                </div>
              `
            });
          } catch (emailErr) {
            console.error(`[JOB: Retention] Failed to send warning email to ${intern.email}:`, emailErr.message);
          }
        }
      }
    }

    // 2. Archival Job: completed interns where endDate + graceDays < today
    const archiveCutoff = new Date(today.getTime() - graceMs);
    const internsToArchive = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      endDate: { $lte: archiveCutoff }
    }).limit(100);

    for (const intern of internsToArchive) {
      console.log(`[JOB: Retention] Archiving intern ${intern._id} (${intern.fullName}, code: ${intern.internCode}). EndDate: ${intern.endDate}`);
      // TODO: logAction('INTERN_ACCOUNT_ARCHIVED', intern._id, { endDate: intern.endDate, graceDays: policy.graceDays });
      if (!isDryRun) {
        intern.isArchived = true;
        intern.archivedAt = new Date();
        await intern.save();
      }
    }

    // 3. Purge Job: archived interns where archivedAt + purgeDays < today
    const purgeCutoff = new Date(today.getTime() - purgeMs);
    const internsToPurge = await User.find({
      role: 'intern',
      isArchived: true,
      archivedAt: { $lte: purgeCutoff },
      email: { $not: /@deleted\.invalid$/ }
    }).limit(100);

    for (const intern of internsToPurge) {
      console.log(`[JOB: Retention] Purging personal data for archived intern ${intern._id}. ArchivedAt: ${intern.archivedAt}`);
      // TODO: logAction('INTERN_ACCOUNT_PURGED', intern._id, { archivedAt: intern.archivedAt, purgeDays: policy.purgeDays });
      if (!isDryRun) {
        const anonId = intern._id.toString().slice(-6);
        intern.fullName = 'Anonymized Intern';
        intern.email = `purged_${anonId}_${Date.now()}@deleted.invalid`;
        intern.mobileNo = null;
        if (intern.internCode) {
          intern.internCode = `ANON_${anonId}`;
        }
        await intern.save();
        // NOTE: Certificate records and PDF files remain untouched so issued certificates stay verifiable.
      }
    }

    console.log('[JOB: Retention] Retention job execution completed.');
  } catch (err) {
    console.error('[JOB: Retention] Error running retention job:', err);
  }
};

// Schedule to run daily at 2 AM (0 2 * * *)
export const initRetentionSchedule = () => {
  cron.schedule('0 2 * * *', async () => {
    await runRetentionJob();
  });
  console.log('[Cron] Retention job scheduled for 02:00 daily.');
};
