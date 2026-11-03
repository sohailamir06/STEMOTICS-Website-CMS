import { Link, Outlet, redirect, useLoaderData, useNavigate } from 'react-router';
import { ROLES } from '@stemotics/shared';
import { api } from '../../lib/api.client.js';

export function meta() {
  return [{ title: 'My account | STEMOTICS' }, { name: 'robots', content: 'noindex' }];
}

// Parent portal pages load in the browser, where the session can be refreshed silently.
export async function clientLoader({ request }) {
  const here = new URL(request.url);
  try {
    const { user } = await api('/auth/me');
    if (user.role !== ROLES.PARENT) return { user, isStaff: true };
    return { user };
  } catch {
    throw redirect(`/login/?next=${encodeURIComponent(here.pathname)}`);
  }
}

export function HydrateFallback() {
  return <p className="mx-auto max-w-5xl px-4 py-16 text-muted">Loading your account…</p>;
}

export default function AccountLayout() {
  const { user, isStaff } = useLoaderData();
  const navigate = useNavigate();

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">My account</h1>
          <p className="text-muted">
            {user.firstName} {user.lastName} · {user.email}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            to="/courses/"
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
          >
            Register for a program
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-line px-4 py-2 hover:bg-surface-alt"
          >
            Sign out
          </button>
        </div>
      </div>
      {isStaff ? (
        <p className="rounded-card border border-line p-6">
          You are signed in with a staff account. Use the{' '}
          <a href="/admin/" className="text-brand underline">
            admin
          </a>
          .
        </p>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
