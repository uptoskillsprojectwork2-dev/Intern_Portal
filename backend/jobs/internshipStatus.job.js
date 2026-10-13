import cron from 'node-cron';
import User from '../src/models/User.js';

export const runInternshipStatusJob = async () => {
  const isDryRun = process.env.DRY_RUN === 'true';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`[JOB: InternshipStatus] Running status update check. Dry-Run mode: ${isDryRun}`);

  try {
    // 1. Convert 'upcoming' -> 'ongoing' when startDate <= today
    const upcomingInterns = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      startDate: { $lte: today },
      $or: [
        { 'internshipDetails.status': 'upcoming' },
        { 'internshipDetails.status': { $exists: false } }
      ]
    }).limit(100);

    for (const intern of upcomingInterns) {
      console.log(`[JOB: InternshipStatus] Intern ${intern._id} (${intern.fullName}): upcoming -> ongoing`);
      // TODO: logAction('INTERNSHIP_STATUS_UPDATE', intern._id, { from: 'upcoming', to: 'ongoing' });
      if (!isDryRun) {
        if (!intern.internshipDetails) intern.internshipDetails = {};
        intern.internshipDetails.status = 'ongoing';
        await intern.save();
      }
    }

    // 2. Convert 'ongoing' -> 'completed' when endDate < today
    const completedInterns = await User.find({
      role: 'intern',
      isArchived: { $ne: true },
      endDate: { $lt: today },
      'internshipDetails.status': { $ne: 'completed' }
    }).limit(100);

    for (const intern of completedInterns) {
      console.log(`[JOB: InternshipStatus] Intern ${intern._id} (${intern.fullName}): ${intern.internshipDetails?.status || 'ongoing'} -> completed`);
      // TODO: logAction('INTERNSHIP_STATUS_UPDATE', intern._id, { from: intern.internshipDetails?.status, to: 'completed' });
      if (!isDryRun) {
        if (!intern.internshipDetails) intern.internshipDetails = {};
        intern.internshipDetails.status = 'completed';
        await intern.save();
      }
    }

    console.log('[JOB: InternshipStatus] Status update job completed.');
  } catch (err) {
    console.error('[JOB: InternshipStatus] Error running status update job:', err);
  }
};

// Schedule to run daily at 2 AM (0 2 * * *)
export const initInternshipStatusSchedule = () => {
  cron.schedule('0 2 * * *', async () => {
    await runInternshipStatusJob();
  });
  console.log('[Cron] Internship status job scheduled for 02:00 daily.');
};
