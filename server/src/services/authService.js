import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { STAFF_ROLES } from '@stemotics/shared';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashToken, randomToken } from '../utils/tokens.js';
import { tooManyRequests, unauthorized } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
// Two browser tabs can refresh at the same moment; the slower one presents the token the
// faster one just rotated. Within this window that is treated as normal, not as theft.
const REFRESH_GRACE_MS = 30_000;
const KEEP_PREVIOUS_HASHES = 5;
const JWT_ISSUER = 'stemotics-api';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Compared against when the email does not exist, so both cases take the same time
// and response timing does not reveal which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', BCRYPT_ROUNDS);

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function createAuthService(env) {
  function audienceFor(role) {
    return STAFF_ROLES.includes(role) ? 'staff' : 'parent';
  }

  // Staff: 30 min idle timeout, 12 h absolute. Parents: 30 days, no idle timeout.
  function newSessionLimits(audience, now) {
    if (audience === 'staff') {
      return {
        idleExpiresAt: new Date(now + env.STAFF_IDLE_TIMEOUT_MINUTES * MINUTE),
        expiresAt: new Date(now + env.STAFF_SESSION_MAX_HOURS * 60 * MINUTE)
      };
    }
    const expiresAt = new Date(now + env.PARENT_SESSION_DAYS * DAY);
    return { idleExpiresAt: expiresAt, expiresAt };
  }

  function signAccessToken(user, sessionId) {
    return jwt.sign({ role: user.role, sid: sessionId.toString() }, env.JWT_ACCESS_SECRET, {
      subject: user._id.toString(),
      issuer: JWT_ISSUER,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      algorithm: 'HS256'
    });
  }

  function verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: JWT_ISSUER,
        algorithms: ['HS256']
      });
      return { userId: payload.sub, role: payload.role, sessionId: payload.sid };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw unauthorized('ACCESS_TOKEN_EXPIRED', 'Your session needs to be refreshed.');
      }
      throw unauthorized();
    }
  }

  async function registerFailedLogin(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { failedLoginCount: 1 } },
      { returnDocument: 'after' }
    ).select('+failedLoginCount');
    if (user && user.failedLoginCount >= MAX_FAILED_LOGINS) {
      await User.updateOne(
        { _id: userId },
        {
          $set: { lockUntil: new Date(Date.now() + LOCKOUT_MINUTES * MINUTE), failedLoginCount: 0 }
        }
      );
      logger.warn('account locked after failed logins', { userId: userId.toString() });
    }
  }

  async function revokeSession(sessionId, reason) {
    await Session.updateOne(
      { _id: sessionId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } }
    );
  }

  async function requireActiveUser(session) {
    const user = await User.findById(session.user);
    if (!user || !user.isActive) {
      await revokeSession(session._id, 'user_inactive');
      throw unauthorized('SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
    }
    return user;
  }

  async function login({ email, password, ip, userAgent }) {
    const user = await User.findOne({ email }).select('+passwordHash +failedLoginCount +lockUntil');
    const now = Date.now();

    if (user?.lockUntil && user.lockUntil.getTime() > now) {
      throw tooManyRequests('Too many failed sign-in attempts. Please try again in 15 minutes.');
    }

    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk || !user.isActive) {
      if (user && !passwordOk) await registerFailedLogin(user._id);
      throw unauthorized('INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginCount: 0, lockUntil: null, lastLoginAt: new Date(now) } }
    );

    const audience = audienceFor(user.role);
    const refreshToken = randomToken();
    const session = await Session.create({
      user: user._id,
      audience,
      tokenHash: hashToken(refreshToken),
      ...newSessionLimits(audience, now),
      ip,
      userAgent
    });

    return {
      user,
      accessToken: signAccessToken(user, session._id),
      refreshToken,
      refreshExpiresAt: session.expiresAt
    };
  }

  async function refresh(refreshToken) {
    if (!refreshToken) throw unauthorized();
    const presentedHash = hashToken(refreshToken);
    const now = Date.now();

    const session = await Session.findOne({ tokenHash: presentedHash });

    if (!session) {
      const rotatedFrom = await Session.findOne({ previousTokenHashes: presentedHash });
      if (rotatedFrom && !rotatedFrom.revokedAt) {
        const isLatest = rotatedFrom.previousTokenHashes.at(-1) === presentedHash;
        const withinGrace =
          rotatedFrom.rotatedAt && now - rotatedFrom.rotatedAt.getTime() < REFRESH_GRACE_MS;
        if (isLatest && withinGrace) {
          const user = await requireActiveUser(rotatedFrom);
          return { user, accessToken: signAccessToken(user, rotatedFrom._id) };
        }
        // An old refresh token was replayed: assume it was stolen and end the session.
        await revokeSession(rotatedFrom._id, 'refresh_token_reuse');
        logger.warn('refresh token reuse detected; session revoked', {
          sessionId: rotatedFrom._id.toString()
        });
      }
      throw unauthorized('SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
    }

    if (
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.idleExpiresAt.getTime() <= now
    ) {
      throw unauthorized('SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
    }

    const user = await requireActiveUser(session);
    const newToken = randomToken();
    const { idleExpiresAt } = newSessionLimits(session.audience, now);

    // Conditional on the presented hash, so two concurrent refreshes cannot both rotate.
    const rotated = await Session.findOneAndUpdate(
      { _id: session._id, tokenHash: presentedHash, revokedAt: null },
      {
        $set: {
          tokenHash: hashToken(newToken),
          rotatedAt: new Date(now),
          idleExpiresAt: new Date(Math.min(idleExpiresAt.getTime(), session.expiresAt.getTime()))
        },
        $push: { previousTokenHashes: { $each: [presentedHash], $slice: -KEEP_PREVIOUS_HASHES } }
      },
      { returnDocument: 'after' }
    );

    if (!rotated) {
      // Lost the race to a concurrent refresh, which already set the new cookie.
      return { user, accessToken: signAccessToken(user, session._id) };
    }

    return {
      user,
      accessToken: signAccessToken(user, session._id),
      refreshToken: newToken,
      refreshExpiresAt: rotated.expiresAt
    };
  }

  async function logout(refreshToken) {
    if (!refreshToken) return;
    await Session.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'logout' } }
    );
  }

  return { login, refresh, logout, verifyAccessToken };
}
