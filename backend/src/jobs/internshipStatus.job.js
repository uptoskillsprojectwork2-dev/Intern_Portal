import cron from "node-cron";
import User from "../models/User.js";

/**
 * Checks whether dry-run mode is active via the DRY_RUN environment variable.
 * When DRY_RUN=true, all state calculations and candidate logging occur,
 * but database writes and external side-effects are skipped.
 */
export const isDryRunMode = () => {
  return String(process.env.DRY_RUN).toLowerCase() === "true";
};

/**
 * Executes the scheduled internship status updates:
 * 1. upcoming -> ongoing when startDate <= today
 * 2. ongoing -> completed when endDate < today
 *
 * @param {Object} options
 * @param {Date} [options.currentDate] - Optional override for testing
 * @param {boolean} [options.dryRun] - Optional override for dry run mode
 * @returns {Promise<{ upcomingToOngoing: number, ongoingToCompleted: number, isDryRun: boolean }>}
 */
export const runInternshipStatusJob = async (options = {}) => {
  const isDryRun = options.dryRun !== undefined ? options.dryRun : isDryRunMode();
  const now = options.currentDate ? new Date(options.currentDate) : new Date();

  // Normalize today's boundaries for safe date comparisons
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let upcomingToOngoingCount = 0;
  let ongoingToCompletedCount = 0;
  const batchSize = 100;

  console.log(`[StatusJob] Running status transition job (DryRun: ${isDryRun}, Date: ${now.toISOString()})`);

  try {
    // 1. Process upcoming -> ongoing: startDate <= today
    let hasMoreUpcoming = true;
    let skipUpcoming = 0;

    while (hasMoreUpcoming) {
      // Find eligible interns whose startDate has arrived and status is upcoming
      const candidates = await User.find({
        role: "intern",
        "internshipDetails.status": "upcoming",
        startDate: { $exists: true, $ne: null, $lte: endOfToday }
      })
        .skip(isDryRun ? skipUpcoming : 0) // In real run, updated records leave the query set
        .limit(batchSize);

      if (!candidates || candidates.length === 0) {
        hasMoreUpcoming = false;
        break;
      }

      for (const intern of candidates) {
        // Validate date
        if (!intern.startDate || isNaN(new Date(intern.startDate).getTime())) {
          console.warn(`[StatusJob] Skipping intern ${intern._id} (${intern.email}) due to invalid startDate`);
          continue;
        }

        const plannedFrom = intern.internshipDetails?.status || "upcoming";
        const plannedTo = "ongoing";

        if (isDryRun) {
          console.log(`[StatusJob][DRY_RUN] Would transition intern ${intern._id} (${intern.email}): ${plannedFrom} -> ${plannedTo}`);
        } else {
          intern.internshipDetails.status = plannedTo;
          await intern.save();
          console.log(`[StatusJob] Transitioned intern ${intern._id} (${intern.email}): ${plannedFrom} -> ${plannedTo}`);
          // TODO: logAction at each lifecycle action for future audit logging
        }
        upcomingToOngoingCount++;
      }

      if (isDryRun) {
        skipUpcoming += candidates.length;
      }
      if (candidates.length < batchSize) {
        hasMoreUpcoming = false;
      }
    }

    // 2. Process ongoing -> completed: endDate < today
    let hasMoreOngoing = true;
    let skipOngoing = 0;

    while (hasMoreOngoing) {
      // Find eligible interns whose endDate is strictly before today and status is ongoing
      const candidates = await User.find({
        role: "intern",
        "internshipDetails.status": "ongoing",
        endDate: { $exists: true, $ne: null, $lt: startOfToday }
      })
        .skip(isDryRun ? skipOngoing : 0)
        .limit(batchSize);

      if (!candidates || candidates.length === 0) {
        hasMoreOngoing = false;
        break;
      }

      for (const intern of candidates) {
        // Validate date
        if (!intern.endDate || isNaN(new Date(intern.endDate).getTime())) {
          console.warn(`[StatusJob] Skipping intern ${intern._id} (${intern.email}) due to invalid endDate`);
          continue;
        }

        const plannedFrom = intern.internshipDetails?.status || "ongoing";
        const plannedTo = "completed";

        if (isDryRun) {
          console.log(`[StatusJob][DRY_RUN] Would transition intern ${intern._id} (${intern.email}): ${plannedFrom} -> ${plannedTo}`);
        } else {
          intern.internshipDetails.status = plannedTo;
          await intern.save();
          console.log(`[StatusJob] Transitioned intern ${intern._id} (${intern.email}): ${plannedFrom} -> ${plannedTo}`);
          // TODO: logAction at each lifecycle action for future audit logging
        }
        ongoingToCompletedCount++;
      }

      if (isDryRun) {
        skipOngoing += candidates.length;
      }
      if (candidates.length < batchSize) {
        hasMoreOngoing = false;
      }
    }

    console.log(
      `[StatusJob] Completed: ${upcomingToOngoingCount} upcoming->ongoing, ${ongoingToCompletedCount} ongoing->completed (DryRun: ${isDryRun})`
    );

    return {
      upcomingToOngoing: upcomingToOngoingCount,
      ongoingToCompleted: ongoingToCompletedCount,
      isDryRun
    };
  } catch (err) {
    console.error("[StatusJob] Error during internship status job:", err);
    throw err;
  }
};

/**
 * Registers the node-cron schedule: daily at 2:00 AM
 */
let scheduledTask = null;

export const initInternshipStatusCron = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  const cronOptions = {};
  const tz = process.env.TIMEZONE || process.env.TZ;
  if (tz) {
    cronOptions.timezone = tz;
  }

  scheduledTask = cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        await runInternshipStatusJob();
      } catch (err) {
        console.error("[StatusJob] Unhandled cron run error:", err);
      }
    },
    cronOptions
  );

  console.log(`[StatusJob] Internship status cron registered (daily at 2 AM${tz ? `, timezone: ${tz}` : ""})`);
  return scheduledTask;
};

export default {
  runInternshipStatusJob,
  initInternshipStatusCron,
  isDryRunMode
};
