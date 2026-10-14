import cron from 'node-cron';
import User from '../models/User.js';

export const initInternshipStatusJob = () => {
  cron.schedule('0 2 * * *', async () => {
    const isDryRun = process.env.DRY_RUN === 'true';
    console.log(`[JOB] Starting internship status update job (DRY_RUN: ${isDryRun})`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const BATCH_SIZE = 100;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const upcomingInterns = await User.find({
                role: 'intern',
                'internshipDetails.status': 'upcoming',
                startDate: { $lte: today }
            }).limit(BATCH_SIZE).skip(skip);

            if (upcomingInterns.length === 0) {
                hasMore = false;
                break;
            }

            for (const intern of upcomingInterns) {
                // TODO: logAction
                if (!isDryRun) {
                    intern.internshipDetails.status = 'ongoing';
                    await intern.save();
                }
                console.log(`[JOB] Updated status to ongoing for intern: ${intern._id}`);
            }
            skip += BATCH_SIZE;
        }

        skip = 0;
        hasMore = true;

        while (hasMore) {
            const ongoingInterns = await User.find({
                role: 'intern',
                'internshipDetails.status': 'ongoing',
                endDate: { $lt: today }
            }).limit(BATCH_SIZE).skip(skip);

            if (ongoingInterns.length === 0) {
                hasMore = false;
                break;
            }

            for (const intern of ongoingInterns) {
                // TODO: logAction
                if (!isDryRun) {
                    intern.internshipDetails.status = 'completed';
                    await intern.save();
                }
                console.log(`[JOB] Updated status to completed for intern: ${intern._id}`);
            }
            skip += BATCH_SIZE;
        }
    } catch (err) {
        console.error(`[JOB] Error in internship status job: ${err.message}`);
    }
  });
};
