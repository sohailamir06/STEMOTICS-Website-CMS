import { DateTime } from 'luxon';
import { TIME_ZONE } from './constants.js';

// Business dates are "YYYY-MM-DD" strings in America/Toronto. Strings compare correctly with < and >.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value) {
  return (
    typeof value === 'string' &&
    ISO_DATE.test(value) &&
    DateTime.fromISO(value, { zone: TIME_ZONE }).isValid
  );
}

export function todayInToronto(now = DateTime.now()) {
  return now.setZone(TIME_ZONE).toISODate();
}

export function addDays(isoDate, days) {
  return DateTime.fromISO(isoDate, { zone: TIME_ZONE }).plus({ days }).toISODate();
}

// ISO weekday: 1 = Monday ... 7 = Sunday. Returns null for invalid input.
export function isoWeekday(isoDate) {
  if (!isValidIsoDate(isoDate)) return null;
  return DateTime.fromISO(isoDate, { zone: TIME_ZONE }).weekday;
}

// "2027-04-12" → "Monday, April 12, 2027"
export function formatLongDate(isoDate) {
  return DateTime.fromISO(isoDate, { zone: TIME_ZONE })
    .setLocale('en-CA')
    .toFormat('cccc, LLLL d, yyyy');
}

// "2027-04" → "April 2027"
export function formatMonth(yearMonth) {
  return DateTime.fromISO(`${yearMonth}-01`, { zone: TIME_ZONE })
    .setLocale('en-CA')
    .toFormat('LLLL yyyy');
}

// "2027-04" + 1 → "2027-05"
export function addMonths(yearMonth, months) {
  return DateTime.fromISO(`${yearMonth}-01`, { zone: TIME_ZONE })
    .plus({ months })
    .toFormat('yyyy-LL');
}

// Calendar grid for a month, Monday first: an array of weeks, each 7 ISO dates or null padding.
export function monthGrid(yearMonth) {
  const first = DateTime.fromISO(`${yearMonth}-01`, { zone: TIME_ZONE });
  const cells = Array(first.weekday - 1).fill(null);
  for (let day = 0; day < first.daysInMonth; day += 1) {
    cells.push(first.plus({ days: day }).toISODate());
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

// Brief §12: a start date must fall on the weekday of the chosen time slot, and not be in the past.
// The web date picker and the server both use this function, so they cannot disagree.
export function isAllowedStartDate(isoDate, slotWeekday, today = todayInToronto()) {
  return isValidIsoDate(isoDate) && isoDate >= today && isoWeekday(isoDate) === slotWeekday;
}
