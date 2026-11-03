import { Router } from 'express';
import { ROLES } from '@stemotics/shared';
import { requireRole } from '../../middleware/auth.js';
import { Order, ORDER_STATUS } from '../../models/Order.js';
import { Child } from '../../models/Child.js';
import { serializeOrder } from '../../services/checkoutService.js';

// /api/v1/portal — the signed-in parent's own data only (Brief §10).
export function portalRoutes({ services, requireAuth }) {
  const router = Router();
  const { subscriptionService } = services;
  router.use(requireAuth, requireRole(ROLES.PARENT));

  router.get('/orders', async (req, res) => {
    const orders = await Order.find({
      parent: req.auth.userId,
      status: { $in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING] }
    }).sort({ createdAt: -1 });
    res.json({ orders: orders.map(serializeOrder) });
  });

  router.get('/children', async (req, res) => {
    const children = await Child.find({ parent: req.auth.userId }).sort({ firstName: 1 });
    res.json({
      children: children.map((child) => ({
        id: child._id.toString(),
        firstName: child.firstName,
        lastName: child.lastName
      }))
    });
  });

  router.get('/subscriptions', async (req, res) => {
    res.json({ subscriptions: await subscriptionService.listForParent(req.auth.userId) });
  });

  // Shows what cancelling today would mean (Case A or B) before the parent confirms.
  router.get('/subscriptions/:id/cancellation-preview', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      preview: await subscriptionService.previewCancellation(req.auth.userId, req.params.id)
    });
  });

  router.post('/subscriptions/:id/cancel', async (req, res) => {
    res.json({ subscription: await subscriptionService.cancel(req.auth.userId, req.params.id) });
  });

  return router;
}
