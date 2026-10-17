import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import User from '../src/models/User.js';
import RetentionPolicy from '../src/models/RetentionPolicy.model.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const testJobs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Create a retention policy
        await RetentionPolicy.deleteMany({});
        await RetentionPolicy.create({ graceDays: 1, purgeDays: 3 });

        // Set an intern to have ended yesterday
        const intern = await User.findOne({ role: 'intern' });
        if (intern) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 2);
            intern.endDate = yesterday;
            intern.internshipDetails.status = 'ongoing';
            intern.isArchived = false;
            await intern.save();
            console.log(`Set intern ${intern.email} to ended yesterday.`);
        }

        // Run status job logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ongoingInterns = await User.find({
            role: 'intern',
            'internshipDetails.status': 'ongoing',
            endDate: { $lt: today }
        });

        for (const i of ongoingInterns) {
            i.internshipDetails.status = 'completed';
            await i.save();
            console.log(`Updated status to completed for intern: ${i._id}`);
        }

        // Run retention job logic
        let policy = await RetentionPolicy.findOne();
        const { graceDays, purgeDays } = policy;

        const completedInterns = await User.find({
            role: 'intern',
            'internshipDetails.status': 'completed',
            isArchived: false,
            endDate: { $exists: true }
        });

        for (const i of completedInterns) {
            const endDate = new Date(i.endDate);
            endDate.setHours(0, 0, 0, 0);

            const archiveDate = new Date(endDate);
            archiveDate.setDate(archiveDate.getDate() + graceDays);

            if (today >= archiveDate) {
                i.isArchived = true;
                i.archivedAt = new Date();
                await i.save();
                console.log(`Archived intern: ${i._id}`);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

testJobs();
