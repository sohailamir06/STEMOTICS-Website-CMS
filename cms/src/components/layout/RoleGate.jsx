import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth.jsx';
import { canAccess } from '../../lib/permissions.js';

// Redirects to /login when signed out; remembers where the user was going.
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

// Hides a module from roles that cannot use it. The API enforces the same rules.
export function RoleGate({ moduleKey, children }) {
  const { user } = useAuth();
  if (!canAccess(user.role, moduleKey)) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold text-ink">No access</h1>
        <p className="mt-1 text-muted">Your role does not include this section.</p>
      </div>
    );
  }
  return children;
}
