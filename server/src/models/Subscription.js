import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  CANCELLATION_PENDING: 'cancellation_pending',
  ENDED: 'ended'
});

// Monthly billing for one enrolment (Brief §5, Phase 09 §4.5).
const subscriptionSchema = new mongoose.Schema(
  {
    enrollment: { type: ObjectId, ref: 'Enrollment', required: true, unique: true },
    parent: { type: ObjectId, ref: 'User', required: true, index: true },
    gateway: { type: String, required: true },
    gatewayCustomerId: { type: String, required: true },
    gatewayCardToken: { type: String, required: true, select: false }, // processor token, never card data
    cardLabel: { type: String }, // "Visa •••• 4242" for display
    monthlyAmount: { type: Number, required: true }, // cents
    billingAnchorDay: { type: Number, required: true, min: 1, max: 31 },
    nextBillingDate: { type: String, default: null, index: true }, // null = no more charges
    status: { type: String, enum: Object.values(SUBSCRIPTION_STATUS), required: true, index: true },
    // Separate from status so a failed charge never loses the cancellation state.
    pastDue: { type: Boolean, default: false },

    // 4-week rule (Brief §5)
    cancellationRequestedAt: { type: Date },
    cancellationRequestedBy: { type: ObjectId, ref: 'User' },
    cancellationCase: { type: String, enum: ['A', 'B', 'staff_immediate'] },
    cancellationNoticeDays: { type: Number },
    finalBillingDate: { type: String, default: null }, // Case B: the one remaining charge date
    serviceEndDate: { type: String, default: null }
  },
  { timestamps: true }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
