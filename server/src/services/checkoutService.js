import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import {
  formatSlotLabel,
  isAllowedStartDate,
  PRODUCT_TYPES,
  ROLES,
  STAFF_ROLES,
  TIME_ZONE,
  todayInToronto,
  weekdayName
} from '@stemotics/shared';
import { Course } from '../models/Course.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { User } from '../models/User.js';
import { Child } from '../models/Child.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { Enrollment, ENROLLMENT_STATUS, SEAT_OCCUPYING_STATUSES } from '../models/Enrollment.js';
import { Subscription, SUBSCRIPTION_STATUS } from '../models/Subscription.js';
import { Charge, CHARGE_STATUS } from '../models/Charge.js';
import { hashToken, randomToken } from '../utils/tokens.js';
import { badRequest, conflict, forbidden, notFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { orderConfirmationEmail } from '../templates/email.js';
import { hashPassword } from './authService.js';
import { releaseSeat, reserveSeat } from './seatService.js';
import { anchorDayOf, nextAnchorDate } from './billingDates.js';

const ORDER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function newOrderNumber() {
  const date = DateTime.now().setZone(TIME_ZONE).toFormat('yyLLdd');
  const code = Array.from(
    crypto.randomBytes(6),
    (byte) => ORDER_CODE_ALPHABET[byte % ORDER_CODE_ALPHABET.length]
  ).join('');
  return `STM-${date}-${code}`;
}

function fieldError(field, message) {
  return badRequest('VALIDATION_ERROR', message, { [field]: [message] });
}

export function serializeOrder(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    currency: order.currency,
    holdExpiresAt: order.holdExpiresAt,
    paidAt: order.paidAt ?? null,
    contact: order.contact,
    items: order.items.map((item) => ({
      title: item.title,
      timeSlotLabel: item.timeSlotLabel,
      startDate: item.startDate,
      childName: item.childName,
      amount: item.amount
    })),
    createdAt: order.createdAt
  };
}

// Checkout for one regular program (Brief §1, §5, §10, §12; Phase 05 §2).
// Works without MongoDB transactions: the seat is reserved atomically first, and released
// again if anything after that fails. Abandoned holds are released by the worker.
export function createCheckoutService({ env, gateway, email, accountService }) {
  async function resolveSelection(input) {
    const course = await Course.findOne({ slug: input.courseSlug, isActive: true });
    if (!course) throw notFoundError('This program is no longer available.');
    if (course.productType !== PRODUCT_TYPES.REGULAR_PROGRAM || course.monthlyFee === null) {
      throw badRequest(
        'NOT_AVAILABLE',
        'Online registration is not available for this program yet. Please contact us.'
      );
    }

    let level = null;
    if (course.levels.length > 0) {
      level = course.levels.find((item) => item.code === input.levelCode);
      if (!level) throw fieldError('levelCode', 'Choose a level');
    }

    const offered = course.timeSlots.some((id) => id.equals(input.timeSlotId));
    const slot = offered ? await TimeSlot.findOne({ _id: input.timeSlotId, isActive: true }) : null;
    if (!slot)
      throw fieldError('timeSlotId', 'This time slot is no longer offered. Please choose another.');

    // Brief §12, re-checked on the server with the same rule as the date picker.
    if (!isAllowedStartDate(input.startDate, slot.dayOfWeek, todayInToronto())) {
      throw fieldError('startDate', `Choose a ${weekdayName(slot.dayOfWeek)} from today onward`);
    }

    const { age } = input.child;
    if (
      (course.ageMin !== null && age < course.ageMin) ||
      (course.ageMax !== null && age > course.ageMax)
    ) {
      throw fieldError('age', `This program is for ages ${course.ageMin}–${course.ageMax}`);
    }
    return { course, level, slot };
  }

  // Signed-in parent, or the guest's details (creating an account if they asked for one).
  async function resolveParent(input, auth) {
    if (auth) {
      if (STAFF_ROLES.includes(auth.role)) {
        throw forbidden('Please sign out of your staff account to register a child.');
      }
      const user = await User.findOne({ _id: auth.userId, isActive: true });
      if (!user) throw forbidden();
      return { parent: user, createdAccount: false };
    }
    if (!input.parent) throw fieldError('parent', 'Enter your contact details');

    const existing = await User.findOne({ email: input.parent.email }).select('+passwordHash');
    if (
      existing &&
      (existing.passwordHash || existing.role !== ROLES.PARENT || !existing.isActive)
    ) {
      throw conflict(
        'ACCOUNT_EXISTS',
        'An account already exists for this email. Please sign in to continue.'
      );
    }
    if (existing && input.createAccount) {
      throw conflict(
        'ACCOUNT_EXISTS',
        'This email has registered before. Use “Forgot password” to set a password, or continue as a guest.'
      );
    }
    if (existing) {
      existing.set({
        firstName: input.parent.firstName,
        lastName: input.parent.lastName,
        phone: input.parent.phone
      });
      await existing.save();
      return { parent: existing, createdAccount: false };
    }
    const parent = await User.create({
      ...input.parent,
      role: ROLES.PARENT,
      passwordHash: input.createAccount ? await hashPassword(input.password) : null
    });
    return { parent, createdAccount: input.createAccount };
  }

  async function findOrCreateChild(parentId, { firstName, lastName }) {
    const sameName = (value) =>
      new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const existing = await Child.findOne({
      parent: parentId,
      firstName: sameName(firstName),
      lastName: sameName(lastName)
    });
    return existing ?? Child.create({ parent: parentId, firstName, lastName });
  }

  async function startCheckout(input, auth) {
    const { course, level, slot } = await resolveSelection(input);
    const { parent, createdAccount } = await resolveParent(input, auth);
    const child = await findOrCreateChild(parent._id, input.child);

    const alreadyEnrolled = await Enrollment.exists({
      child: child._id,
      course: course._id,
      timeSlot: slot._id,
      status: { $in: SEAT_OCCUPYING_STATUSES }
    });
    if (alreadyEnrolled) {
      throw conflict(
        'ALREADY_ENROLLED',
        `${child.firstName} is already registered for this program and time slot.`
      );
    }

    await reserveSeat(slot._id); // throws TIME_SLOT_FULL
    const checkoutToken = randomToken();
    const holdExpiresAt = new Date(Date.now() + env.SEAT_HOLD_MINUTES * 60_000);
    const order = new Order({
      orderNumber: newOrderNumber(),
      parent: parent._id,
      contact: {
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone
      },
      items: [],
      total: course.monthlyFee,
      status: ORDER_STATUS.PENDING_PAYMENT,
      holdExpiresAt,
      checkoutTokenHash: hashToken(checkoutToken),
      gateway: gateway.name
    });
    const enrollment = new Enrollment({
      order: order._id,
      parent: parent._id,
      child: child._id,
      course: course._id,
      levelCode: level?.code ?? null,
      timeSlot: slot._id,
      startDate: input.startDate,
      ageAtStart: input.child.age,
      status: ENROLLMENT_STATUS.HELD,
      holdExpiresAt
    });
    order.items.push({
      enrollment: enrollment._id,
      course: course._id,
      title: level
        ? `${course.title} — ${level.name} [${level.code}]`
        : `${course.title} [${course.code}]`,
      timeSlotLabel: formatSlotLabel(slot),
      startDate: input.startDate,
      childName: `${child.firstName} ${child.lastName}`,
      amount: course.monthlyFee
    });

    try {
      await order.save();
      await enrollment.save();
    } catch (err) {
      await Promise.all([
        releaseSeat(slot._id),
        Order.deleteOne({ _id: order._id }),
        Enrollment.deleteOne({ _id: enrollment._id })
      ]);
      throw err;
    }

    return {
      order: serializeOrder(order),
      checkoutToken,
      payment: await gateway.startPayment(order),
      createdAccount
    };
  }

  // Parent's own order (signed in) or a guest presenting the checkout token.
  async function loadAuthorizedOrder(orderId, { checkoutToken, auth }) {
    const order = await Order.findById(orderId).select('+checkoutTokenHash');
    const allowed =
      order &&
      ((auth && order.parent.equals(auth.userId)) ||
        (checkoutToken && hashToken(checkoutToken) === order.checkoutTokenHash));
    if (!allowed) throw notFoundError('Order not found.');
    return order;
  }

  async function getOrder(orderId, access) {
    const order = await loadAuthorizedOrder(orderId, access);
    const payment =
      order.status === ORDER_STATUS.PENDING_PAYMENT ? await gateway.startPayment(order) : null;
    return { order: serializeOrder(order), payment };
  }

  async function activate(order, result) {
    const nextBillingDates = [];
    for (const item of order.items) {
      await Enrollment.updateOne(
        { _id: item.enrollment, status: ENROLLMENT_STATUS.HELD },
        { $set: { status: ENROLLMENT_STATUS.ACTIVE }, $unset: { holdExpiresAt: 1 } }
      );
      const anchorDay = anchorDayOf(item.startDate);
      const nextBillingDate = nextAnchorDate(item.startDate, anchorDay);
      nextBillingDates.push(nextBillingDate);
      const subscription = await Subscription.create({
        enrollment: item.enrollment,
        parent: order.parent,
        gateway: gateway.name,
        gatewayCustomerId: result.customerId,
        gatewayCardToken: result.cardToken,
        cardLabel: result.cardLabel,
        monthlyAmount: item.amount,
        billingAnchorDay: anchorDay,
        nextBillingDate,
        status: SUBSCRIPTION_STATUS.ACTIVE
      });
      // The checkout payment is the first month, recorded as the start date's cycle.
      await Charge.create({
        subscription: subscription._id,
        cycleDate: item.startDate,
        amount: item.amount,
        status: CHARGE_STATUS.PAID,
        attempts: 1,
        gatewayTransactionId: result.transactionId
      });
    }
    return nextBillingDates.sort()[0];
  }

  async function completePayment(orderId, { checkoutToken, payment }, auth) {
    const order = await loadAuthorizedOrder(orderId, { checkoutToken, auth });
    if (order.status === ORDER_STATUS.PAID) return { order: serializeOrder(order) };

    // Claim the order so a double click or a second tab cannot pay twice.
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: ORDER_STATUS.PENDING_PAYMENT, holdExpiresAt: { $gt: new Date() } },
      { $set: { status: ORDER_STATUS.PROCESSING }, $inc: { paymentAttempts: 1 } },
      { returnDocument: 'after' }
    );
    if (!claimed) {
      const current = await Order.findById(order._id);
      if (current.status === ORDER_STATUS.PROCESSING) {
        throw conflict('PAYMENT_IN_PROGRESS', 'Your payment is already being processed.');
      }
      throw conflict(
        'HOLD_EXPIRED',
        'Your reserved place has expired. Please start your registration again.'
      );
    }

    let result;
    try {
      result = await gateway.completePayment(claimed, payment);
    } catch (err) {
      await Order.updateOne(
        { _id: claimed._id },
        { $set: { status: ORDER_STATUS.PENDING_PAYMENT } }
      );
      throw err;
    }
    if (!result.approved) {
      await Order.updateOne(
        { _id: claimed._id },
        { $set: { status: ORDER_STATUS.PENDING_PAYMENT, lastPaymentError: result.message } }
      );
      throw badRequest('PAYMENT_DECLINED', result.message ?? 'Your payment was declined.');
    }

    // The card has been charged: from here on, never throw without recording the payment.
    claimed.set({
      status: ORDER_STATUS.PAID,
      paidAt: new Date(),
      gatewayTransactionId: result.transactionId
    });
    await claimed.save();
    try {
      const nextBillingDate = await activate(claimed, result);
      const parent = await User.findById(claimed.parent).select('+passwordHash');
      const setPasswordUrl = parent.passwordHash
        ? null
        : await accountService.issueResetLink(parent._id, 24 * 7);
      await email.send({
        to: claimed.contact.email,
        ...orderConfirmationEmail({
          order: claimed,
          nextBillingDate,
          setPasswordUrl,
          portalUrl: `${env.WEB_URL}/account/`
        })
      });
    } catch (err) {
      logger.error('order paid but activation failed — staff must follow up', {
        orderNumber: claimed.orderNumber,
        error: err.stack ?? String(err)
      });
    }
    return { order: serializeOrder(claimed) };
  }

  return { startCheckout, getOrder, completePayment };
}
