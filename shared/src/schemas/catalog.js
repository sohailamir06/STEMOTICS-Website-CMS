import { z } from 'zod';
import { DEFAULT_SLOT_CAPACITY, PRODUCT_TYPES } from '../constants.js';
import { SLUG_PATTERN } from '../slug.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const CODE_PATTERN = /^[A-Z0-9-]{2,20}$/;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and dashes only');

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(CODE_PATTERN, 'Use 2–20 letters, numbers or dashes');

// Money is integer cents; null = price not set yet.
const centsSchema = z.number().int().min(0).max(10_000_000).nullable();

// ---- Time slots (Brief §1) -------------------------------------------------

export const timeSlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.string().regex(TIME_PATTERN, 'Use HH:MM, 24-hour (e.g. 17:00)'),
    endTime: z.string().regex(TIME_PATTERN, 'Use HH:MM, 24-hour (e.g. 18:00)'),
    capacity: z.number().int().min(0).max(100).default(DEFAULT_SLOT_CAPACITY),
    isActive: z.boolean().default(true)
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time'
  });

// Partial update; the server merges it with the stored slot and re-validates with timeSlotSchema.
export const timeSlotPatchSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  startTime: z.string().regex(TIME_PATTERN, 'Use HH:MM, 24-hour (e.g. 17:00)').optional(),
  endTime: z.string().regex(TIME_PATTERN, 'Use HH:MM, 24-hour (e.g. 18:00)').optional(),
  capacity: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional()
});

// ---- Filter groups & options (Brief §6) -------------------------------------

export const filterGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional()
});

export const filterOptionSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(60),
  sortOrder: z.number().int().min(0).max(1000).optional()
});

// ---- Courses ----------------------------------------------------------------

export const courseSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required').max(120),
    code: codeSchema,
    slug: slugSchema,
    productType: z.enum(Object.values(PRODUCT_TYPES)),
    summary: z.string().trim().max(300).default(''),
    description: z.string().trim().max(20_000).default(''),
    ageMin: z.number().int().min(2).max(18).nullable().default(null),
    ageMax: z.number().int().min(2).max(18).nullable().default(null),
    levels: z
      .array(z.object({ name: z.string().trim().min(1).max(120), code: codeSchema }))
      .max(20)
      .default([]),
    monthlyFee: centsSchema.default(null),
    oneTimeFee: centsSchema.default(null),
    timeSlots: z.array(objectIdSchema).max(100).default([]),
    filterOptions: z.array(objectIdSchema).max(100).default([]),
    isActive: z.boolean().default(true)
  })
  .superRefine((course, ctx) => {
    if (course.ageMin !== null && course.ageMax !== null && course.ageMin > course.ageMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['ageMax'],
        message: 'Must be at least the minimum age'
      });
    }
    if (course.productType !== PRODUCT_TYPES.REGULAR_PROGRAM && course.timeSlots.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeSlots'],
        message: 'Only regular programs use time slots'
      });
    }
    const levelCodes = course.levels.map((level) => level.code);
    if (new Set(levelCodes).size !== levelCodes.length) {
      ctx.addIssue({ code: 'custom', path: ['levels'], message: 'Level codes must be unique' });
    }
  });
