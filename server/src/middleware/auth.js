import { can, STAFF_ROLES } from '@stemotics/shared';
import { ACCESS_COOKIE } from '../utils/authCookies.js';
import { forbidden, unauthorized } from '../utils/errors.js';

// Sets req.auth = { userId, role, sessionId } from the access-token cookie.
export function createRequireAuth(authService) {
  return function requireAuth(req, res, next) {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) throw unauthorized();
    req.auth = authService.verifyAccessToken(token);
    next();
  };
}

// For routes open to guests and signed-in users (e.g. checkout). An expired token still
// returns 401, so the browser refreshes the session and retries as the signed-in user.
export function createOptionalAuth(authService) {
  return function optionalAuth(req, res, next) {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) return next();
    try {
      req.auth = authService.verifyAccessToken(token);
    } catch (err) {
      if (err.code === 'ACCESS_TOKEN_EXPIRED') throw err;
    }
    next();
  };
}

export function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!roles.includes(req.auth?.role)) throw forbidden();
    next();
  };
}

// Checks the shared permission table (shared/src/permissions.js), e.g. 'programs.edit'.
// With several permissions, any one of them is enough.
export function requirePermission(...permissions) {
  return function checkPermission(req, res, next) {
    if (!permissions.some((permission) => can(req.auth?.role, permission))) throw forbidden();
    next();
  };
}

export function requireStaff(req, res, next) {
  if (!STAFF_ROLES.includes(req.auth?.role)) throw forbidden();
  next();
}
