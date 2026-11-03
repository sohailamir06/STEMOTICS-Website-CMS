// Time slot display helpers. A slot is { dayOfWeek: 1-7 (ISO, 1 = Monday), startTime: "HH:mm",
// endTime: "HH:mm" } in America/Toronto.

export const WEEKDAYS = Object.freeze([
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' }
]);

export function weekdayName(dayOfWeek) {
  return WEEKDAYS[dayOfWeek - 1]?.label ?? '';
}

function parseTime(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return { hours, minutes, period: hours >= 12 ? 'PM' : 'AM', hours12: hours % 12 || 12 };
}

// "17:00" → "5:00 PM"
export function formatTime(hhmm) {
  const { hours12, minutes, period } = parseTime(hhmm);
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

// → "Monday 5:00 – 6:00 PM", or "Saturday 11:00 AM – 12:00 PM" when the period changes.
export function formatSlotLabel({ dayOfWeek, startTime, endTime }) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startText =
    start.period === end.period
      ? `${start.hours12}:${String(start.minutes).padStart(2, '0')}`
      : formatTime(startTime);
  return `${weekdayName(dayOfWeek)} ${startText} – ${formatTime(endTime)}`;
}

export function compareSlots(a, b) {
  return a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime);
}
