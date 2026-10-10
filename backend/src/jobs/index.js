import { initInternshipStatusCron, runInternshipStatusJob } from "./internshipStatus.job.js";
import { initRetentionCron, runRetentionJob } from "./retention.job.js";

let schedulersInitialized = false;

/**
 * Initializes and registers all application cron jobs.
 * Guaranteed to execute registration only once per Node process.
 */
export const initJobs = () => {
  if (schedulersInitialized) {
    console.log("[Jobs] Schedulers already initialized, skipping duplicate registration");
    return;
  }

  try {
    initInternshipStatusCron();
    initRetentionCron();
    schedulersInitialized = true;
    console.log("[Jobs] All background lifecycle cron jobs successfully initialized");

    // Operational safety notice regarding multi-instance deployment
    if (process.env.NODE_APP_INSTANCE && Number(process.env.NODE_APP_INSTANCE) > 0) {
      console.warn(
        "[Jobs] Running multi-instance process cluster detected without distributed scheduler lock. Ensure single scheduler instance or Redis lock in clustered environments."
      );
    }
  } catch (err) {
    console.error("[Jobs] Failed to initialize scheduled jobs:", err);
  }
};

export {
  runInternshipStatusJob,
  runRetentionJob
};

export default initJobs;
