import { Router } from 'express';
import { requireStaff } from '../../middleware/auth.js';
import { timeSlotRoutes } from './timeSlots.routes.js';
import { courseRoutes } from './courses.routes.js';
import { filterRoutes } from './filters.routes.js';
import { staffRoutes } from './staff.routes.js';
import { paymentRoutes } from './payments.routes.js';

// Every /api/v1/admin route requires a signed-in staff user; each module router then checks
// its own permission (shared/src/permissions.js).
export function adminRoutes({ services, requireAuth }) {
  const router = Router();
  router.use(requireAuth, requireStaff);

  router.get('/ping', (req, res) => {
    res.json({ ok: true, role: req.auth.role });
  });

  router.use('/time-slots', timeSlotRoutes());
  router.use('/courses', courseRoutes());
  router.use('/', filterRoutes());
  router.use('/staff', staffRoutes());
  router.use('/', paymentRoutes({ services }));

  return router;
}
