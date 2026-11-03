import { forbidden } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// CSRF protection (Phase 08 §2.1), together with SameSite=Lax cookies.
// Browsers send an Origin header on cross-site POST/PUT/PATCH/DELETE; if it is present it must be
// one of ours. Requests with neither Origin nor Referer come from non-browser clients
// (e.g. the web SSR server, payment webhooks) and cannot carry a victim's cookies by accident.
export function requireTrustedOrigin(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return function checkOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin') ?? originOf(req.get('referer') ?? '');
    if (origin && !allowed.has(origin)) throw forbidden('Request origin is not allowed.');
    next();
  };
}
