import { z } from 'zod';
import { STAFF_ROLES } from '../constants.js';

// Trim and lowercase before validating, so " Name@Example.com " is accepted and stored consistently.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200)
});

// Used when creating accounts (staff now; parents in Stage 2).
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'Use at most 200 characters');

export const nameSchema = z.string().trim().min(1, 'Required').max(60);

// Canadian/US numbers: "519-957-1073", "(519) 957 1073", "+1 519 957 1073" → "+15199571073" (E.164).
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((digits) => digits.length === 10 || (digits.length === 11 && digits.startsWith('1')), {
    message: 'Enter a 10-digit phone number'
  })
  .transform((digits) => `+1${digits.slice(-10)}`);

// Parent self-registration (Brief §10).
export const registerSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  password: passwordSchema
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema
});

// Staff accounts are created by a Super Admin with a temporary password.
export const staffCreateSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(STAFF_ROLES),
  password: passwordSchema
});

export const staffUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional()
});
