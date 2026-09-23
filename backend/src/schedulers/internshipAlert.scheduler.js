import { createThreeDayCompletionAlerts } from '../services/internshipEndAlert.service.js';

let intervalId = null;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function runAlertScan() {
  try {
    console.log('[internshipAlertScheduler] Scanning for interns ending in 3 days...');
    const result = await createThreeDayCompletionAlerts();
    console.log(`[internshipAlertScheduler] Scan complete: scanned=${result.scanned}, created=${result.created}, skipped=${result.skipped}`);
  } catch (err) {
    console.error('[internshipAlertScheduler] Error executing 3-day alert scan:', err.message);
  }
}

/**
 * Starts the daily background scheduler.
 * Executes once immediately and then schedules recurring execution every 24 hours.
 */
export function startInternshipAlertScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
  }

  // Initial immediate run on boot
  runAlertScan();

  // Subsequent runs every 24 hours
  intervalId = setInterval(runAlertScan, TWENTY_FOUR_HOURS_MS);

  // Allow Node process to exit cleanly without keeping event loop open if needed
  if (intervalId.unref) {
    intervalId.unref();
  }

  console.log('[internshipAlertScheduler] Background scheduler initialized (cadence: 24h).');
}

/**
 * Stops the background scheduler if active.
 */
export function stopInternshipAlertScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[internshipAlertScheduler] Background scheduler stopped.');
  }
}

export default {
  startInternshipAlertScheduler,
  stopInternshipAlertScheduler,
  runAlertScan
};
