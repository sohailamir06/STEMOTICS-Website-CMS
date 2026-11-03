import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { loadEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/authService.js';

let replSet;

// Replica set (not a standalone server) so later stages can test transactions.
export async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await replSet?.stop();
}

export async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export function testEnv(overrides = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: 'unused-in-tests',
    JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    ALLOWED_ORIGINS: 'http://localhost:5174',
    LOGIN_RATE_LIMIT_PER_15_MIN: '1000',
    EMAIL_TRANSPORT: 'memory',
    ...overrides
  });
}

export function testApp(overrides) {
  return createApp(testEnv(overrides));
}

export const TEST_PASSWORD = 'correct-horse-battery';

export async function createUser(fields = {}) {
  return User.create({
    email: 'staff@stemotics.test',
    firstName: 'Test',
    lastName: 'User',
    role: 'super_admin',
    passwordHash: await hashPassword(TEST_PASSWORD),
    ...fields
  });
}

// Creates a user with the given role, signs in, and returns the Cookie header to send.
export async function signInAs(app, role, email = `${role}@stemotics.test`) {
  const { default: request } = await import('supertest');
  const user = await createUser({ email, role });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: TEST_PASSWORD });
  return { user, cookie: `stm_access=${cookiesFrom(res).stm_access}` };
}

// The first date strictly after `from` that falls on an ISO weekday (1 = Monday).
export async function nextDateOnWeekday(weekday, from) {
  const { addDays, isoWeekday, todayInToronto } = await import('@stemotics/shared');
  let date = addDays(from ?? todayInToronto(), 1);
  while (isoWeekday(date) !== weekday) date = addDays(date, 1);
  return date;
}

// Returns { name: value } for the Set-Cookie headers of a response.
export function cookiesFrom(response) {
  const cookies = {};
  for (const header of response.headers['set-cookie'] ?? []) {
    const [pair] = header.split(';');
    const index = pair.indexOf('=');
    cookies[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return cookies;
}
