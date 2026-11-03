import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TimeSlot } from '../../src/models/TimeSlot.js';
import { Course } from '../../src/models/Course.js';
import { Order } from '../../src/models/Order.js';
import { Enrollment } from '../../src/models/Enrollment.js';
import { Subscription } from '../../src/models/Subscription.js';
import { Charge } from '../../src/models/Charge.js';
import { User } from '../../src/models/User.js';
import { seedCatalog } from '../../src/seed/seedCatalog.js';
import { releaseExpiredHolds } from '../../src/jobs/enrollments.js';
import { nextAnchorDate } from '../../src/services/billingDates.js';
import {
  clearDb,
  cookiesFrom,
  createUser,
  nextDateOnWeekday,
  signInAs,
  startDb,
  stopDb,
  testApp,
  TEST_PASSWORD
} from '../helpers.js';

const app = testApp();
const outbox = app.locals.services.email.outbox;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  outbox.length = 0;
  await seedCatalog();
  // Seed prices are only verified for Coding Junior; give the others a price for these tests.
  await Course.updateMany({ monthlyFee: null }, { $set: { monthlyFee: 11999 } });
});

const mondaySlot = () => TimeSlot.findOne({ dayOfWeek: 1, startTime: '17:00' });

let emailCounter = 0;
async function body(overrides = {}) {
  const slot = await mondaySlot();
  emailCounter += 1;
  return {
    courseSlug: 'coding-junior',
    levelCode: 'STC2002',
    timeSlotId: slot._id.toString(),
    startDate: await nextDateOnWeekday(1),
    child: { firstName: 'Maya', lastName: 'Patel', age: 7 },
    parent: {
      firstName: 'Rajesh',
      lastName: 'Patel',
      email: `parent${emailCounter}@example.com`,
      phone: '519-555-0189'
    },
    acceptCancellationPolicy: true,
    ...overrides
  };
}

const start = (payload, cookie) => {
  const req = request(app).post('/api/v1/checkout').send(payload);
  return cookie ? req.set('Cookie', cookie) : req;
};

const complete = (orderId, checkoutToken, testOutcome = 'approve') =>
  request(app)
    .post(`/api/v1/checkout/orders/${orderId}/complete`)
    .send({ checkoutToken, payment: { testOutcome } });

describe('guest checkout (Brief §10)', () => {
  it('holds a seat, takes payment and starts a monthly subscription', async () => {
    const payload = await body();
    const started = await start(payload);
    expect(started.status).toBe(201);
    expect(started.body.order).toMatchObject({
      status: 'pending_payment',
      total: 12999,
      items: [
        {
          title: 'Coding Junior — Level 2 – CodeMonkey [STC2002]',
          timeSlotLabel: 'Monday 5:00 – 6:00 PM',
          childName: 'Maya Patel',
          amount: 12999
        }
      ]
    });
    expect(started.body.payment).toEqual({ mode: 'test' });
    expect((await mondaySlot()).occupiedCount).toBe(1); // seat held during payment

    const paid = await complete(started.body.order.id, started.body.checkoutToken);
    expect(paid.status).toBe(200);
    expect(paid.body.order.status).toBe('paid');

    const enrollment = await Enrollment.findOne();
    expect(enrollment).toMatchObject({
      status: 'active',
      startDate: payload.startDate,
      levelCode: 'STC2002'
    });
    const subscription = await Subscription.findOne();
    expect(subscription).toMatchObject({
      status: 'active',
      monthlyAmount: 12999,
      billingAnchorDay: Number(payload.startDate.slice(8)),
      nextBillingDate: nextAnchorDate(payload.startDate, Number(payload.startDate.slice(8)))
    });
    const firstCharge = await Charge.findOne();
    expect(firstCharge).toMatchObject({
      cycleDate: payload.startDate,
      status: 'paid',
      amount: 12999
    });
    expect((await mondaySlot()).occupiedCount).toBe(1);
  });

  it('emails a confirmation with a set-password link; the guest cannot sign in yet', async () => {
    const payload = await body();
    const started = await start(payload);
    await complete(started.body.order.id, started.body.checkoutToken);

    const email = outbox.find((message) => message.subject.startsWith('Registration confirmed'));
    expect(email.to).toBe(payload.parent.email);
    expect(email.text).toContain('4 weeks');
    expect(email.text).toMatch(
      /Set a password to manage your registration: http:\/\/localhost:5173\/reset-password\/\S+/
    );

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: payload.parent.email, password: 'anything-at-all' });
    expect(login.status).toBe(401);
  });

  it('lets the parent retry after a declined card', async () => {
    const started = await start(await body());
    const declined = await complete(started.body.order.id, started.body.checkoutToken, 'decline');
    expect(declined.status).toBe(400);
    expect(declined.body.error.code).toBe('PAYMENT_DECLINED');
    expect((await Order.findOne()).status).toBe('pending_payment');

    const retried = await complete(started.body.order.id, started.body.checkoutToken);
    expect(retried.body.order.status).toBe('paid');
  });

  it('is idempotent: completing twice creates one subscription', async () => {
    const started = await start(await body());
    await complete(started.body.order.id, started.body.checkoutToken);
    const again = await complete(started.body.order.id, started.body.checkoutToken);
    expect(again.body.order.status).toBe('paid');
    expect(await Subscription.countDocuments()).toBe(1);
  });

  it('only shows an order to its owner or the checkout token holder', async () => {
    const started = await start(await body());
    const path = `/api/v1/checkout/orders/${started.body.order.id}`;
    expect(
      (await request(app).get(path).set('X-Checkout-Token', started.body.checkoutToken)).status
    ).toBe(200);
    expect((await request(app).get(path).set('X-Checkout-Token', 'x'.repeat(43))).status).toBe(404);
    expect((await request(app).get(path)).status).toBe(404);
  });
});

describe('checkout validation (Brief §1, §12)', () => {
  it('rejects a start date on the wrong weekday (DATE-03)', async () => {
    const res = await start(await body({ startDate: await nextDateOnWeekday(2) }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.startDate[0]).toBe('Choose a Monday from today onward');
  });

  it('rejects a past start date', async () => {
    const res = await start(await body({ startDate: '2020-01-06' }));
    expect(res.status).toBe(400);
  });

  it('requires a level when the course has levels, and the right age', async () => {
    expect(
      (await start(await body({ levelCode: undefined }))).body.error.details.levelCode
    ).toBeTruthy();
    const tooOld = await body();
    tooOld.child.age = 12;
    expect((await start(tooOld)).body.error.details.age).toBeTruthy();
  });

  it('requires accepting the 4-week cancellation rule', async () => {
    const res = await start(await body({ acceptCancellationPolicy: false }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.acceptCancellationPolicy).toBeTruthy();
  });

  it('refuses programs without a price', async () => {
    await Course.updateOne({ slug: 'coding-junior' }, { $set: { monthlyFee: null } });
    const res = await start(await body());
    expect(res.body.error.code).toBe('NOT_AVAILABLE');
  });
});

describe('shared slot capacity at checkout (Brief §1)', () => {
  it('fills a slot across different programs and blocks the 10th child (CAP-01–03)', async () => {
    const plan = [
      ...Array(5).fill({ courseSlug: 'coding-junior', levelCode: 'STC2001' }),
      ...Array(4).fill({ courseSlug: 'robotics-junior', levelCode: undefined })
    ];
    for (const [index, item] of plan.entries()) {
      const payload = await body({
        ...item,
        child: { firstName: `Kid${index}`, lastName: 'Test', age: 7 }
      });
      expect((await start(payload)).status).toBe(201);
    }
    const tenth = await start(
      await body({ courseSlug: 'game-design-junior', levelCode: undefined })
    );
    expect(tenth.status).toBe(409);
    expect(tenth.body.error.code).toBe('TIME_SLOT_FULL');

    const { course } = (await request(app).get('/api/v1/courses/game-design-junior')).body;
    expect(course.timeSlots[0]).toMatchObject({ label: 'Monday 5:00 – 6:00 PM', isFull: true });
  });

  it('never overbooks under concurrent checkouts (CAP-06)', async () => {
    await TimeSlot.updateOne({ dayOfWeek: 1, startTime: '17:00' }, { $set: { occupiedCount: 8 } });
    const payloads = await Promise.all(Array.from({ length: 10 }, () => body()));
    const results = await Promise.all(payloads.map((payload) => start(payload)));
    expect(results.filter((res) => res.status === 201)).toHaveLength(1);
    expect(results.filter((res) => res.status === 409)).toHaveLength(9);
    expect((await mondaySlot()).occupiedCount).toBe(9);
  });

  it('releases the seat when the hold expires, and then refuses payment (CAP-07)', async () => {
    const started = await start(await body());
    await Order.updateOne({}, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
    expect(await releaseExpiredHolds()).toEqual({ released: 1 });
    expect(await releaseExpiredHolds()).toEqual({ released: 0 }); // released exactly once
    expect((await mondaySlot()).occupiedCount).toBe(0);
    expect((await Enrollment.findOne()).status).toBe('expired');

    const late = await complete(started.body.order.id, started.body.checkoutToken);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('HOLD_EXPIRED');
  });

  it('blocks registering the same child twice in the same program and slot', async () => {
    const payload = await body();
    await start(payload);
    const again = await start({ ...payload, parent: payload.parent });
    expect(again.body.error.code).toBe('ALREADY_ENROLLED');
  });
});

describe('accounts at checkout (Brief §10)', () => {
  it('creates an account at checkout and signs the parent in', async () => {
    const payload = await body({ createAccount: true, password: 'a-good-password' });
    const res = await start(payload);
    expect(res.body.createdAccount).toBe(true);
    const { stm_access } = cookiesFrom(res);
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', `stm_access=${stm_access}`);
    expect(me.body.user).toMatchObject({
      email: payload.parent.email,
      role: 'parent',
      phone: '+15195550189'
    });
  });

  it('asks an existing account holder to sign in instead of checking out as a guest', async () => {
    await createUser({ email: 'existing@example.com', role: 'parent' });
    const payload = await body();
    payload.parent.email = 'existing@example.com';
    const res = await start(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('uses the signed-in parent’s account and ignores typed contact details', async () => {
    const { user, cookie } = await signInAs(app, 'parent', 'signed-in@example.com');
    const payload = await body();
    delete payload.parent;
    const res = await start(payload, cookie);
    expect(res.status).toBe(201);
    expect((await Order.findOne()).parent.equals(user._id)).toBe(true);
    // Signed-in parents can pay without the checkout token.
    const paid = await request(app)
      .post(`/api/v1/checkout/orders/${res.body.order.id}/complete`)
      .set('Cookie', cookie)
      .send({ checkoutToken: 'x'.repeat(43), payment: { testOutcome: 'approve' } });
    expect(paid.body.order.status).toBe('paid');
    // Account holders get a portal link, not a set-password link.
    expect(outbox.at(-1).text).toContain('View your account');
  });

  it('refuses checkout from a staff account', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    const res = await start(await body(), cookie);
    expect(res.status).toBe(403);
  });

  it('lets a guest reuse their email for a second child', async () => {
    const first = await body();
    await start(first);
    const second = await body({ child: { firstName: 'Ravi', lastName: 'Patel', age: 6 } });
    second.parent.email = first.parent.email;
    expect((await start(second)).status).toBe(201);
    expect(await User.countDocuments({ email: first.parent.email })).toBe(1);
  });
});

describe('password used in tests', () => {
  it('is long enough for the shared password rule', () => {
    expect(TEST_PASSWORD.length).toBeGreaterThanOrEqual(10);
  });
});
