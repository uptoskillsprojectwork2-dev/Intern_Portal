import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/sendEmail.js';

const ALERT_DAYS = 3;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const targetDateForAlert = (now = new Date()) => {
  const target = startOfDay(now);
  target.setDate(target.getDate() + ALERT_DAYS);
  return target;
};

const dateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const runInternshipCompletionAlerts = async () => {
  const now = new Date();

  const today = startOfDay(now);

  const threeDaysFromNow = startOfDay(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + ALERT_DAYS);

  const interns = await User.find({
    role: 'intern',
    endDate: {
      $gte: today,
      $lte: endOfDay(threeDaysFromNow),
    },
    'internshipDetails.teamleaderEmail': { $exists: true, $ne: '' },
    'internshipDetails.status': { $nin: ['completed', 'cancelled'] },
  }).select(
    'fullName email internCode domain endDate internshipDetails.teamleaderEmail'
  );

  let created = 0;

  for (const intern of interns) {
    const teamLeaderEmail =
      intern.internshipDetails?.teamleaderEmail?.toLowerCase();

    if (!teamLeaderEmail) continue;

    const teamLeader = await User.findOne({
      email: teamLeaderEmail,
      role: 'teamleader',
    }).select('_id fullName email');

    if (!teamLeader) continue;

    const endDate = startOfDay(intern.endDate);

    const remainingDays = Math.round(
      (endDate.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let title;

    if (remainingDays === 0) {
      title = 'Internship ends today';
    } else if (remainingDays === 1) {
      title = 'Internship ending tomorrow';
    } else {
      title = `Internship ending in ${remainingDays} days`;
    }

    const endDateKey = dateKey(intern.endDate);

    const dedupeKey = `internship-completion:${intern._id}:${endDateKey}`;

    const message = `${intern.fullName}'s internship ends on ${new Date(
      intern.endDate
    ).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}. Please complete the required final review and certificate preparation.`;

    const existingNotification = await Notification.findOne({
      dedupeKey,
    });

    if (existingNotification) continue;

    try {
      await Notification.create({
        userId: teamLeader._id,
        title,
        message,
        type: 'internship',
        dedupeKey,
      });
    } catch (notificationError) {
      if (notificationError?.code === 11000) continue;
      throw notificationError;
    }

    created += 1;

    try {
      await sendEmail({
        to: teamLeader.email,
        subject: `${title}: ${intern.fullName}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
            <h2>Internship Completion Reminder</h2>

            <p>Hello ${teamLeader.fullName || 'Team Leader'},</p>

            <p>
              This is a reminder that
              <strong>${intern.fullName}</strong>
              (${intern.internCode || intern.email})
              ${
                remainingDays === 0
                  ? 'is completing their internship today'
                  : remainingDays === 1
                  ? 'is completing their internship tomorrow'
                  : `is scheduled to complete their internship in ${remainingDays} days`
              }.
            </p>

            <p>
              <strong>End date:</strong>
              ${new Date(intern.endDate).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <p>
              Please complete the required final review and certificate preparation.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error(
        `Unable to email internship completion alert to ${teamLeader.email}:`,
        emailError.message
      );
    }
  }

  return {
    checked: interns.length,
    created,
  };
};

export const startInternshipCompletionAlertScheduler = () => {
  const run = async () => {
    try {
      const result = await runInternshipCompletionAlerts();
      console.log(`Internship completion alert check: ${result.checked} intern(s) checked, ${result.created} new alert(s).`);
    } catch (error) {
      console.error('Internship completion alert check failed:', error);
    }
  };

  // Run once when the server starts, then check hourly.
  run();
  return setInterval(run, CHECK_INTERVAL_MS);
};
