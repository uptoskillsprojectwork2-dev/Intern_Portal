const cron = require('node-cron');
const Intern = require('../models/Intern.model'); // Adjust path to your Intern model
// Assume you have an email utility function configured
const { sendEmail } = require('./sendEmail'); 

const initInternExpiryCron = () => {
    // Schedule cron job to run every day at 00:00 (Midnight)
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily check for intern completion alerts...');

            // Calculate the target date (Exactly 3 days from today)
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 3);
            
            // Set time boundaries for the entire target day (00:00:00 to 23:59:59)
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            // Find interns whose internship ends on this specific target day
            const expiringInterns = await Intern.find({
                endDate: { $gte: startOfDay,$lte: endOfDay },
                status: 'Active' // Ensure we only check active interns
            }).populate('teamLead hr'); // Populate TL and HR details if stored as refs

            if (expiringInterns.length === 0) {
                console.log('No interns completing their internship in 3 days.');
                return;
            }

            for (const intern of expiringInterns) {
                const tlEmail = intern.teamLead?.email || intern.teamLeadEmail;
                const hrEmail = intern.hr?.email || intern.hrEmail;

                const notificationSubject = `Alert: Intern ${intern.fullName} Completing Internship in 3 Days`;
                const notificationBody = `
                    <h3>Internship Completion Notice</h3>
                    <p>This is an automated notification that intern <strong>${intern.fullName}</strong> (${intern.email}) is scheduled to complete their internship in 3 days on <strong>${intern.endDate.toDateString()}</strong>.</p>
                    <p>Please initiate the final review, offboarding, and certificate generation procedures.</p>
                `;

                // Send email to Team Lead
                if (tlEmail) {
                    await sendEmail({
                        to: tlEmail,
                        subject: notificationSubject,
                        html: notificationBody
                    });
                }

                // Send email to HR
                if (hrEmail) {
                    await sendEmail({
                        to: hrEmail,
                        subject: notificationSubject,
                        html: notificationBody
                    });
                }

                console.log(`Alert sent for intern: ${intern.fullName}`);
            }
        } catch (error) {
            console.error('Error running intern expiry cron job:', error);
        }
    });
};

module.exports = { initInternExpiryCron };