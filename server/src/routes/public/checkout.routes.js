import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkoutSchema, completePaymentSchema } from '@stemotics/shared';
import { validate } from '../../middleware/validate.js';
import { setAuthCookies } from '../../utils/authCookies.js';
import { tooManyRequests } from '../../utils/errors.js';

// /api/v1/checkout — open to guests and signed-in parents (Brief §10).
export function checkoutRoutes({ env, services, optionalAuth }) {
  const router = Router();
  const { checkoutService, authService } = services;

  // Each checkout holds a seat for 15 minutes; limit how many one visitor can hold.
  const startLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Math.max(10, env.LOGIN_RATE_LIMIT_PER_15_MIN),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(tooManyRequests('Too many registrations started. Please wait a few minutes.'))
  });

  router.post('/', startLimiter, optionalAuth, validate(checkoutSchema), async (req, res) => {
    const result = await checkoutService.startCheckout(req.validated, req.auth);
    // "Create an account" at checkout also signs the parent in.
    if (result.createdAccount) {
      const login = await authService.login({
        email: req.validated.parent.email,
        password: req.validated.password,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      setAuthCookies(res, env, login);
    }
    res.status(201).json(result);
  });

  // Payment page. Guests pass the checkout token from the start response.
  router.get('/orders/:id', optionalAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(
      await checkoutService.getOrder(req.params.id, {
        checkoutToken: req.get('x-checkout-token'),
        auth: req.auth
      })
    );
  });

  router.post(
    '/orders/:id/complete',
    optionalAuth,
    validate(completePaymentSchema),
    async (req, res) => {
      res.json(await checkoutService.completePayment(req.params.id, req.validated, req.auth));
    }
  );

  return router;
}
