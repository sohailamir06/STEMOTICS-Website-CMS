import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/models/Session.js';
import { clearDb, cookiesFrom, signInAs, startDb, stopDb, testApp } from '../helpers.js';

const app = testApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const newStaff = {
  email: 'coordinator@stemotics.test',
  firstName: 'Camp',
  lastName: 'Coordinator',
  role: 'camp_coordinator',
  password: 'temporary-pass-123'
};

describe('staff management (Super Admin only)', () => {
  it('creates a staff account that can then sign in', async () => {
    const { cookie } = await signInAs(app, 'super_admin');
    const res = await request(app).post('/api/v1/admin/staff').set('Cookie', cookie).send(newStaff);
    expect(res.status).toBe(201);
    expect(res.body.staff).toMatchObject({
      email: newStaff.email,
      role: 'camp_coordinator',
      isActive: true
    });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: newStaff.email, password: newStaff.password });
    expect(login.status).toBe(200);
  });

  it('cannot create parent accounts or weak passwords here', async () => {
    const { cookie } = await signInAs(app, 'super_admin');
    const parent = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', cookie)
      .send({ ...newStaff, role: 'parent' });
    const weak = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', cookie)
      .send({ ...newStaff, password: 'short' });
    expect(parent.status).toBe(400);
    expect(weak.status).toBe(400);
  });

  it('is forbidden for other staff roles', async () => {
    const { cookie } = await signInAs(app, 'program_manager');
    expect((await request(app).get('/api/v1/admin/staff').set('Cookie', cookie)).status).toBe(403);
  });

  it('deactivating a staff member ends their sessions', async () => {
    const admin = await signInAs(app, 'super_admin');
    const created = (
      await request(app).post('/api/v1/admin/staff').set('Cookie', admin.cookie).send(newStaff)
    ).body.staff;
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: newStaff.email, password: newStaff.password });
    const refreshToken = cookiesFrom(login).stm_refresh;

    const res = await request(app)
      .patch(`/api/v1/admin/staff/${created.id}`)
      .set('Cookie', admin.cookie)
      .send({ isActive: false });
    expect(res.body.staff.isActive).toBe(false);
    expect(await Session.countDocuments({ user: created.id, revokedAt: null })).toBe(0);
    expect(
      (await request(app).post('/api/v1/auth/refresh').set('Cookie', `stm_refresh=${refreshToken}`))
        .status
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: newStaff.email, password: newStaff.password })
      ).status
    ).toBe(401);
  });

  it('stops a Super Admin from removing their own access', async () => {
    const { user, cookie } = await signInAs(app, 'super_admin');
    const res = await request(app)
      .patch(`/api/v1/admin/staff/${user._id}`)
      .set('Cookie', cookie)
      .send({ role: 'content_editor' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_ACCESS');
  });

  it('allows demoting another Super Admin while one remains', async () => {
    const admin = await signInAs(app, 'super_admin');
    const other = await signInAs(app, 'super_admin', 'second@stemotics.test');
    const res = await request(app)
      .patch(`/api/v1/admin/staff/${other.user._id}`)
      .set('Cookie', admin.cookie)
      .send({ role: 'program_manager' });
    expect(res.status).toBe(200);
    expect(res.body.staff.role).toBe('program_manager');
  });
});
