import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/models/Session.js';
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

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function login(email = 'staff@stemotics.test', password = TEST_PASSWORD) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

describe('site endpoints', () => {
  it('GET /health reports the database status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: true });
  });

  it('GET /site-settings returns contact details and the LMS link', async () => {
    const res = await request(app).get('/api/v1/site-settings');
    expect(res.status).toBe(200);
    expect(res.body.settings.lmsUrl).toBe('https://learn.stemotics.com/');
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('login', () => {
  it('signs in with a normalised email and sets httpOnly cookies', async () => {
    await createUser();
    const res = await login(' Staff@Stemotics.TEST ');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'staff@stemotics.test', role: 'super_admin' });
    expect(res.body.user.passwordHash).toBeUndefined();

    const setCookie = res.headers['set-cookie'].join('\n');
    expect(setCookie).toMatch(/stm_access=.*HttpOnly/);
    expect(setCookie).toMatch(/stm_refresh=.*Path=\/api\/v1\/auth.*HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    await createUser();
    const wrong = await login('staff@stemotics.test', 'wrong-password');
    const unknown = await login('nobody@stemotics.test', 'wrong-password');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('rejects inactive users', async () => {
    await createUser({ isActive: false });
    expect((await login()).status).toBe(401);
  });

  it('locks the account after 5 failed attempts', async () => {
    await createUser();
    for (let i = 0; i < 5; i++) await login('staff@stemotics.test', 'wrong-password');
    const res = await login(); // correct password, but locked
    expect(res.status).toBe(429);
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['email', 'password'])
    );
  });
});

describe('authenticated requests', () => {
  it('GET /auth/me returns the signed-in user', async () => {
    await createUser();
    const { stm_access } = cookiesFrom(await login());
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', `stm_access=${stm_access}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('staff@stemotics.test');
  });

  it('GET /auth/me without a cookie returns 401', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  });

  it('admin routes allow staff and forbid parents', async () => {
    await createUser();
    await createUser({ email: 'parent@stemotics.test', role: 'parent' });

    const staff = cookiesFrom(await login());
    const parent = cookiesFrom(await login('parent@stemotics.test'));

    const staffRes = await request(app)
      .get('/api/v1/admin/ping')
      .set('Cookie', `stm_access=${staff.stm_access}`);
    const parentRes = await request(app)
      .get('/api/v1/admin/ping')
      .set('Cookie', `stm_access=${parent.stm_access}`);

    expect(staffRes.status).toBe(200);
    expect(parentRes.status).toBe(403);
  });
});

describe('CSRF origin check', () => {
  it('blocks state-changing requests from an untrusted origin', async () => {
    await createUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'staff@stemotics.test', password: TEST_PASSWORD });
    expect(res.status).toBe(403);
  });

  it('allows the CMS origin', async () => {
    await createUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5174')
      .send({ email: 'staff@stemotics.test', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });
});

describe('refresh tokens', () => {
  async function refresh(token) {
    return request(app).post('/api/v1/auth/refresh').set('Cookie', `stm_refresh=${token}`);
  }

  it('rotates the refresh token', async () => {
    await createUser();
    const first = cookiesFrom(await login()).stm_refresh;
    const res = await refresh(first);
    expect(res.status).toBe(200);
    const second = cookiesFrom(res).stm_refresh;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect((await refresh(second)).status).toBe(200);
  });

  it('accepts the just-rotated token within the grace period (two tabs refreshing)', async () => {
    await createUser();
    const first = cookiesFrom(await login()).stm_refresh;
    await refresh(first);
    const again = await refresh(first);
    expect(again.status).toBe(200);
    expect(cookiesFrom(again).stm_access).toBeTruthy();
  });

  it('revokes the session when an old refresh token is replayed after the grace period', async () => {
    await createUser();
    const first = cookiesFrom(await login()).stm_refresh;
    const second = cookiesFrom(await refresh(first)).stm_refresh;

    // Simulate the grace period having passed.
    await Session.updateMany({}, { $set: { rotatedAt: new Date(Date.now() - 60_000) } });

    expect((await refresh(first)).status).toBe(401); // replay detected
    expect((await refresh(second)).status).toBe(401); // whole session revoked
    const session = await Session.findOne();
    expect(session.revokedReason).toBe('refresh_token_reuse');
  });

  it('ends staff sessions after the idle timeout', async () => {
    await createUser();
    const token = cookiesFrom(await login()).stm_refresh;
    await Session.updateMany({}, { $set: { idleExpiresAt: new Date(Date.now() - 1000) } });
    expect((await refresh(token)).status).toBe(401);
  });

  it('gives staff a 30-minute idle timeout and parents a long session', async () => {
    await createUser();
    await createUser({ email: 'parent@stemotics.test', role: 'parent' });
    await login();
    await login('parent@stemotics.test');

    const [staffSession, parentSession] = await Promise.all([
      Session.findOne({ audience: 'staff' }),
      Session.findOne({ audience: 'parent' })
    ]);
    const minutes = (date) => (date.getTime() - Date.now()) / 60_000;
    expect(minutes(staffSession.idleExpiresAt)).toBeGreaterThan(29);
    expect(minutes(staffSession.idleExpiresAt)).toBeLessThanOrEqual(30);
    expect(minutes(parentSession.expiresAt)).toBeGreaterThan(29 * 24 * 60);
  });

  it('logout revokes the session and clears cookies', async () => {
    await createUser();
    const token = cookiesFrom(await login()).stm_refresh;
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `stm_refresh=${token}`);
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'].join('\n')).toMatch(/stm_access=;/);
    expect((await refresh(token)).status).toBe(401);
  });
});
