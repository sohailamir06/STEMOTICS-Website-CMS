import { ROLES } from '@stemotics/shared';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { hashToken, randomToken } from '../utils/tokens.js';
import { badRequest, conflict } from '../utils/errors.js';
import { passwordResetEmail } from '../templates/email.js';
import { hashPassword } from './authService.js';

const HOUR = 60 * 60 * 1000;

// Parent accounts and password recovery (Brief §10).
export function createAccountService({ env, email }) {
  async function issueResetLink(userId, hours) {
    const token = randomToken();
    await PasswordResetToken.create({
      user: userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + hours * HOUR)
    });
    return `${env.WEB_URL}/reset-password/${token}`;
  }

  async function register({ email: address, firstName, lastName, phone, password }) {
    // An existing email (including a guest-checkout parent) must be claimed through the emailed
    // reset link, which proves the person owns the address.
    if (await User.exists({ email: address })) {
      throw conflict(
        'ACCOUNT_EXISTS',
        'An account already exists for this email. Sign in, or use “Forgot password” to set a password.'
      );
    }
    return User.create({
      email: address,
      firstName,
      lastName,
      phone,
      role: ROLES.PARENT,
      passwordHash: await hashPassword(password)
    });
  }

  // Always succeeds from the caller's point of view, so it cannot be used to find out
  // which emails have accounts.
  async function requestPasswordReset(address) {
    const user = await User.findOne({ email: address, isActive: true }).select('+passwordHash');
    if (!user) return;
    const isNewAccount = !user.passwordHash;
    const resetUrl = await issueResetLink(user._id, isNewAccount ? 24 : 1);
    await email.send({
      to: user.email,
      ...passwordResetEmail({ firstName: user.firstName, resetUrl, isNewAccount })
    });
  }

  async function resetPassword({ token, password }) {
    const record = await PasswordResetToken.findOneAndDelete({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    });
    const user = record && (await User.findOne({ _id: record.user, isActive: true }));
    if (!user) {
      throw badRequest(
        'INVALID_TOKEN',
        'This link has expired or was already used. Please request a new one.'
      );
    }
    user.passwordHash = await hashPassword(password);
    await user.save();
    // A reset ends every session and invalidates any other outstanding links.
    await Promise.all([
      Session.updateMany(
        { user: user._id, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedReason: 'password_reset' } }
      ),
      PasswordResetToken.deleteMany({ user: user._id })
    ]);
    return user;
  }

  return { issueResetLink, register, requestPasswordReset, resetPassword };
}
