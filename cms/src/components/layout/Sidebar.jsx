import { NavLink } from 'react-router';
import { LMS_URL } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { modulesFor } from '../../lib/permissions.js';

export function Sidebar() {
  const { user } = useAuth();
  const modules = modulesFor(user.role);

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand text-white">
      <div className="px-5 py-5 text-lg font-bold tracking-tight">STEMOTICS Admin</div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Admin sections">
        {modules.map((module) => (
          <NavLink
            key={module.key}
            to={module.path}
            end={module.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                isActive ? 'bg-white/15 font-semibold' : 'text-white/85 hover:bg-white/10'
              }`
            }
          >
            <span>{module.label}</span>
            {!module.ready && (
              <span className="rounded bg-white/10 px-1.5 text-[10px] uppercase tracking-wide text-white/70">
                Stage {module.stage}
              </span>
            )}
          </NavLink>
        ))}
        {modules.length === 0 && (
          <p className="px-3 text-sm text-white/80">No sections are available for your role yet.</p>
        )}
      </nav>
      <a
        href={LMS_URL}
        target="_blank"
        rel="noreferrer"
        className="m-3 rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-ink hover:bg-accent-dark"
      >
        Learning Portal (LMS)
      </a>
    </aside>
  );
}
