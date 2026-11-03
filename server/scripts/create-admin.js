// Creates the first Super Admin account.
// Usage: npm run create-admin -w server -- --email you@stemotics.com --first Jane --last Doe
// The password is read from ADMIN_PASSWORD, or asked for interactively.
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { emailSchema, passwordSchema, ROLES } from '@stemotics/shared';
import { loadEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/authService.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    first: { type: 'string' },
    last: { type: 'string' }
  }
});

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

const email = emailSchema.parse(values.email ?? (await ask('Email: ')));
const firstName = (values.first ?? (await ask('First name: '))).trim();
const lastName = (values.last ?? (await ask('Last name: '))).trim();
const password = passwordSchema.parse(
  process.env.ADMIN_PASSWORD ?? (await ask('Password (min 10 characters): '))
);

const env = loadEnv();
await connectDb(env.MONGODB_URI);

try {
  if (await User.exists({ email })) {
    console.error(`A user with email ${email} already exists.`);
    process.exitCode = 1;
  } else {
    await User.create({
      email,
      firstName,
      lastName,
      role: ROLES.SUPER_ADMIN,
      passwordHash: await hashPassword(password)
    });
    console.log(`Super Admin ${email} created.`);
  }
} finally {
  await disconnectDb();
}
