import { TimeSlot } from '../models/TimeSlot.js';
import { Enrollment, SEAT_OCCUPYING_STATUSES } from '../models/Enrollment.js';
import { conflict } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Brief §1: seats belong to the time slot and are shared by every regular program in it.

// Takes a seat only if one is free. The filter and $inc are applied as one operation, so two
// parents racing for the last seat cannot both succeed (Phase 10 CAP-06).
export async function reserveSeat(timeSlotId) {
  const slot = await TimeSlot.findOneAndUpdate(
    { _id: timeSlotId, isActive: true, $expr: { $lt: ['$occupiedCount', '$capacity'] } },
    { $inc: { occupiedCount: 1 } },
    { returnDocument: 'after' }
  );
  if (!slot) throw conflict('TIME_SLOT_FULL', 'Sorry, this time slot has just filled up.');
  return slot;
}

export async function releaseSeat(timeSlotId) {
  await TimeSlot.updateOne(
    { _id: timeSlotId, occupiedCount: { $gt: 0 } },
    { $inc: { occupiedCount: -1 } }
  );
}

// Moves an enrolment out of a seat-occupying status and releases its seat — exactly once,
// because the status filter only matches the first time.
export async function endEnrollmentAndReleaseSeat(
  enrollmentId,
  fromStatuses,
  toStatus,
  extra = {}
) {
  const enrollment = await Enrollment.findOneAndUpdate(
    { _id: enrollmentId, status: { $in: fromStatuses } },
    { $set: { status: toStatus, ...extra } },
    { returnDocument: 'after' }
  );
  if (enrollment) await releaseSeat(enrollment.timeSlot);
  return enrollment;
}

// Nightly safety net: recount seats from enrolments and fix any drift.
export async function reconcileSeatCounts() {
  const counts = await Enrollment.aggregate([
    { $match: { status: { $in: SEAT_OCCUPYING_STATUSES } } },
    { $group: { _id: '$timeSlot', count: { $sum: 1 } } }
  ]);
  const actual = new Map(counts.map((row) => [row._id.toString(), row.count]));
  let fixed = 0;
  for (const slot of await TimeSlot.find()) {
    const expected = actual.get(slot._id.toString()) ?? 0;
    if (slot.occupiedCount !== expected) {
      logger.warn('seat count corrected', {
        timeSlot: slot._id.toString(),
        stored: slot.occupiedCount,
        actual: expected
      });
      await TimeSlot.updateOne({ _id: slot._id }, { $set: { occupiedCount: expected } });
      fixed += 1;
    }
  }
  return { fixed };
}
