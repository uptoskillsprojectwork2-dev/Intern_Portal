import User from '../models/User.js';
import Notification from '../models/Notification.js';

let monitorIntervalId = null;

/**
 * Calculates calendar-day difference between two dates, ignoring time-of-day.
 * Uses UTC calendar date components to ensure deterministic day-level accuracy across timezones.
 *
 * @param {Date|string|number} fromDate 
 * @param {Date|string|number} toDate 
 * @returns {number|null} Difference in calendar days (toDate - fromDate), or null if invalid.
 */
export function getCalendarDifferenceInDays(fromDate, toDate) {
  const d1 = new Date(fromDate);
  const d2 = new Date(toDate);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return null;
  }

  const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());

  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if targetDate is exactly 3 calendar days after currentDate.
 *
 * @param {Date|string|number} currentDate 
 * @param {Date|string|number} targetDate 
 * @returns {boolean}
 */
export function isExactlyThreeDaysAway(currentDate, targetDate) {
  return getCalendarDifferenceInDays(currentDate, targetDate) === 3;
}

/**
 * Formats a Date object into a readable date string like "30 Sep 2026".
 *
 * @param {Date} date 
 * @returns {string}
 */
export function formatCalendarDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats a Date into standard YYYY-MM-DD for deterministic deduplication keys.
 *
 * @param {Date} date 
 * @returns {string}
 */
export function toCalendarDateKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Scans for interns whose internship ends exactly 3 calendar days from referenceDate,
 * resolves their assigned Team Leader, and dispatches a deduplicated notification.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<object>} Summary of monitor execution.
 */
export async function checkInternshipCompletions(referenceDate = new Date()) {
  const summary = {
    timestamp: new Date().toISOString(),
    scanned: 0,
    eligible: 0,
    notified: 0,
    skippedExisting: 0,
    unassignedTL: 0,
    errors: []
  };

  try {
    // 1. Fetch potential intern candidates whose internship is ongoing/upcoming
    const interns = await User.find({
      role: 'intern',
      endDate: { $exists: true, $ne: null },
      'internshipDetails.status': { $nin: ['completed', 'cancelled'] },
      'internshipDetails.teamleaderEmail': { $exists: true, $ne: '' }
    });

    summary.scanned = interns.length;

    for (const intern of interns) {
      // 2. Validate calendar date difference
      if (!isExactlyThreeDaysAway(referenceDate, intern.endDate)) {
        continue;
      }

      summary.eligible += 1;

      // 3. Resolve assigned Team Leader
      const tlEmail = intern.internshipDetails?.teamleaderEmail?.toLowerCase()?.trim();
      if (!tlEmail) {
        summary.unassignedTL += 1;
        continue;
      }

      const teamLeader = await User.findOne({
        role: 'teamleader',
        email: tlEmail
      });

      if (!teamLeader) {
        summary.unassignedTL += 1;
        continue;
      }

      // 4. Construct deterministic deduplication key: internship-completion:<internId>:<endDate>
      const dateKey = toCalendarDateKey(intern.endDate);
      const dedupKey = `internship-completion:${intern._id}:${dateKey}`;

      // 5. Check if notification already exists for this intern and end date
      const existingNotification = await Notification.findOne({ dedupKey });
      if (existingNotification) {
        summary.skippedExisting += 1;
        continue;
      }

      // 6. Create the notification targeted strictly to the resolved Team Leader
      const formattedDate = formatCalendarDate(intern.endDate);
      try {
        await Notification.create({
          userId: teamLeader._id,
          title: 'Internship completion approaching',
          message: `${intern.fullName}'s internship ends in 3 days on ${formattedDate}.`,
          type: 'internship',
          isRead: false,
          dedupKey,
          metadata: {
            internId: intern._id,
            endDate: intern.endDate
          }
        });
        summary.notified += 1;
      } catch (err) {
        // Handle race-condition duplicate key error code 11000 gracefully
        if (err.code === 11000) {
          summary.skippedExisting += 1;
        } else {
          summary.errors.push({ internId: intern._id, error: err.message });
        }
      }
    }
  } catch (error) {
    summary.errors.push({ general: error.message });
  }

  return summary;
}

/**
 * Starts the background completion monitor.
 * Executes an immediate initial scan and schedules subsequent scans every 24 hours.
 * Completely isolated from Express request processing and error resilient.
 */
export function startCompletionMonitor() {
  if (monitorIntervalId) {
    return;
  }

  const runSafeScan = async () => {
    try {
      const result = await checkInternshipCompletions();
      console.log(`[CompletionMonitor] Scan finished: ${result.eligible} eligible, ${result.notified} notified, ${result.skippedExisting} skipped.`);
    } catch (err) {
      console.error('[CompletionMonitor] Background scan encountered error:', err.message);
    }
  };

  // 1. Initial scan on startup
  runSafeScan();

  // 2. Schedule every 24 hours (86,400,000 milliseconds)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  monitorIntervalId = setInterval(runSafeScan, TWENTY_FOUR_HOURS);
  if (monitorIntervalId.unref) {
    monitorIntervalId.unref(); // Prevent blocking Node event loop on process exit
  }

  console.log('[CompletionMonitor] Background completion monitor started (24h interval).');
}

/**
 * Stops the background completion monitor (useful for test suites or graceful shutdown).
 */
export function stopCompletionMonitor() {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
    monitorIntervalId = null;
    console.log('[CompletionMonitor] Background completion monitor stopped.');
  }
}
