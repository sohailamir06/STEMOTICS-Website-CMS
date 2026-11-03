import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  clearDb,
  cookiesFrom,
  createUser,
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
});

const tokenFromEmail = (message) => message.text.match(/reset-password\/(\S+)/)[1];

describe('parent registration (Brief §10)', () => {
  const details = {
    email: 'New.Parent@Example.com',
    firstName: 'Sarah',
    lastName: 'Thompson',
    phone: '(519) 555-0142',
    password: 'a-long-password'
  };

  it('creates a parent account and signs them in', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(details);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'new.parent@example.com',
      role: 'parent',
      phone: '+15195550142'
    });
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `stm_access=${cookiesFrom(res).stm_access}`);
    expect(me.status).toBe(200);
  });

  it('refuses an email that already has an account', async () => {
    await request(app).post('/api/v1/auth/register').send(details);
    const again = await request(app).post('/api/v1/auth/register').send(details);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ACCOUNT_EXISTS');
  });
});

describe('password reset (Brief §10)', () => {
  it('emails a single-use link that sets a new password', async () => {
    await createUser({ email: 'parent@example.com', role: 'parent' });
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'parent@example.com' });
    expect(res.status).toBe(204);
    expect(outbox[0].subject).toBe('Reset your STEMOTICS password');

    const token = tokenFromEmail(outbox[0]);
    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'brand-new-password' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@example.com', password: TEST_PASSWORD });
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@example.com', password: 'brand-new-password' });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);

    const reused = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'another-password' });
    expect(reused.status).toBe(400);
    expect(reused.body.error.code).toBe('INVALID_TOKEN');
  });

  it('answers the same for unknown emails and sends nothing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(204);
    expect(outbox).toHaveLength(0);
  });

  it('lets a guest-checkout parent claim their account by setting a password', async () => {
    await createUser({ email: 'guest@example.com', role: 'parent', passwordHash: null });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'guest@example.com' });
    expect(outbox[0].subject).toBe('Set your STEMOTICS password');
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: tokenFromEmail(outbox[0]), password: 'my-new-password' });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guest@example.com', password: 'my-new-password' });
    expect(login.status).toBe(200);
  });
});
