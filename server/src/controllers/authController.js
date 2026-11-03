import { User } from '../models/User.js';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../utils/authCookies.js';
import { unauthorized } from '../utils/errors.js';

export function createAuthController({ env, services }) {
  const { authService, accountService } = services;

  async function signIn(req, res, email, password) {
    const result = await authService.login({
      email,
      password,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    setAuthCookies(res, env, result);
    return result.user;
  }

  return {
    async login(req, res) {
      const user = await signIn(req, res, req.validated.email, req.validated.password);
      res.json({ user: user.toPublicJSON() });
    },

    async refresh(req, res) {
      try {
        const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
        setAuthCookies(res, env, result);
        res.json({ user: result.user.toPublicJSON() });
      } catch (err) {
        clearAuthCookies(res, env);
        throw err;
      }
    },

    async logout(req, res) {
      await authService.logout(req.cookies?.[REFRESH_COOKIE]);
      clearAuthCookies(res, env);
      res.status(204).end();
    },

    async me(req, res) {
      const user = await User.findById(req.auth.userId);
      if (!user || !user.isActive) throw unauthorized();
      res.json({ user: user.toPublicJSON() });
    },

    // Creates a parent account and signs them in.
    async register(req, res) {
      await accountService.register(req.validated);
      const user = await signIn(req, res, req.validated.email, req.validated.password);
      res.status(201).json({ user: user.toPublicJSON() });
    },

    // Always 204, whether or not the email has an account.
    async forgotPassword(req, res) {
      await accountService.requestPasswordReset(req.validated.email);
      res.status(204).end();
    },

    async resetPassword(req, res) {
      const user = await accountService.resetPassword(req.validated);
      clearAuthCookies(res, env);
      res.json({ email: user.email });
    }
  };
}
