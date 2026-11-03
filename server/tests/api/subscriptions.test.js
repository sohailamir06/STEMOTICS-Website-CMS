import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays, todayInToronto } from '@stemotics/shared';
import { TimeSlot } from '../../src/models/TimeSlot.js';
import { Enrollment } from '../../src/models/Enrollment.js';
import { Subscription } from '../../src/models/Subscription.js';
import { Charge } from '../../src/models/Charge.js';
import { seedCatalog } from '../../src/seed/seedCatalog.js';
import { endFinishedEnrollments } from '../../src/jobs/enrollments.js';
import { clearDb, nextDateOnWeekday, signInAs, startDb, stopDb, testApp } from '../helpers.js';

const app = testApp();
const { email, billing } = app.locals.services;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  email.outbox.length = 0;
  await seedCatalog();
});

const mondaySlot = () => TimeSlot.findOne({ dayOfWeek: 1, startTime: '17:00' });

// A signed-in parent with one paid Coding Junior subscription.
async function subscribedParent({
  testOutcome = 'approve',
  emailAddress = 'parent@example.com'
} = {}) {
  const { user, cookie } = await signInAs(app, 'parent', emailAddress);
  const slot = await mondaySlot();
  const started = await request(app)
    .post('/api/v1/checkout')
    .set('Cookie', cookie)
    .send({
      courseSlug: 'coding-junior',
      levelCode: 'STC2001',
      timeSlotId: slot._id.toString(),
      startDate: await nextDateOnWeekday(1),
      child: { firstName: 'Oliver', lastName: 'Thompson', age: 7 },
      acceptCancellationPolicy: true
    });
  await request(app)
    .post(`/api/v1/checkout/orders/${started.body.order.id}/complete`)
    .set('Cookie', cookie)
    .send({ checkoutToken: started.body.checkoutToken, payment: { testOutcome } });
  const subscription = await Subscription.findOne({ parent: user._id });
  return { user, cookie, subscription };
}

describe('monthly billing worker (Brief §5)', () => {
  it('charges due subscriptions once and moves to the next month (BILL-03)', async () => {
    const { subscription } = await subscribedParent();
    const due = subscription.nextBillingDate;

    expect(await billing.runDailyBilling(due)).toEqual({ charged: 1, declined: 0, skipped: 0 });
    expect(await billing.runDailyBilling(due)).toEqual({ charged: 0, declined: 0, skipped: 0 });

    const after = await Subscription.findById(subscription._id);
    expect(after.nextBillingDate > due).toBe(true);
    expect(await Charge.countDocuments({ subscription: subscription._id, cycleDate: due })).toBe(1);
    expect(email.outbox.at(-1).subject).toBe('STEMOTICS monthly payment received');
  });

  it('does not charge before the billing date', async () => {
    const { subscription } = await subscribedParent();
    expect((await billing.runDailyBilling(addDays(subscription.nextBillingDate, -1))).charged).toBe(
      0
    );
  });

  it('marks past due, retries after 3 and 7 days, then gives up (BILL-04)', async () => {
    const { subscription } = await subscribedParent({ testOutcome: 'approve_then_fail' });
    const due = subscription.nextBillingDate;

    expect((await billing.runDailyBilling(due)).declined).toBe(1);
    let charge = await Charge.findOne({ subscription: subscription._id, cycleDate: due });
    expect(charge).toMatchObject({ status: 'failed', attempts: 1, nextRetryAt: addDays(due, 3) });
    expect((await Subscription.findById(subscription._id)).pastDue).toBe(true);
    expect(email.outbox.at(-1).subject).toBe('Action needed: monthly payment declined');

    expect((await billing.retryFailedCharges(addDays(due, 2))).declined).toBe(0); // not yet
    await billing.retryFailedCharges(addDays(due, 3));
    charge = await Charge.findById(charge._id);
    expect(charge).toMatchObject({ status: 'failed', attempts: 2, nextRetryAt: addDays(due, 10) });

    await billing.retryFailedCharges(addDays(due, 10));
    charge = await Charge.findById(charge._id);
    expect(charge).toMatchObject({ status: 'abandoned', attempts: 3, nextRetryAt: null });
  });
});

describe('4-week cancellation in the parent portal (Brief §5)', () => {
  const today = todayInToronto();

  it('Case A: 4+ weeks notice → no further charges', async () => {
    const { cookie, subscription } = await subscribedParent();
    await Subscription.updateOne(
      { _id: subscription._id },
      { $set: { nextBillingDate: addDays(today, 29) } }
    );

    const preview = await request(app)
      .get(`/api/v1/portal/subscriptions/${subscription._id}/cancellation-preview`)
      .set('Cookie', cookie);
    expect(preview.body.preview).toMatchObject({
      cancellationCase: 'A',
      noticeDays: 29,
      finalBillingDate: null
    });

    const res = await request(app)
      .post(`/api/v1/portal/subscriptions/${subscription._id}/cancel`)
      .set('Cookie', cookie);
    expect(res.body.subscription).toMatchObject({
      status: 'cancellation_pending',
      nextBillingDate: null,
      serviceEndDate: addDays(today, 28)
    });
    expect((await Enrollment.findOne()).status).toBe('cancellation_pending');
    expect(email.outbox.at(-1).text).toContain('There will be no further charges.');

    expect((await billing.runDailyBilling(addDays(today, 29))).charged).toBe(0);
  });

  it('Case B: under 4 weeks → exactly one more charge, then billing stops', async () => {
    const { cookie, subscription } = await subscribedParent();
    const next = addDays(today, 10);
    await Subscription.updateOne(
      { _id: subscription._id },
      { $set: { nextBillingDate: next, billingAnchorDay: Number(next.slice(8)) } }
    );

    const res = await request(app)
      .post(`/api/v1/portal/subscriptions/${subscription._id}/cancel`)
      .set('Cookie', cookie);
    expect(res.body.subscription).toMatchObject({
      cancellationCase: 'B',
      finalBillingDate: next,
      nextBillingDate: next
    });
    expect(email.outbox.at(-1).text).toContain('one final payment');

    expect((await billing.runDailyBilling(next)).charged).toBe(1);
    const after = await Subscription.findById(subscription._id);
    expect(after.nextBillingDate).toBeNull();
    expect((await billing.runDailyBilling(addDays(next, 40))).charged).toBe(0);
  });

  it('cannot cancel twice', async () => {
    const { cookie, subscription } = await subscribedParent();
    const path = `/api/v1/portal/subscriptions/${subscription._id}/cancel`;
    await request(app).post(path).set('Cookie', cookie);
    const again = await request(app).post(path).set('Cookie', cookie);
    expect(again.status).toBe(409);
  });

  it('frees the seat after the last day of classes (CAP-05)', async () => {
    const { cookie, subscription } = await subscribedParent();
    await request(app)
      .post(`/api/v1/portal/subscriptions/${subscription._id}/cancel`)
      .set('Cookie', cookie);
    const { serviceEndDate } = await Subscription.findById(subscription._id);
    expect((await mondaySlot()).occupiedCount).toBe(1);

    expect(await endFinishedEnrollments(serviceEndDate)).toEqual({ ended: 0 }); // still attending
    expect(await endFinishedEnrollments(addDays(serviceEndDate, 1))).toEqual({ ended: 1 });
    expect((await mondaySlot()).occupiedCount).toBe(0);
    expect((await Subscription.findById(subscription._id)).status).toBe('ended');
  });

  it('keeps parents out of each other’s subscriptions', async () => {
    const { subscription } = await subscribedParent();
    const other = await signInAs(app, 'parent', 'other@example.com');
    const res = await request(app)
      .post(`/api/v1/portal/subscriptions/${subscription._id}/cancel`)
      .set('Cookie', other.cookie);
    expect(res.status).toBe(404);
    expect(
      (await request(app).get('/api/v1/portal/subscriptions').set('Cookie', other.cookie)).body
        .subscriptions
    ).toEqual([]);
  });

  it('lists the parent’s orders and subscriptions', async () => {
    const { cookie } = await subscribedParent();
    const orders = (await request(app).get('/api/v1/portal/orders').set('Cookie', cookie)).body
      .orders;
    expect(orders).toHaveLength(1);
    const subs = (await request(app).get('/api/v1/portal/subscriptions').set('Cookie', cookie)).body
      .subscriptions;
    expect(subs[0]).toMatchObject({
      status: 'active',
      childName: 'Oliver Thompson',
      timeSlotLabel: 'Monday 5:00 – 6:00 PM',
      course: { title: 'Coding Junior' }
    });
  });
});

describe('staff: payments & customers', () => {
  it('finance admins can cancel immediately, which frees the seat (CANC-08)', async () => {
    const { subscription } = await subscribedParent();
    const { cookie } = await signInAs(app, 'finance_admin');
    const res = await request(app)
      .post(`/api/v1/admin/subscriptions/${subscription._id}/cancel-immediately`)
      .set('Cookie', cookie);
    expect(res.body.subscription).toMatchObject({
      status: 'ended',
      cancellationCase: 'staff_immediate',
      nextBillingDate: null
    });
    expect((await mondaySlot()).occupiedCount).toBe(0);
  });

  it('program managers can view but not cancel', async () => {
    const { subscription } = await subscribedParent();
    const { cookie } = await signInAs(app, 'program_manager');
    expect(
      (await request(app).get('/api/v1/admin/subscriptions').set('Cookie', cookie)).body
        .subscriptions
    ).toHaveLength(1);
    expect(
      (await request(app).get('/api/v1/admin/orders').set('Cookie', cookie)).body.orders
    ).toHaveLength(1);
    const res = await request(app)
      .post(`/api/v1/admin/subscriptions/${subscription._id}/cancel-immediately`)
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('filters past-due subscriptions', async () => {
    const { subscription } = await subscribedParent({ testOutcome: 'approve_then_fail' });
    await billing.runDailyBilling(subscription.nextBillingDate);
    const { cookie } = await signInAs(app, 'finance_admin');
    const res = await request(app)
      .get('/api/v1/admin/subscriptions?pastDue=true')
      .set('Cookie', cookie);
    expect(res.body.subscriptions).toHaveLength(1);
    expect(res.body.subscriptions[0].pastDue).toBe(true);
  });
});
