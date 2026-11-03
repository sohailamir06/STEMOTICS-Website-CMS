import mongoose from 'mongoose';

export const CHARGE_STATUS = Object.freeze({
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  ABANDONED: 'abandoned' // all retries failed; staff follow up
});

// One document per subscription per billing date.
const chargeSchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    cycleDate: { type: String, required: true }, // the billing date being charged
    amount: { type: Number, required: true }, // cents
    status: { type: String, enum: Object.values(CHARGE_STATUS), required: true, index: true },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: String, default: null },
    gatewayTransactionId: { type: String },
    lastError: { type: String }
  },
  { timestamps: true }
);

// The guarantee against double charging: a billing date can only be claimed once.
chargeSchema.index({ subscription: 1, cycleDate: 1 }, { unique: true });

export const Charge = mongoose.model('Charge', chargeSchema);
