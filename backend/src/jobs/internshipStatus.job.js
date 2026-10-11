import cron from 'node-cron';
import User from '../models/User.js';

/**
 * Executes the Internship Status Update Job:
 * 1. upcoming -> ongoing when startDate <= today
 * 2. ongoing -> completed when endDate < today
 *
 * Safety rules:
 * - Supports DRY_RUN=true env option (or dryRun parameter)
 * - Processes in batches of 100
 * - Logs each action to console with // TODO: logAction at each action
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun]
 * @returns {Promise<{ upcomingToOngoing: number, ongoingToCompleted: number }>}
 */
export const runInternshipStatusJob = async (options = {}) => {
  const isDryRun = process.env.DRY_RUN === 'true' || options.dryRun === true;
  console.log(`[Job:internshipStatus] Starting run${isDryRun ? ' [DRY-RUN MODE]' : ''}...`);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let upcomingToOngoing = 0;
  let ongoingToCompleted = 0;
  const batchSize = 100;

  // 1. Process upcoming -> ongoing when startDate <= today
  let skip = 0;
  while (true) {
    const upcomingInterns = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      'internshipDetails.status': 'upcoming',
      startDate: { $lte: endOfDay },
    })
      .skip(skip)
      .limit(batchSize);

    if (!upcomingInterns.length) break;

    for (const intern of upcomingInterns) {
      upcomingToOngoing++;
      console.log(
        `[Job:internshipStatus] [upcoming -> ongoing] Intern ${intern.fullName} (${intern.internCode || intern._id}) startDate=${intern.startDate?.toISOString()}`
      );

      if (!isDryRun) {
        intern.internshipDetails.status = 'ongoing';
        await intern.save();
        // TODO: logAction at each action
      }
    }

    if (upcomingInterns.length < batchSize) break;
    skip += batchSize;
  }

  // 2. Process ongoing -> completed when endDate < today (strictly before start of today)
  skip = 0;
  while (true) {
    const ongoingInterns = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      'internshipDetails.status': 'ongoing',
      endDate: { $lt: startOfDay },
    })
      .skip(skip)
      .limit(batchSize);

    if (!ongoingInterns.length) break;

    for (const intern of ongoingInterns) {
      ongoingToCompleted++;
      console.log(
        `[Job:internshipStatus] [ongoing -> completed] Intern ${intern.fullName} (${intern.internCode || intern._id}) endDate=${intern.endDate?.toISOString()}`
      );

      if (!isDryRun) {
        intern.internshipDetails.status = 'completed';
        await intern.save();
        // TODO: logAction at each action
      }
    }

    if (ongoingInterns.length < batchSize) break;
    skip += batchSize;
  }

  console.log(
    `[Job:internshipStatus] Finished: ${upcomingToOngoing} transitioned to ongoing, ${ongoingToCompleted} transitioned to completed.${isDryRun ? ' (No database writes in dry-run)' : ''}`
  );

  return { upcomingToOngoing, ongoingToCompleted, isDryRun };
};

// Schedule node-cron daily at 2:00 AM
export const scheduleInternshipStatusCron = () => {
  return cron.schedule('0 2 * * *', async () => {
    try {
      await runInternshipStatusJob();
    } catch (err) {
      console.error('[Job:internshipStatus] Scheduled job failed:', err);
    }
  });
};

export default { runInternshipStatusJob, scheduleInternshipStatusCron };
