import { addDays, todayInToronto } from '@stemotics/shared';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { Charge, CHARGE_STATUS } from '../models/Charge.js';
import { User } from '../models/User.js';
import { Enrollment } from '../models/Enrollment.js';
import { nextAnchorDate } from '../services/billingDates.js';
import { paymentFailedEmail, paymentReceiptEmail } from '../templates/email.js';
import { logger } from '../utils/logger.js';

// Days after the failed attempt to try again: attempt 2 after 3 days, attempt 3 after 7 more.
const RETRY_AFTER_DAYS = [3, 7];

// Monthly billing (Brief §5, Phase 09 §6). Runs only in the single worker process.
export function createBillingJobs({ env, gateway, email }) {
  async function notify(subscription, template) {
    const parent = await User.findById(subscription.parent);
    if (parent) await email.send({ to: parent.email, ...template(parent) });
  }

  async function courseTitleFor(subscription) {
    const enrollment = await Enrollment.findById(subscription.enrollment).populate(
      'course',
      'title'
    );
    return enrollment?.course?.title ?? 'your program';
  }

  async function chargeCard(subscription, charge) {
    const sub = await Subscription.findById(subscription._id).select('+gatewayCardToken');
    try {
      return await gateway.chargeSavedCard({
        customerId: sub.gatewayCustomerId,
        cardToken: sub.gatewayCardToken,
        amount: charge.amount,
        idempotencyKey: `${charge._id}:${charge.attempts}`
      });
    } catch (err) {
      return { approved: false, message: err.message };
    }
  }

  async function onApproved(subscription, charge, result) {
    await Charge.updateOne(
      { _id: charge._id },
      {
        $set: {
          status: CHARGE_STATUS.PAID,
          gatewayTransactionId: result.transactionId,
          nextRetryAt: null
        }
      }
    );
    // Case B (late cancellation): after its one final charge, billing stops.
    const isFinal = subscription.finalBillingDate === charge.cycleDate;
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          nextBillingDate: isFinal
            ? null
            : nextAnchorDate(charge.cycleDate, subscription.billingAnchorDay),
          pastDue: false
        }
      }
    );
    const courseTitle = await courseTitleFor(subscription);
    await notify(subscription, (parent) =>
      paymentReceiptEmail({
        firstName: parent.firstName,
        amount: charge.amount,
        cycleDate: charge.cycleDate,
        courseTitle
      })
    );
  }

  async function onDeclined(subscription, charge, result, today) {
    const retryIndex = charge.attempts - 1; // attempts already includes this one
    const abandoned = retryIndex >= RETRY_AFTER_DAYS.length;
    await Charge.updateOne(
      { _id: charge._id },
      {
        $set: {
          status: abandoned ? CHARGE_STATUS.ABANDONED : CHARGE_STATUS.FAILED,
          nextRetryAt: abandoned ? null : addDays(today, RETRY_AFTER_DAYS[retryIndex]),
          lastError: result.message ?? 'Declined'
        }
      }
    );
    await Subscription.updateOne({ _id: subscription._id }, { $set: { pastDue: true } });
    if (abandoned) {
      // Billing for this subscription stops here; staff see it under past-due subscriptions.
      logger.warn('monthly charge abandoned after all retries', {
        subscription: subscription._id.toString(),
        cycleDate: charge.cycleDate
      });
    }
    await notify(subscription, (parent) =>
      paymentFailedEmail({
        firstName: parent.firstName,
        amount: charge.amount,
        cycleDate: charge.cycleDate,
        portalUrl: `${env.WEB_URL}/account/`
      })
    );
  }

  async function runDailyBilling(today = todayInToronto()) {
    // Includes cancellation_pending: late (Case B) cancellations still owe one final charge.
    const due = await Subscription.find({
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.CANCELLATION_PENDING] },
      nextBillingDate: { $ne: null, $lte: today } // "YYYY-MM-DD" strings compare correctly
    });

    const summary = { charged: 0, declined: 0, skipped: 0 };
    for (const subscription of due) {
      let charge;
      try {
        // Claim the cycle. The unique index makes a second run (or second worker) skip it.
        charge = await Charge.create({
          subscription: subscription._id,
          cycleDate: subscription.nextBillingDate,
          amount: subscription.monthlyAmount,
          status: CHARGE_STATUS.PROCESSING,
          attempts: 1
        });
      } catch (err) {
        if (err.code === 11000) {
          summary.skipped += 1;
          continue;
        }
        throw err;
      }
      const result = await chargeCard(subscription, charge);
      if (result.approved) {
        await onApproved(subscription, charge, result);
        summary.charged += 1;
      } else {
        await onDeclined(subscription, charge, result, today);
        summary.declined += 1;
      }
    }
    return summary;
  }

  async function retryFailedCharges(today = todayInToronto()) {
    const failed = await Charge.find({
      status: CHARGE_STATUS.FAILED,
      nextRetryAt: { $lte: today }
    });
    const summary = { charged: 0, declined: 0 };
    for (const candidate of failed) {
      const charge = await Charge.findOneAndUpdate(
        { _id: candidate._id, status: CHARGE_STATUS.FAILED },
        { $set: { status: CHARGE_STATUS.PROCESSING }, $inc: { attempts: 1 } },
        { returnDocument: 'after' }
      );
      if (!charge) continue;
      const subscription = await Subscription.findById(charge.subscription);
      if (!subscription || subscription.status === SUBSCRIPTION_STATUS.ENDED) {
        await Charge.updateOne(
          { _id: charge._id },
          { $set: { status: CHARGE_STATUS.ABANDONED, nextRetryAt: null } }
        );
        continue;
      }
      const result = await chargeCard(subscription, charge);
      if (result.approved) {
        await onApproved(subscription, charge, result);
        summary.charged += 1;
      } else {
        await onDeclined(subscription, charge, result, today);
        summary.declined += 1;
      }
    }
    return summary;
  }

  return { runDailyBilling, retryFailedCharges };
}
