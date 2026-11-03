import { Router } from 'express';
import { courseSchema } from '@stemotics/shared';
import { requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createCourse,
  getAdminCourse,
  listAdminCourses,
  updateCourse
} from '../../services/courseService.js';

// /api/v1/admin/courses. Courses are deactivated, not deleted, so past orders keep their course.
export function courseRoutes() {
  const router = Router();
  const canView = requirePermission('programs.view');
  const canEdit = requirePermission('programs.edit');

  router.get('/', canView, async (req, res) => {
    res.json({ courses: await listAdminCourses() });
  });

  router.get('/:id', canView, async (req, res) => {
    res.json({ course: await getAdminCourse(req.params.id) });
  });

  router.post('/', canEdit, validate(courseSchema), async (req, res) => {
    res.status(201).json({ course: await createCourse(req.validated) });
  });

  router.put('/:id', canEdit, validate(courseSchema), async (req, res) => {
    res.json({ course: await updateCourse(req.params.id, req.validated) });
  });

  return router;
}
