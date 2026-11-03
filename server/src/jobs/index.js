import { logger } from '../utils/logger.js';
import { reconcileSeatCounts } from '../services/seatService.js';
import { endFinishedEnrollments, releaseExpiredHolds } from './enrollments.js';

// Scheduled jobs, run only by worker.js. Schedules are cron expressions in America/Toronto.
// Stage 4 adds medical form reminders.
export function createJobs(services) {
  return [
    { name: 'release-expired-holds', schedule: '*/5 * * * *', run: () => releaseExpiredHolds() },
    { name: 'daily-billing', schedule: '0 3 * * *', run: () => services.billing.runDailyBilling() },
    {
      name: 'end-finished-enrollments',
      schedule: '30 3 * * *',
      run: () => endFinishedEnrollments()
    },
    {
      name: 'retry-failed-charges',
      schedule: '0 4 * * *',
      run: () => services.billing.retryFailedCharges()
    },
    { name: 'reconcile-seat-counts', schedule: '0 2 * * *', run: () => reconcileSeatCounts() },
    {
      name: 'heartbeat',
      schedule: '*/15 * * * *',
      run: async () => logger.info('worker heartbeat')
    }
  ];
}
