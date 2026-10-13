import cron from "node-cron";
import User from "../models/User.js";
import RetentionPolicy from "../models/RetentionPolicy.model.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Checks whether dry-run mode is active via the DRY_RUN environment variable.
 */
export const isDryRunMode = () => {
  return String(process.env.DRY_RUN).toLowerCase() === "true";
};

/**
 * Calculates the exact scheduled archival date for an intern:
 * scheduledArchivalDate = endDate + (graceDays * 24h)
 *
 * @param {Date|string} endDate
 * @param {number} graceDays
 * @returns {Date}
 */
export const calculateArchivalDate = (endDate, graceDays) => {
  const d = new Date(endDate);
  d.setDate(d.getDate() + Number(graceDays));
  return d;
};

/**
 * Calculates purge eligibility date:
 * purgeDate = archivedAt + (purgeDays * 24h)
 *
 * @param {Date|string} archivedAt
 * @param {number} purgeDays
 * @returns {Date}
 */
export const calculatePurgeDate = (archivedAt, purgeDays) => {
  const d = new Date(archivedAt);
  d.setDate(d.getDate() + Number(purgeDays));
  return d;
};

/**
 * Executes the data retention job:
 * A. Send archive warning emails (7 days before archival date)
 * B. Archive eligible interns (status completed and endDate + graceDays < today)
 * C. Purge personal data through anonymization (archivedAt + purgeDays < today)
 *
 * @param {Object} options
 * @param {Date} [options.currentDate] - Optional override date for testing
 * @param {boolean} [options.dryRun] - Optional override for dry run mode
 * @returns {Promise<{ warningsSent: number, archivedCount: number, purgedCount: number, isDryRun: boolean }>}
 */
export const runRetentionJob = async (options = {}) => {
  const isDryRun = options.dryRun !== undefined ? options.dryRun : isDryRunMode();
  const now = options.currentDate ? new Date(options.currentDate) : new Date();

  console.log(`[RetentionJob] Running retention job (DryRun: ${isDryRun}, Date: ${now.toISOString()})`);

  // Load current singleton policy
  const policy = await RetentionPolicy.getOrCreatePolicy();
  const graceDays = policy.graceDays || 30;
  const purgeDays = policy.purgeDays || 90;

  let warningsSent = 0;
  let archivedCount = 0;
  let purgedCount = 0;
  const batchSize = 100;

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // A. Send archive warning emails: 7 days before scheduled archival date
    // Archival date = endDate + graceDays
    // Warning window start = archivalDate - 7 days = endDate + graceDays - 7 days
    // ──────────────────────────────────────────────────────────────────────────
    const warningCandidates = await User.find({
      role: "intern",
      "internshipDetails.status": "completed",
      endDate: { $exists: true, $ne: null },
      isArchived: { $ne: true },
      purgedAt: null,
      archiveWarningSentAt: null
    }).limit(batchSize * 5); // Safe bounded set

    for (const intern of warningCandidates) {
      if (!intern.endDate || isNaN(new Date(intern.endDate).getTime())) continue;

      const archivalDate = calculateArchivalDate(intern.endDate, graceDays);
      const warningStartDate = new Date(archivalDate);
      warningStartDate.setDate(warningStartDate.getDate() - 7);

      // Within 7-day warning window and not yet archived
      if (now >= warningStartDate && now < archivalDate) {
        if (isDryRun) {
          console.log(
            `[RetentionJob][DRY_RUN] Would send archive warning email to ${intern.email} (Archival scheduled: ${archivalDate.toISOString()})`
          );
        } else {
          try {
            await sendEmail({
              to: intern.email,
              subject: "Important: Your UPTOSKILL Internship Account Will Be Archived Soon",
              html: `
                <p>Dear ${intern.fullName},</p>
                <p>This is a reminder that your internship has ended and your portal account is scheduled to be archived on <strong>${archivalDate.toLocaleDateString()}</strong>.</p>
                <p>Please log in to review and download any certificates or documentation you need before this date.</p>
                <p>Best regards,<br/>UPTOSKILL Team</p>
              `
            });
            intern.archiveWarningSentAt = new Date();
            await intern.save();
            console.log(`[RetentionJob] Sent archive warning email to ${intern.email}`);
          } catch (emailErr) {
            console.error(`[RetentionJob] Failed to send warning email to ${intern.email}:`, emailErr.message);
            // Handle email failure gracefully without aborting the job
          }
        }
        warningsSent++;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // B. Archive eligible interns
    // Condition: status === 'completed', endDate exists, endDate + graceDays < today, not already archived/purged
    // ──────────────────────────────────────────────────────────────────────────
    let hasMoreArchivable = true;
    let skipArchivable = 0;

    // Cutoff date for endDate: if endDate + graceDays < now => endDate < now - graceDays
    const archiveCutoff = new Date(now);
    archiveCutoff.setDate(archiveCutoff.getDate() - graceDays);

    while (hasMoreArchivable) {
      const archivable = await User.find({
        role: "intern",
        "internshipDetails.status": "completed",
        endDate: { $exists: true, $ne: null, $lt: archiveCutoff },
        isArchived: { $ne: true },
        purgedAt: null
      })
        .skip(isDryRun ? skipArchivable : 0)
        .limit(batchSize);

      if (!archivable || archivable.length === 0) {
        hasMoreArchivable = false;
        break;
      }

      for (const intern of archivable) {
        if (!intern.endDate || isNaN(new Date(intern.endDate).getTime())) continue;

        if (isDryRun) {
          console.log(`[RetentionJob][DRY_RUN] Would archive intern ${intern._id} (${intern.email})`);
        } else {
          intern.isArchived = true;
          intern.archivedAt = new Date();
          await intern.save();
          console.log(`[RetentionJob] Archived intern ${intern._id} (${intern.email})`);
          // TODO: logAction at each lifecycle action for future audit logging
        }
        archivedCount++;
      }

      if (isDryRun) {
        skipArchivable += archivable.length;
      }
      if (archivable.length < batchSize) {
        hasMoreArchivable = false;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // C. Purge personal data through anonymization
    // Condition: isArchived === true, archivedAt + purgeDays < now, purgedAt == null
    // ──────────────────────────────────────────────────────────────────────────
    let hasMorePurgable = true;
    let skipPurgable = 0;

    // Cutoff date for archivedAt: archivedAt < now - purgeDays
    const purgeCutoff = new Date(now);
    purgeCutoff.setDate(purgeCutoff.getDate() - purgeDays);

    while (hasMorePurgable) {
      const purgable = await User.find({
        role: "intern",
        isArchived: true,
        archivedAt: { $exists: true, $ne: null, $lt: purgeCutoff },
        purgedAt: null
      })
        .skip(isDryRun ? skipPurgable : 0)
        .limit(batchSize);

      if (!purgable || purgable.length === 0) {
        hasMorePurgable = false;
        break;
      }

      for (const intern of purgable) {
        if (isDryRun) {
          console.log(`[RetentionJob][DRY_RUN] Would purge/anonymize intern ${intern._id} (${intern.email})`);
        } else {
          // Anonymize personal info with unique deterministic safe values satisfying DB uniqueness constraints
          const idStr = String(intern._id);
          intern.fullName = "Archived Intern";
          intern.email = `purged_${idStr}@uptoskills.local`;
          intern.mobileNo = "+0000000000";
          intern.internCode = `PURGED_${idStr}`;
          intern.purgedAt = new Date();

          // Scramble password so purged accounts can never log in
          intern.password = `$2a$10$ANONYMIZED.PURGED.ACCOUNT.${idStr.slice(-8)}`;

          await intern.save();
          console.log(`[RetentionJob] Anonymized personal data for purged user ${intern._id}`);
          // TODO: logAction at each lifecycle action for future audit logging
        }
        purgedCount++;
      }

      if (isDryRun) {
        skipPurgable += purgable.length;
      }
      if (purgable.length < batchSize) {
        hasMorePurgable = false;
      }
    }

    console.log(
      `[RetentionJob] Summary: ${warningsSent} warnings, ${archivedCount} archived, ${purgedCount} purged (DryRun: ${isDryRun})`
    );

    return {
      warningsSent,
      archivedCount,
      purgedCount,
      isDryRun
    };
  } catch (err) {
    console.error("[RetentionJob] Error in retention job:", err);
    throw err;
  }
};

/**
 * Registers the retention cron job: daily at 2:00 AM
 */
let scheduledRetentionTask = null;

export const initRetentionCron = () => {
  if (scheduledRetentionTask) {
    return scheduledRetentionTask;
  }

  const cronOptions = {};
  const tz = process.env.TIMEZONE || process.env.TZ;
  if (tz) {
    cronOptions.timezone = tz;
  }

  scheduledRetentionTask = cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        await runRetentionJob();
      } catch (err) {
        console.error("[RetentionJob] Unhandled retention cron error:", err);
      }
    },
    cronOptions
  );

  console.log(`[RetentionJob] Retention cron registered (daily at 2 AM${tz ? `, timezone: ${tz}` : ""})`);
  return scheduledRetentionTask;
};

export default {
  runRetentionJob,
  initRetentionCron,
  calculateArchivalDate,
  calculatePurgeDate,
  isDryRunMode
};
