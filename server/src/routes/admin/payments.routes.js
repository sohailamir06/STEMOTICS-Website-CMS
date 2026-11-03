import { Router } from 'express';
import { requirePermission } from '../../middleware/auth.js';
import { Order, ORDER_STATUS } from '../../models/Order.js';
import { serializeOrder } from '../../services/checkoutService.js';

// /api/v1/admin/orders and /api/v1/admin/subscriptions — Payments & Customers (Phase 03 §2).
export function paymentRoutes({ services }) {
  const router = Router();
  const { subscriptionService } = services;
  const canView = requirePermission('payments.view');
  const canManage = requirePermission('payments.manage');

  router.get('/orders', canView, async (req, res) => {
    const filter = Object.values(ORDER_STATUS).includes(req.query.status)
      ? { status: req.query.status }
      : { status: { $ne: ORDER_STATUS.EXPIRED } };
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json({ orders: orders.map(serializeOrder) });
  });

  router.get('/subscriptions', canView, async (req, res) => {
    res.json({
      subscriptions: await subscriptionService.listForAdmin({
        status: ['active', 'cancellation_pending', 'ended'].includes(req.query.status)
          ? req.query.status
          : undefined,
        pastDue: req.query.pastDue === 'true'
      })
    });
  });

  // Staff override: stop billing now and free the seat (no notice period).
  router.post('/subscriptions/:id/cancel-immediately', canManage, async (req, res) => {
    res.json({
      subscription: await subscriptionService.cancelImmediately(req.auth.userId, req.params.id)
    });
  });

  return router;
}
