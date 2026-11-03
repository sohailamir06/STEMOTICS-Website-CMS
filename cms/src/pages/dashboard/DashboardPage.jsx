import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { modulesFor } from '../../lib/permissions.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const modules = modulesFor(user.role).filter((module) => module.key !== 'dashboard');

  useEffect(() => {
    api('/health')
      .then(setHealth)
      .catch(() => setHealth({ status: 'unreachable' }));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome, {user.firstName}</h1>
        <p className="text-muted">
          System status:{' '}
          <span className={health?.status === 'ok' ? 'text-green-700' : 'text-red-700'}>
            {health ? health.status : 'checking…'}
          </span>
        </p>
      </div>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-3 text-lg font-semibold text-ink">
          Your sections
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <li key={module.key}>
              <Link
                to={module.path}
                className="block rounded-card border border-line bg-surface p-4 hover:border-brand"
              >
                <div className="font-semibold text-ink">{module.label}</div>
                <div className="mt-1 text-sm text-muted">
                  {module.ready ? 'Available' : `Planned for Stage ${module.stage}`}
                  {module.brief && ` · Brief ${module.brief}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
