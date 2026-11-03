import { Router } from 'express';
import { staffCreateSchema, staffUpdateSchema } from '@stemotics/shared';
import { requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createStaff, listStaff, updateStaff } from '../../services/staffService.js';

// /api/v1/admin/staff — Super Admin only. Staff are deactivated, never deleted (audit trail).
export function staffRoutes() {
  const router = Router();
  router.use(requirePermission('staff.manage'));

  router.get('/', async (req, res) => {
    res.json({ staff: await listStaff() });
  });

  router.post('/', validate(staffCreateSchema), async (req, res) => {
    res.status(201).json({ staff: await createStaff(req.validated) });
  });

  router.patch('/:id', validate(staffUpdateSchema), async (req, res) => {
    res.json({ staff: await updateStaff(req.auth.userId, req.params.id, req.validated) });
  });

  return router;
}
