import { DateTime } from 'luxon';
import { CANCELLATION_NOTICE_DAYS, TIME_ZONE } from '@stemotics/shared';

// Billing dates are "YYYY-MM-DD" calendar dates in America/Toronto (Phase 05 §3.1).

// Day of month the subscription bills on: the start date's day.
export function anchorDayOf(startDate) {
  return DateTime.fromISO(startDate, { zone: TIME_ZONE }).day;
}

// Next monthly billing date, clamped for short months: anchor 31 → Feb 28 → Mar 31.
export function nextAnchorDate(isoDate, anchorDay) {
  const nextMonth = DateTime.fromISO(isoDate, { zone: TIME_ZONE })
    .startOf('month')
    .plus({ months: 1 });
  return nextMonth.set({ day: Math.min(anchorDay, nextMonth.daysInMonth) }).toISODate();
}

// Brief §5: cancel at least 4 weeks before the next billing date, otherwise the upcoming
// month is still charged (Phase 05 §4.0).
//   Case A (notice ≥ 28 days): no further charges; classes end the day before N.
//   Case B (notice < 28 days): one more charge on N; classes end the day before the following one.
export function calculateCancellation({ nextBillingDate, billingAnchorDay }, requestDate) {
  const request = DateTime.fromISO(requestDate, { zone: TIME_ZONE });
  const next = DateTime.fromISO(nextBillingDate, { zone: TIME_ZONE });
  const noticeDays = Math.round(next.diff(request, 'days').days); // round: DST days are 23/25 h

  if (noticeDays >= CANCELLATION_NOTICE_DAYS) {
    return {
      cancellationCase: 'A',
      noticeDays,
      nextBillingDate: null,
      finalBillingDate: null,
      serviceEndDate: next.minus({ days: 1 }).toISODate()
    };
  }
  const following = nextAnchorDate(nextBillingDate, billingAnchorDay);
  return {
    cancellationCase: 'B',
    noticeDays,
    nextBillingDate,
    finalBillingDate: nextBillingDate,
    serviceEndDate: DateTime.fromISO(following, { zone: TIME_ZONE }).minus({ days: 1 }).toISODate()
  };
}
