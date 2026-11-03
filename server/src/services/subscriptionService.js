import { todayInToronto } from '@stemotics/shared';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { Enrollment, ENROLLMENT_STATUS } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { conflict, notFoundError } from '../utils/errors.js';
import { cancellationConfirmationEmail } from '../templates/email.js';
import { calculateCancellation } from './billingDates.js';
import { endEnrollmentAndReleaseSeat } from './seatService.js';

const ENROLLMENT_POPULATE = {
  path: 'enrollment',
  populate: [
    { path: 'course', select: 'title code slug' },
    { path: 'child', select: 'firstName lastName' },
    { path: 'timeSlot' }
  ]
};

export function serializeSubscription(subscription) {
  const { enrollment } = subscription;
  return {
    id: subscription._id.toString(),
    status: subscription.status,
    pastDue: subscription.pastDue,
    monthlyAmount: subscription.monthlyAmount,
    nextBillingDate: subscription.nextBillingDate,
    finalBillingDate: subscription.finalBillingDate,
    serviceEndDate: subscription.serviceEndDate,
    cancellationCase: subscription.cancellationCase ?? null,
    cancellationRequestedAt: subscription.cancellationRequestedAt ?? null,
    cardLabel: subscription.cardLabel ?? null,
    course: enrollment?.course
      ? {
          title: enrollment.course.title,
          code: enrollment.course.code,
          slug: enrollment.course.slug
        }
      : null,
    levelCode: enrollment?.levelCode ?? null,
    childName: enrollment?.child
      ? `${enrollment.child.firstName} ${enrollment.child.lastName}`
      : null,
    timeSlotLabel: enrollment?.timeSlot?.label ?? null,
    startDate: enrollment?.startDate ?? null,
    createdAt: subscription.createdAt
  };
}

// Monthly subscriptions and the 4-week cancellation rule (Brief §5, Phase 05 §4).
export function createSubscriptionService({ email }) {
  async function listForParent(parentId) {
    const subscriptions = await Subscription.find({ parent: parentId })
      .sort({ createdAt: -1 })
      .populate(ENROLLMENT_POPULATE);
    return subscriptions.map(serializeSubscription);
  }

  async function findParentSubscription(parentId, id) {
    const subscription = await Subscription.findOne({ _id: id, parent: parentId }).populate(
      ENROLLMENT_POPULATE
    );
    if (!subscription) throw notFoundError('Subscription not found.');
    return subscription;
  }

  // What would happen if the parent cancelled today — shown before they confirm (Phase 05 §4.1).
  async function previewCancellation(parentId, id, today = todayInToronto()) {
    const subscription = await findParentSubscription(parentId, id);
    if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      throw conflict('NOT_CANCELLABLE', 'This subscription is already cancelled.');
    }
    const outcome = calculateCancellation(subscription, today);
    return {
      ...outcome,
      requestDate: today,
      upcomingBillingDate: subscription.nextBillingDate,
      monthlyAmount: subscription.monthlyAmount
    };
  }

  async function cancel(parentId, id, today = todayInToronto()) {
    const subscription = await findParentSubscription(parentId, id);
    if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      throw conflict('NOT_CANCELLABLE', 'This subscription is already cancelled.');
    }
    const outcome = calculateCancellation(subscription, today);

    // Conditional on still being active, so two clicks cannot record two cancellations.
    const updated = await Subscription.findOneAndUpdate(
      { _id: subscription._id, status: SUBSCRIPTION_STATUS.ACTIVE },
      {
        $set: {
          status: SUBSCRIPTION_STATUS.CANCELLATION_PENDING,
          cancellationRequestedAt: new Date(),
          cancellationRequestedBy: parentId,
          cancellationCase: outcome.cancellationCase,
          cancellationNoticeDays: outcome.noticeDays,
          nextBillingDate: outcome.nextBillingDate,
          finalBillingDate: outcome.finalBillingDate,
          serviceEndDate: outcome.serviceEndDate
        }
      },
      { returnDocument: 'after' }
    ).populate(ENROLLMENT_POPULATE);
    if (!updated) throw conflict('NOT_CANCELLABLE', 'This subscription is already cancelled.');

    // Classes (and the seat) continue until the service end date (Brief §1: then the slot reopens).
    await Enrollment.updateOne(
      { _id: subscription.enrollment._id, status: ENROLLMENT_STATUS.ACTIVE },
      {
        $set: {
          status: ENROLLMENT_STATUS.CANCELLATION_PENDING,
          serviceEndDate: outcome.serviceEndDate
        }
      }
    );

    const parent = await User.findById(parentId);
    await email.send({
      to: parent.email,
      ...cancellationConfirmationEmail({
        firstName: parent.firstName,
        courseTitle: updated.enrollment.course.title,
        childName: updated.enrollment.child.firstName,
        subscription: updated
      })
    });
    return serializeSubscription(updated);
  }

  // Staff only: stop billing and end the enrolment today, freeing the seat (Phase 05 §4.1.3).
  // Refunds, if any, are issued separately in the payment processor.
  async function cancelImmediately(staffId, id, today = todayInToronto()) {
    const updated = await Subscription.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.CANCELLATION_PENDING] }
      },
      {
        $set: {
          status: SUBSCRIPTION_STATUS.ENDED,
          cancellationRequestedAt: new Date(),
          cancellationRequestedBy: staffId,
          cancellationCase: 'staff_immediate',
          nextBillingDate: null,
          finalBillingDate: null,
          serviceEndDate: today
        }
      },
      { returnDocument: 'after' }
    ).populate(ENROLLMENT_POPULATE);
    if (!updated) throw conflict('NOT_CANCELLABLE', 'This subscription has already ended.');
    await endEnrollmentAndReleaseSeat(
      updated.enrollment._id,
      [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.CANCELLATION_PENDING],
      ENROLLMENT_STATUS.ENDED,
      { serviceEndDate: today }
    );
    return serializeSubscription(updated);
  }

  async function listForAdmin({ status, pastDue } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (pastDue) filter.pastDue = true;
    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate(ENROLLMENT_POPULATE)
      .populate('parent', 'firstName lastName email phone');
    return subscriptions.map((subscription) => ({
      ...serializeSubscription(subscription),
      parent: subscription.parent
        ? {
            name: `${subscription.parent.firstName} ${subscription.parent.lastName}`,
            email: subscription.parent.email,
            phone: subscription.parent.phone
          }
        : null
    }));
  }

  return { listForParent, previewCancellation, cancel, cancelImmediately, listForAdmin };
}
