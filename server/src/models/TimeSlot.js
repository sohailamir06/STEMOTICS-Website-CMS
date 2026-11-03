import mongoose from 'mongoose';
import { DEFAULT_SLOT_CAPACITY, formatSlotLabel } from '@stemotics/shared';

// Brief §1: capacity belongs to the time slot and is shared by EVERY regular program
// offered in it. Courses reference slots; they never hold their own capacity.
const timeSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // ISO: 1 = Monday
    startTime: { type: String, required: true }, // "17:00" (America/Toronto)
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, default: DEFAULT_SLOT_CAPACITY, min: 0 },
    // Seats taken by held/active/cancellation-pending enrolments across all programs.
    // Changed only by atomic $inc in seatService (Stage 2).
    occupiedCount: { type: Number, required: true, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

timeSlotSchema.index({ dayOfWeek: 1, startTime: 1 }, { unique: true });

timeSlotSchema.virtual('label').get(function () {
  return formatSlotLabel(this);
});

// Derived, never stored, so it is always right when capacity changes.
timeSlotSchema.virtual('seatsLeft').get(function () {
  return Math.max(this.capacity - this.occupiedCount, 0);
});

timeSlotSchema.virtual('isFull').get(function () {
  return this.occupiedCount >= this.capacity;
});

export const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
