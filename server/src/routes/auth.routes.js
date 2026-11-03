import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from '@stemotics/shared';
import { createAuthController } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { tooManyRequests } from '../utils/errors.js';

export function authRoutes({ env, services, requireAuth }) {
  const router = Router();
  const controller = createAuthController({ env, services });

  // Per-IP limit on top of the per-account lockout. In-memory store: per API instance.
  // Switch to a shared store (MongoDB/Redis) when running more than one API instance.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.LOGIN_RATE_LIMIT_PER_15_MIN,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(tooManyRequests('Too many attempts. Please wait a few minutes and try again.'))
  });

  router.post('/login', limiter, validate(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  // Parent accounts and password recovery (Brief §10).
  router.post('/register', limiter, validate(registerSchema), controller.register);
  router.post(
    '/forgot-password',
    limiter,
    validate(forgotPasswordSchema),
    controller.forgotPassword
  );
  router.post('/reset-password', limiter, validate(resetPasswordSchema), controller.resetPassword);

  return router;
}
