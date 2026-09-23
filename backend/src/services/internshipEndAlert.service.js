import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * Calculates target calendar date range exactly 3 days after referenceDate.
 * Range covers 00:00:00.000 to 23:59:59.999 UTC of that target calendar day.
 */
export function getThreeDaysAheadWindow(referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  // Add 3 full calendar days in UTC
  const targetYear = ref.getUTCFullYear();
  const targetMonth = ref.getUTCMonth();
  const targetDay = ref.getUTCDate() + 3;

  const startOfDay = new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(targetYear, targetMonth, targetDay, 23, 59, 59, 999));
  const dateKey = startOfDay.toISOString().slice(0, 10);

  return { startOfDay, endOfDay, dateKey };
}

/**
 * Scans for interns whose internship ends in exactly 3 days and generates
 * deduplicated notifications addressed exclusively to their assigned Team Leader.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<{ scanned: number, created: number, skipped: number }>}
 */
export async function createThreeDayCompletionAlerts(referenceDate = new Date()) {
  const { startOfDay, endOfDay, dateKey } = getThreeDaysAheadWindow(referenceDate);

  // Query eligible interns ending on target day whose status is active/ongoing/upcoming (not completed or cancelled)
  const interns = await User.find({
    role: 'intern',
    endDate: { $gte: startOfDay, $lte: endOfDay },
    'internshipDetails.status': { $nin: ['completed', 'cancelled'] },
    $or: [
      { 'internshipDetails.teamLeader': { $exists: true, $ne: null } },
      { 'internshipDetails.teamleaderEmail': { $exists: true, $ne: null, $ne: '' } }
    ]
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const intern of interns) {
    try {
      // 1. Resolve Team Leader
      let tlUser = null;
      if (intern.internshipDetails?.teamLeader) {
        tlUser = await User.findOne({
          _id: intern.internshipDetails.teamLeader,
          role: 'teamleader'
        });
      }

      if (!tlUser && intern.internshipDetails?.teamleaderEmail) {
        tlUser = await User.findOne({
          email: intern.internshipDetails.teamleaderEmail.toLowerCase(),
          role: 'teamleader'
        });
      }

      // If no valid team leader exists or account was deleted, skip safely without crashing
      if (!tlUser) {
        skippedCount++;
        continue;
      }

      // 2. Build unique dedupeKey
      const dedupeKey = `internship-ending-3-days:${intern._id}:${dateKey}`;

      // Check if notification already exists
      const existing = await Notification.findOne({ dedupeKey });
      if (existing) {
        skippedCount++;
        continue;
      }

      const formattedEndDate = new Date(intern.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // 3. Create Notification
      await Notification.create({
        userId: tlUser._id,
        title: 'Internship ending in 3 days',
        message: `${intern.fullName}'s internship is scheduled to end in 3 days on ${formattedEndDate}.`,
        type: 'internship',
        dedupeKey,
        metadata: {
          daysRemaining: 3,
          internId: intern._id,
          fullName: intern.fullName,
          internName: intern.fullName,
          email: intern.email,
          internCode: intern.internCode,
          endDate: intern.endDate,
          domain: intern.domain || ''
        }
      });

      createdCount++;
    } catch (err) {
      // MongoDB duplicate key error (code 11000) handles race conditions safely
      if (err.code === 11000) {
        skippedCount++;
      } else {
        console.error(`[internshipEndAlert] Error creating alert for intern ${intern._id}:`, err.message);
        skippedCount++;
      }
    }
  }

  return { scanned: interns.length, created: createdCount, skipped: skippedCount };
}

export default createThreeDayCompletionAlerts;
