import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Statuses that occupy a seat in the time slot (Brief §1). Keep in sync with seatService.
export const ENROLLMENT_STATUS = Object.freeze({
  HELD: 'held', // reserved during checkout, waiting for payment
  ACTIVE: 'active',
  CANCELLATION_PENDING: 'cancellation_pending', // cancelled, classes continue to serviceEndDate
  ENDED: 'ended',
  EXPIRED: 'expired' // hold ran out, seat released
});

export const SEAT_OCCUPYING_STATUSES = [
  ENROLLMENT_STATUS.HELD,
  ENROLLMENT_STATUS.ACTIVE,
  ENROLLMENT_STATUS.CANCELLATION_PENDING
];

const enrollmentSchema = new mongoose.Schema(
  {
    order: { type: ObjectId, ref: 'Order', required: true, index: true },
    parent: { type: ObjectId, ref: 'User', required: true, index: true },
    child: { type: ObjectId, ref: 'Child', required: true, index: true },
    course: { type: ObjectId, ref: 'Course', required: true },
    levelCode: { type: String, default: null },
    timeSlot: { type: ObjectId, ref: 'TimeSlot', required: true, index: true },
    startDate: { type: String, required: true }, // "YYYY-MM-DD", on the slot's weekday (Brief §12)
    ageAtStart: { type: Number, required: true },
    status: { type: String, enum: Object.values(ENROLLMENT_STATUS), required: true, index: true },
    holdExpiresAt: { type: Date },
    serviceEndDate: { type: String, default: null } // last day of classes after cancellation
  },
  { timestamps: true }
);

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
