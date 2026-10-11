import { scheduleInternshipStatusCron, runInternshipStatusJob } from './internshipStatus.job.js';
import { scheduleRetentionCron, runRetentionJob } from './retention.job.js';

export const initCronJobs = () => {
  console.log('[Cron] Initializing daily background jobs at 2:00 AM...');
  const statusJob = scheduleInternshipStatusCron();
  const retentionJob = scheduleRetentionCron();
  return { statusJob, retentionJob };
};

export {
  runInternshipStatusJob,
  scheduleInternshipStatusCron,
  runRetentionJob,
  scheduleRetentionCron,
};
