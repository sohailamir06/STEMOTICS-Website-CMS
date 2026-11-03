import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonth,
  monthGrid,
  isAllowedStartDate,
  isoWeekday,
  isValidIsoDate,
  todayInToronto
} from './dates.js';
import { formatCents } from './money.js';
import { loginSchema } from './schemas/auth.js';

describe('dates', () => {
  it('validates ISO calendar dates', () => {
    expect(isValidIsoDate('2027-04-12')).toBe(true);
    expect(isValidIsoDate('2027-02-30')).toBe(false);
    expect(isValidIsoDate('12/04/2027')).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });

  it('returns ISO weekdays (1 = Monday)', () => {
    expect(isoWeekday('2027-04-12')).toBe(1);
    expect(isoWeekday('2027-03-16')).toBe(2);
  });

  it('uses the Toronto calendar day, not UTC', () => {
    // 02:00 UTC on Apr 12 is still Apr 11 in Toronto (EDT, UTC-4).
    expect(todayInToronto(DateTime.fromISO('2027-04-12T02:00:00Z'))).toBe('2027-04-11');
  });

  it('adds days across the DST change', () => {
    expect(addDays('2027-03-13', 28)).toBe('2027-04-10');
  });

  it('builds a Monday-first month grid', () => {
    const grid = monthGrid('2027-04'); // April 1, 2027 is a Thursday
    expect(grid[0]).toEqual([
      null,
      null,
      null,
      '2027-04-01',
      '2027-04-02',
      '2027-04-03',
      '2027-04-04'
    ]);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('formats and steps months and dates', () => {
    expect(formatLongDate('2027-04-12')).toBe('Monday, April 12, 2027');
    expect(formatMonth('2027-04')).toBe('April 2027');
    expect(addMonths('2027-12', 1)).toBe('2028-01');
  });

  it('allows only future dates on the slot weekday (DATE-01..03)', () => {
    const today = '2027-04-07'; // Wednesday
    expect(isAllowedStartDate('2027-04-12', 1, today)).toBe(true); // Monday slot, Monday date
    expect(isAllowedStartDate('2027-04-13', 1, today)).toBe(false); // Tuesday
    expect(isAllowedStartDate('2027-04-05', 1, today)).toBe(false); // past Monday
    expect(isAllowedStartDate('2027-04-07', 3, today)).toBe(true); // today is allowed
  });
});

describe('money', () => {
  it('formats cents as CAD', () => {
    expect(formatCents(12999)).toBe('$129.99');
  });
});

describe('loginSchema', () => {
  it('normalises email', () => {
    expect(loginSchema.parse({ email: ' Staff@Stemotics.com ', password: 'x' }).email).toBe(
      'staff@stemotics.com'
    );
  });
});
