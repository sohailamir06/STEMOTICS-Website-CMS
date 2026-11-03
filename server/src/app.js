import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createRouter } from './routes/index.js';
import { createServices } from './services/container.js';
import { requireTrustedOrigin } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp(env, services = createServices(env)) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  // Tests read services (e.g. the email outbox) from here.
  app.locals.services = services;
  app.use(helmet());

  // Payment webhooks (Helcim/Stripe, after Decision D-1) are mounted HERE, with express.raw(),
  // BEFORE express.json(), because signature verification needs the exact raw body (Phase 09 §5).

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/v1', requireTrustedOrigin(env.ALLOWED_ORIGINS), createRouter({ env, services }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
