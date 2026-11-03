import { ROLE_LABELS } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-end gap-4 border-b border-line bg-surface px-6 py-3">
      <div className="text-right text-sm">
        <div className="font-medium text-ink">
          {user.firstName} {user.lastName}
        </div>
        <div className="text-muted">{ROLE_LABELS[user.role]}</div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-body hover:bg-surface-alt"
      >
        Sign out
      </button>
    </header>
  );
}
