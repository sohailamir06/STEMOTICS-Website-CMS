import mongoose from 'mongoose';

// One document per login. The refresh token rotates on every refresh; only hashes are stored.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audience: { type: String, enum: ['staff', 'parent'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    // Recently rotated-out hashes. Seeing one again outside the grace period means the
    // token was stolen and replayed, so the whole session is revoked.
    previousTokenHashes: { type: [String], default: [], index: true },
    rotatedAt: { type: Date },
    idleExpiresAt: { type: Date, required: true }, // staff: 30 min after last refresh
    expiresAt: { type: Date, required: true }, // absolute limit regardless of activity
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String },
    userAgent: { type: String },
    ip: { type: String }
  },
  { timestamps: true }
);

// MongoDB deletes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
