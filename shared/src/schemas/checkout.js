import { z } from 'zod';
import { isValidIsoDate } from '../dates.js';
import { objectIdSchema } from './catalog.js';
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from './auth.js';

// Registration for one regular program (Brief §1, §5, §10, §12).
// The server re-checks everything that depends on data: course, level, slot weekday, seats, price.
export const checkoutSchema = z
  .object({
    courseSlug: z.string().trim().min(1),
    levelCode: z.string().trim().toUpperCase().optional(),
    timeSlotId: objectIdSchema,
    startDate: z.string().refine(isValidIsoDate, 'Choose a start date'),
    child: z.object({
      firstName: nameSchema,
      lastName: nameSchema,
      age: z.number().int().min(2).max(18)
    }),
    // Ignored for signed-in parents (their account details are used).
    parent: z
      .object({
        firstName: nameSchema,
        lastName: nameSchema,
        email: emailSchema,
        phone: phoneSchema
      })
      .optional(),
    // Brief §10: check out as a guest, or create an account at the same time.
    createAccount: z.boolean().default(false),
    password: passwordSchema.optional(),
    // Brief §5 / Phase 05 §4.1: the 4-week cancellation rule must be accepted explicitly.
    acceptCancellationPolicy: z.literal(true, {
      error: 'Please confirm you understand the cancellation rule'
    })
  })
  .superRefine((value, ctx) => {
    if (value.createAccount && !value.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Choose a password' });
    }
  });

// Result of the payment form, passed to the payment gateway adapter on the server.
export const completePaymentSchema = z.object({
  checkoutToken: z.string().min(20).max(200),
  payment: z.record(z.string(), z.unknown()).default({})
});
