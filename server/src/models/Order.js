import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Snapshot of what was bought, so past orders read correctly even if the course changes later.
const orderItemSchema = new mongoose.Schema(
  {
    enrollment: { type: ObjectId, ref: 'Enrollment', required: true },
    course: { type: ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true }, // "Coding Junior — Level 2 [STC2002]"
    timeSlotLabel: { type: String, required: true },
    startDate: { type: String, required: true },
    childName: { type: String, required: true },
    amount: { type: Number, required: true } // cents: first month
  },
  { _id: false }
);

export const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment', // seat held, waiting for the parent to pay
  PROCESSING: 'processing', // payment being confirmed with the gateway
  PAID: 'paid',
  EXPIRED: 'expired' // hold ran out before payment
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // "STM-270412-K7QP"
    parent: { type: ObjectId, ref: 'User', required: true, index: true },
    contact: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String
    },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true }, // cents
    currency: { type: String, default: 'CAD' },
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true, index: true },
    holdExpiresAt: { type: Date, required: true },
    // Lets a guest (no session) open the payment and confirmation pages. Only the hash is stored.
    checkoutTokenHash: { type: String, required: true, select: false },
    gateway: { type: String, required: true },
    gatewayTransactionId: { type: String },
    paymentAttempts: { type: Number, default: 0 },
    lastPaymentError: { type: String },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
