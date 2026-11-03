import { ACCESS_TOKEN_TTL_SECONDS } from '../services/authService.js';

export const ACCESS_COOKIE = 'stm_access';
export const REFRESH_COOKIE = 'stm_refresh';

// Access cookie uses path "/" so the web SSR server also receives it for /account pages.
// The refresh cookie is only ever sent to the auth endpoints.
const REFRESH_PATH = '/api/v1/auth';

function baseOptions(env) {
  return { httpOnly: true, secure: env.isProduction, sameSite: 'lax' };
}

export function setAuthCookies(res, env, { accessToken, refreshToken, refreshExpiresAt }) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions(env),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000
  });
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...baseOptions(env),
      path: REFRESH_PATH,
      expires: refreshExpiresAt
    });
  }
}

export function clearAuthCookies(res, env) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(env), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(env), path: REFRESH_PATH });
}
