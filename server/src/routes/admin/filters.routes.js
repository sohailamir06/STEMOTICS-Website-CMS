import { Router } from 'express';
import { filterGroupSchema, filterOptionSchema } from '@stemotics/shared';
import { requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createFilterGroup,
  createFilterOption,
  deleteFilterGroup,
  deleteFilterOption,
  listFilterGroups,
  updateFilterGroup,
  updateFilterOption
} from '../../services/filterService.js';

// /api/v1/admin/filter-groups and /api/v1/admin/filter-options (Brief §6).
export function filterRoutes() {
  const router = Router();
  // Program staff also read filters, to tag courses on the course form.
  const canView = requirePermission('filters.view', 'programs.view');
  const canEdit = requirePermission('filters.edit');

  router.get('/filter-groups', canView, async (req, res) => {
    res.json({ groups: await listFilterGroups({ admin: true }) });
  });

  router.post('/filter-groups', canEdit, validate(filterGroupSchema), async (req, res) => {
    res.status(201).json({ group: await createFilterGroup(req.validated) });
  });

  router.patch(
    '/filter-groups/:id',
    canEdit,
    validate(filterGroupSchema.partial()),
    async (req, res) => {
      await updateFilterGroup(req.params.id, req.validated);
      res.status(204).end();
    }
  );

  router.delete('/filter-groups/:id', canEdit, async (req, res) => {
    res.json(await deleteFilterGroup(req.params.id));
  });

  router.post(
    '/filter-groups/:id/options',
    canEdit,
    validate(filterOptionSchema),
    async (req, res) => {
      res.status(201).json({ option: await createFilterOption(req.params.id, req.validated) });
    }
  );

  router.patch(
    '/filter-options/:id',
    canEdit,
    validate(filterOptionSchema.partial()),
    async (req, res) => {
      await updateFilterOption(req.params.id, req.validated);
      res.status(204).end();
    }
  );

  router.delete('/filter-options/:id', canEdit, async (req, res) => {
    res.json(await deleteFilterOption(req.params.id));
  });

  return router;
}
