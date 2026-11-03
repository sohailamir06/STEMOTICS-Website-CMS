import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

// Client-Side Field Level Encryption (Phase 08 §2.1) is added here in Stage 4,
// when the MedicalForm model is introduced; it needs the KMS settings and key vault.
export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('mongodb connected', { host: mongoose.connection.host });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
