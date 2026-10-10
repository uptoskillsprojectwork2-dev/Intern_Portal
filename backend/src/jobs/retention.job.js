import cron from 'node-cron';
import User from '../models/User.js';
import RetentionPolicy from '../models/RetentionPolicy.model.js';
import { sendEmail } from '../utils/sendEmail.js';

export const initRetentionJob = () => {
  cron.schedule('0 2 * * *', async () => {
    const isDryRun = process.env.DRY_RUN === 'true';
    console.log(`[JOB] Starting retention job (DRY_RUN: ${isDryRun})`);
    
    try {
        let policy = await RetentionPolicy.findOne();
        if (!policy) {
            console.log(`[JOB] No retention policy found, skipping.`);
            return;
        }

        const { graceDays, purgeDays } = policy;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Archiving
        const BATCH_SIZE = 100;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const completedInterns = await User.find({
                role: 'intern',
                'internshipDetails.status': 'completed',
                isArchived: false,
                endDate: { $exists: true }
            }).limit(BATCH_SIZE).skip(skip);

            if (completedInterns.length === 0) {
                hasMore = false;
                break;
            }

            for (const intern of completedInterns) {
                const endDate = new Date(intern.endDate);
                endDate.setHours(0, 0, 0, 0);

                const archiveDate = new Date(endDate);
                archiveDate.setDate(archiveDate.getDate() + graceDays);

                const warningDate = new Date(archiveDate);
                warningDate.setDate(warningDate.getDate() - 7);

                // Warning email
                if (today.getTime() === warningDate.getTime()) {
                    if (!isDryRun) {
                        await sendEmail({
                            to: intern.email,
                            subject: 'Your internship account will be archived soon',
                            html: '<p>Your account will be archived in 7 days. Please download any necessary certificates before you lose access.</p>'
                        });
                    }
                    console.log(`[JOB] Sent archive warning email to intern: ${intern.email}`);
                }

                // Archive
                if (today >= archiveDate) {
                    // TODO: logAction
                    if (!isDryRun) {
                        intern.isArchived = true;
                        intern.archivedAt = new Date();
                        await intern.save();
                    }
                    console.log(`[JOB] Archived intern: ${intern._id}`);
                }
            }
            skip += BATCH_SIZE;
        }

        // Purging
        skip = 0;
        hasMore = true;

        while (hasMore) {
            const archivedInterns = await User.find({
                role: 'intern',
                isArchived: true,
                archivedAt: { $exists: true }
            }).limit(BATCH_SIZE).skip(skip);

            if (archivedInterns.length === 0) {
                hasMore = false;
                break;
            }

            for (const intern of archivedInterns) {
                const archivedDate = new Date(intern.archivedAt);
                archivedDate.setHours(0, 0, 0, 0);
                
                const purgeDate = new Date(archivedDate);
                purgeDate.setDate(purgeDate.getDate() + purgeDays);

                if (today >= purgeDate) {
                    // TODO: logAction
                    if (!isDryRun) {
                        intern.fullName = 'Anonymized User';
                        intern.email = `anon_${intern._id}@anonymized.com`;
                        intern.mobileNo = '0000000000';
                        intern.internCode = `ANON_${intern._id}`;
                        await intern.save();
                    }
                    console.log(`[JOB] Purged intern data: ${intern._id}`);
                }
            }
            skip += BATCH_SIZE;
        }
    } catch (err) {
        console.error(`[JOB] Error in retention job: ${err.message}`);
    }
  });
};
