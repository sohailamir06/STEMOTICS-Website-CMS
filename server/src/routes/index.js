import { Router } from 'express';
import { createOptionalAuth, createRequireAuth } from '../middleware/auth.js';
import { authRoutes } from './auth.routes.js';
import { siteRoutes } from './public/site.routes.js';
import { catalogRoutes } from './public/catalog.routes.js';
import { checkoutRoutes } from './public/checkout.routes.js';
import { portalRoutes } from './portal/index.js';
import { adminRoutes } from './admin/index.js';

// Everything here is mounted under /api/v1.
export function createRouter({ env, services }) {
  const router = Router();
  const requireAuth = createRequireAuth(services.authService);
  const optionalAuth = createOptionalAuth(services.authService);

  router.use('/', siteRoutes());
  router.use('/', catalogRoutes());
  router.use('/auth', authRoutes({ env, services, requireAuth }));
  router.use('/checkout', checkoutRoutes({ env, services, optionalAuth }));
  router.use('/portal', portalRoutes({ services, requireAuth }));
  router.use('/admin', adminRoutes({ services, requireAuth }));

  return router;
}
