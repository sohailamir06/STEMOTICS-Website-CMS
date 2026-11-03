import { Router } from 'express';
import { siteDefaults } from '../../config/siteDefaults.js';
import { isDbConnected } from '../../config/db.js';

export function siteRoutes() {
  const router = Router();

  // Used by uptime monitoring and the deploy checklist.
  router.get('/health', (req, res) => {
    const db = isDbConnected();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
  });

  // Header/footer contact details for web/ (Stage 5: staff-editable SiteSettings).
  router.get('/site-settings', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ settings: siteDefaults });
  });

  return router;
}
