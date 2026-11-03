import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Transactional email (Phase 06 §4.1).
//   log    → prints the email to the console (development; links can be clicked from the log)
//   memory → keeps sent emails in `outbox` (tests)
//   smtp   → real delivery via SMTP_URL (required in production)
export function createEmailService(env) {
  const outbox = [];
  const transport =
    env.EMAIL_TRANSPORT === 'smtp' ? nodemailer.createTransport(env.SMTP_URL) : null;

  async function send({ to, subject, text, html }) {
    const message = { from: env.EMAIL_FROM, to, subject, text, html };
    if (env.EMAIL_TRANSPORT === 'memory') {
      outbox.push(message);
      return;
    }
    if (env.EMAIL_TRANSPORT === 'log') {
      logger.info('email (not sent: EMAIL_TRANSPORT=log)', { to, subject, text });
      return;
    }
    await transport.sendMail(message);
  }

  // Email failures must never break checkout or billing: log and carry on.
  async function sendSafely(message) {
    try {
      await send(message);
    } catch (err) {
      logger.error('email failed', {
        to: message.to,
        subject: message.subject,
        error: err.message
      });
    }
  }

  return { send: sendSafely, outbox };
}
