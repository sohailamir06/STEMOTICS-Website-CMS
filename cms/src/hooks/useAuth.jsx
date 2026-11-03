import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STAFF_ROLES } from '@stemotics/shared';
import { api, ApiError } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setState({ status: 'authenticated', user }))
      .catch(() => setState({ status: 'anonymous', user: null }));
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setState({ status: 'anonymous', user: null });
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    // Parents share the same login system but have no access to the CMS.
    if (!STAFF_ROLES.includes(user.role)) {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      throw new ApiError(403, {
        error: { code: 'NOT_STAFF', message: 'This account does not have staff access.' }
      });
    }
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
