// Seeds filter groups, time slots and the regular programs from the live site.
// Safe to re-run: only inserts what is missing and never overwrites staff edits.
// Usage: npm run seed -w server
import { loadEnv } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { seedCatalog } from '../src/seed/seedCatalog.js';

const env = loadEnv();
await connectDb(env.MONGODB_URI);
try {
  const created = await seedCatalog();
  console.log('Seed complete. Created:', created);
} finally {
  await disconnectDb();
}
