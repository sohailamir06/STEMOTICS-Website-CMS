import { describe, expect, it } from 'vitest';
import { can } from './permissions.js';
import { slugify } from './slug.js';
import { formatSlotLabel, formatTime } from './timeSlots.js';
import { courseSchema, timeSlotSchema } from './schemas/catalog.js';

describe('time slot labels', () => {
  it('formats 24-hour times', () => {
    expect(formatTime('17:00')).toBe('5:00 PM');
    expect(formatTime('00:30')).toBe('12:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('builds readable slot labels', () => {
    expect(formatSlotLabel({ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' })).toBe(
      'Monday 5:00 – 6:00 PM'
    );
    expect(formatSlotLabel({ dayOfWeek: 6, startTime: '11:00', endTime: '12:00' })).toBe(
      'Saturday 11:00 AM – 12:00 PM'
    );
  });
});

describe('slugify', () => {
  it('handles ampersands, commas and accents', () => {
    expect(slugify('AI, ML & Cyber Security')).toBe('ai-ml-and-cyber-security');
    expect(slugify('  Ages 6-8 ')).toBe('ages-6-8');
    expect(slugify('Café Robotique')).toBe('cafe-robotique');
  });
});

describe('timeSlotSchema', () => {
  it('defaults capacity to 9 (Brief §1)', () => {
    const slot = timeSlotSchema.parse({ dayOfWeek: 1, startTime: '17:00', endTime: '18:00' });
    expect(slot.capacity).toBe(9);
  });

  it('rejects an end time before the start time', () => {
    const result = timeSlotSchema.safeParse({ dayOfWeek: 1, startTime: '18:00', endTime: '17:00' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['endTime']);
  });
});

describe('courseSchema', () => {
  const base = {
    title: 'Coding Junior',
    code: 'stc2001',
    slug: 'coding-junior',
    productType: 'regular_program'
  };

  it('normalises codes and applies defaults', () => {
    const course = courseSchema.parse(base);
    expect(course.code).toBe('STC2001');
    expect(course.levels).toEqual([]);
    expect(course.monthlyFee).toBeNull();
  });

  it('only allows time slots on regular programs', () => {
    const result = courseSchema.safeParse({
      ...base,
      productType: 'camp',
      timeSlots: ['0123456789abcdef01234567']
    });
    expect(result.success).toBe(false);
  });

  it('checks the age range and unique level codes', () => {
    expect(courseSchema.safeParse({ ...base, ageMin: 9, ageMax: 6 }).success).toBe(false);
    expect(
      courseSchema.safeParse({
        ...base,
        levels: [
          { name: 'Level 1', code: 'STC2001' },
          { name: 'Level 1 again', code: 'stc2001' }
        ]
      }).success
    ).toBe(false);
  });
});

describe('permissions', () => {
  it('lets program managers edit programs but not camp coordinators', () => {
    expect(can('program_manager', 'programs.edit')).toBe(true);
    expect(can('camp_coordinator', 'programs.edit')).toBe(false);
    expect(can('camp_coordinator', 'programs.view')).toBe(true);
    expect(can('parent', 'programs.view')).toBe(false);
  });
});
