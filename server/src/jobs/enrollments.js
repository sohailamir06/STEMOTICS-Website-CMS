import { todayInToronto } from '@stemotics/shared';
import { ENROLLMENT_STATUS } from '../models/Enrollment.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { endEnrollmentAndReleaseSeat } from '../services/seatService.js';

// Seats held during checkout but never paid for go back to the slot (Phase 09 §4.2).
export async function releaseExpiredHolds(now = new Date()) {
  const expiredOrders = await Order.find({
    status: ORDER_STATUS.PENDING_PAYMENT,
    holdExpiresAt: { $lte: now }
  });
  let released = 0;
  for (const candidate of expiredOrders) {
    // Conditional, so an order the parent is paying for right now (processing) is never expired.
    const order = await Order.findOneAndUpdate(
      { _id: candidate._id, status: ORDER_STATUS.PENDING_PAYMENT, holdExpiresAt: { $lte: now } },
      { $set: { status: ORDER_STATUS.EXPIRED } },
      { returnDocument: 'after' }
    );
    if (!order) continue;
    for (const item of order.items) {
      const ended = await endEnrollmentAndReleaseSeat(
        item.enrollment,
        [ENROLLMENT_STATUS.HELD],
        ENROLLMENT_STATUS.EXPIRED
      );
      if (ended) released += 1;
    }
  }
  return { released };
}

// After the last day of classes, cancelled enrolments end and their seats free up — the slot
// reopens for every program automatically (Brief §1).
export async function endFinishedEnrollments(today = todayInToronto()) {
  const finished = await Subscription.find({
    status: SUBSCRIPTION_STATUS.CANCELLATION_PENDING,
    serviceEndDate: { $lt: today }
  });
  let ended = 0;
  for (const subscription of finished) {
    const updated = await Subscription.findOneAndUpdate(
      { _id: subscription._id, status: SUBSCRIPTION_STATUS.CANCELLATION_PENDING },
      { $set: { status: SUBSCRIPTION_STATUS.ENDED, nextBillingDate: null } }
    );
    if (!updated) continue;
    await endEnrollmentAndReleaseSeat(
      subscription.enrollment,
      [ENROLLMENT_STATUS.CANCELLATION_PENDING, ENROLLMENT_STATUS.ACTIVE],
      ENROLLMENT_STATUS.ENDED
    );
    ended += 1;
  }
  return { ended };
}
