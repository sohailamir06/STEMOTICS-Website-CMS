import { Router } from 'express';
import { timeSlotPatchSchema, timeSlotSchema } from '@stemotics/shared';
import { requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createTimeSlot,
  deleteTimeSlot,
  listTimeSlots,
  updateTimeSlot
} from '../../services/timeSlotService.js';

// /api/v1/admin/time-slots — shared time slots and their capacity (Brief §1).
export function timeSlotRoutes() {
  const router = Router();
  const canView = requirePermission('programs.view');
  const canEdit = requirePermission('programs.edit');

  router.get('/', canView, async (req, res) => {
    res.json({ timeSlots: await listTimeSlots() });
  });

  router.post('/', canEdit, validate(timeSlotSchema), async (req, res) => {
    res.status(201).json({ timeSlot: await createTimeSlot(req.validated) });
  });

  router.patch('/:id', canEdit, validate(timeSlotPatchSchema), async (req, res) => {
    res.json({ timeSlot: await updateTimeSlot(req.params.id, req.validated) });
  });

  router.delete('/:id', canEdit, async (req, res) => {
    await deleteTimeSlot(req.params.id);
    res.status(204).end();
  });

  return router;
}
