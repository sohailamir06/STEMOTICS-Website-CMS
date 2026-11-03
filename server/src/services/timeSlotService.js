import { z } from 'zod';
import { compareSlots, timeSlotSchema } from '@stemotics/shared';
import { TimeSlot } from '../models/TimeSlot.js';
import { Course } from '../models/Course.js';
import { badRequest, conflict, notFoundError } from '../utils/errors.js';

export function serializeTimeSlot(slot, { admin = false } = {}) {
  const publicFields = {
    id: slot._id.toString(),
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    seatsLeft: slot.seatsLeft,
    isFull: slot.isFull
  };
  if (!admin) return publicFields;
  return {
    ...publicFields,
    capacity: slot.capacity,
    occupiedCount: slot.occupiedCount,
    isActive: slot.isActive
  };
}

async function courseCountsBySlot() {
  const rows = await Course.aggregate([
    { $unwind: '$timeSlots' },
    { $group: { _id: '$timeSlots', count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function listTimeSlots() {
  const [slots, counts] = await Promise.all([TimeSlot.find(), courseCountsBySlot()]);
  return slots.sort(compareSlots).map((slot) => ({
    ...serializeTimeSlot(slot, { admin: true }),
    courseCount: counts.get(slot._id.toString()) ?? 0
  }));
}

export async function createTimeSlot(input) {
  const slot = await TimeSlot.create(input);
  return serializeTimeSlot(slot, { admin: true });
}

// Capacity changes take effect immediately: "full" is derived from capacity and occupiedCount,
// so raising the capacity reopens the slot for every program (Brief §1).
// Saving only writes the changed fields, so it never overwrites occupiedCount.
// Stage 2: block day/time changes while children are enrolled in the slot.
export async function updateTimeSlot(id, changes) {
  const slot = await TimeSlot.findById(id);
  if (!slot) throw notFoundError('Time slot not found.');

  const merged = timeSlotSchema.safeParse({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    isActive: slot.isActive,
    ...changes
  });
  if (!merged.success) {
    throw badRequest(
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      z.flattenError(merged.error).fieldErrors
    );
  }

  slot.set(merged.data);
  await slot.save();
  return serializeTimeSlot(slot, { admin: true });
}

// Stage 2: also refuse while occupiedCount > 0.
export async function deleteTimeSlot(id) {
  const usedBy = await Course.countDocuments({ timeSlots: id });
  if (usedBy > 0) {
    throw conflict(
      'TIME_SLOT_IN_USE',
      `This time slot is offered by ${usedBy} course(s). Remove it from those courses or deactivate it instead.`
    );
  }
  const result = await TimeSlot.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw notFoundError('Time slot not found.');
}
