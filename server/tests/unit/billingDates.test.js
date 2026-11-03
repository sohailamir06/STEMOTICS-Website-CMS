import { describe, expect, it } from 'vitest';
import {
  anchorDayOf,
  calculateCancellation,
  nextAnchorDate
} from '../../src/services/billingDates.js';

describe('monthly billing dates (Phase 10 BILL)', () => {
  it('bills on the same day each month (BILL-01)', () => {
    expect(nextAnchorDate('2027-04-14', 14)).toBe('2027-05-14');
    expect(nextAnchorDate('2027-05-14', 14)).toBe('2027-06-14');
  });

  it('clamps anchor days 29–31 in short months and returns afterwards (BILL-02)', () => {
    const dates = ['2027-01-31'];
    for (let i = 0; i < 4; i += 1) dates.push(nextAnchorDate(dates.at(-1), 31));
    expect(dates).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  });

  it('takes the anchor day from the start date', () => {
    expect(anchorDayOf('2027-04-12')).toBe(12);
  });
});

describe('4-week cancellation rule (Phase 10 CANC)', () => {
  const sub = { nextBillingDate: '2027-05-15', billingAnchorDay: 15 };

  it('CANC-01: 29 days notice → Case A, no further charges, classes end May 14', () => {
    expect(calculateCancellation(sub, '2027-04-16')).toEqual({
      cancellationCase: 'A',
      noticeDays: 29,
      nextBillingDate: null,
      finalBillingDate: null,
      serviceEndDate: '2027-05-14'
    });
  });

  it('CANC-02: exactly 28 days → Case A (boundary)', () => {
    expect(calculateCancellation(sub, '2027-04-17').cancellationCase).toBe('A');
  });

  it('CANC-03: 27 days → Case B, May 15 still charged, classes end June 14', () => {
    expect(calculateCancellation(sub, '2027-04-18')).toEqual({
      cancellationCase: 'B',
      noticeDays: 27,
      nextBillingDate: '2027-05-15',
      finalBillingDate: '2027-05-15',
      serviceEndDate: '2027-06-14'
    });
  });

  it('CANC-07: the DST change does not shorten 28 days to 27', () => {
    const outcome = calculateCancellation(
      { nextBillingDate: '2027-04-10', billingAnchorDay: 10 },
      '2027-03-13'
    );
    expect(outcome).toMatchObject({ cancellationCase: 'A', noticeDays: 28 });
  });
});
