import { z } from 'zod';

const csv = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    // Browser origins allowed to make state-changing requests (CSRF origin check).
    ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:5174')
      .transform(csv),
    // Number of reverse proxies in front of the API (Nginx = 1). Needed for correct client IPs.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    STAFF_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
    STAFF_SESSION_MAX_HOURS: z.coerce.number().int().positive().default(12),
    PARENT_SESSION_DAYS: z.coerce.number().int().positive().default(30),
    LOGIN_RATE_LIMIT_PER_15_MIN: z.coerce.number().int().positive().default(20),

    // Public website address, used for links in emails (password reset, portal).
    WEB_URL: z.url().default('http://localhost:5173'),

    // Email: "log" prints emails to the console (development), "memory" keeps them for tests,
    // "smtp" sends through SMTP_URL (SendGrid/SES/Resend all offer SMTP).
    EMAIL_TRANSPORT: z.enum(['log', 'memory', 'smtp']).default('log'),
    SMTP_URL: z.string().optional(),
    EMAIL_FROM: z.string().default('STEMOTICS <info@stemotics.com>'),

    // Decision D-1 decides helcim/stripe. "test" is a built-in fake gateway for development.
    PAYMENTS_GATEWAY: z.enum(['test', 'helcim', 'stripe']).default('test'),

    // Seats are held this long while the parent pays (Phase 09 §4.2).
    SEAT_HOLD_MINUTES: z.coerce.number().int().positive().default(15)
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'smtp' && !env.SMTP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'Required when EMAIL_TRANSPORT=smtp'
      });
    }
    if (env.NODE_ENV === 'production' && env.EMAIL_TRANSPORT !== 'smtp') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_TRANSPORT'],
        message: 'Production must use smtp'
      });
    }
    if (env.NODE_ENV === 'production' && env.PAYMENTS_GATEWAY === 'test') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENTS_GATEWAY'],
        message: 'The test gateway cannot be used in production'
      });
    }
  });

// Fails fast at startup with a readable message instead of failing later at runtime.
export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return { ...result.data, isProduction: result.data.NODE_ENV === 'production' };
}
