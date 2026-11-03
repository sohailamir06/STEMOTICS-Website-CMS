import cron from 'node-cron';
import { TIME_ZONE } from '@stemotics/shared';
import { loadEnv } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createJobs } from './jobs/index.js';
import { createServices } from './services/container.js';
import { logger } from './utils/logger.js';

// The worker must run as exactly ONE process (PM2 fork mode, instances: 1).
// Running it in PM2 cluster mode would run billing once per instance and double-charge parents.
if (process.env.NODE_APP_INSTANCE !== undefined && process.env.NODE_APP_INSTANCE !== '0') {
  logger.error('worker started as a second instance; refusing to run scheduled jobs', {
    instance: process.env.NODE_APP_INSTANCE
  });
  process.exit(1);
}

const env = loadEnv();
await connectDb(env.MONGODB_URI);
const jobs = createJobs(createServices(env));

const tasks = jobs.map((job) =>
  cron.schedule(
    job.schedule,
    async () => {
      try {
        const result = await job.run();
        if (result && job.name !== 'heartbeat')
          logger.info('job finished', { job: job.name, ...result });
      } catch (err) {
        // Phase 11 §3.1: production monitoring should alert on these log lines.
        logger.error('job failed', { job: job.name, error: err.stack ?? String(err) });
      }
    },
    { name: job.name, timezone: TIME_ZONE, noOverlap: true }
  )
);

logger.info('worker started', { jobs: jobs.map((job) => job.name), timezone: TIME_ZONE });

async function shutdown(signal) {
  logger.info('worker shutting down', { signal });
  await Promise.all(tasks.map((task) => task.stop()));
  await disconnectDb();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
