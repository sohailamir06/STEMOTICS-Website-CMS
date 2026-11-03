import { Router } from 'express';
import { listFilterGroups } from '../../services/filterService.js';
import { getPublicCourse, listPublicCourses } from '../../services/courseService.js';

export function catalogRoutes() {
  const router = Router();

  // Filter sidebar on /courses (Brief §6).
  router.get('/filters', async (req, res) => {
    res.json({ groups: await listFilterGroups() });
  });

  // ?<group-slug>=<option-slug>[,<option-slug>] — OR within a group, AND across groups.
  router.get('/courses', async (req, res) => {
    res.json(await listPublicCourses(req.query));
  });

  // Seat availability changes constantly, so this response is never cached.
  router.get('/courses/:slug', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ course: await getPublicCourse(req.params.slug) });
  });

  return router;
}
