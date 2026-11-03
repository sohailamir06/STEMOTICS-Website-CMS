import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { loginSchema } from '@stemotics/shared';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from ?? '/';
  if (status === 'authenticated') return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    // Same validation rules as the API (shared schema).
    const parsed = loginSchema.safeParse({
      email: form.get('email'),
      password: form.get('password')
    });
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface-alt px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-card border border-line bg-surface p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-ink">STEMOTICS Admin</h1>
        <p className="mt-1 text-sm text-muted">Staff sign-in</p>

        {formError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <label className="mt-6 block text-sm font-medium text-body" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {fieldErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-700">
            {fieldErrors.email[0]}
          </p>
        )}

        <label className="mt-4 block text-sm font-medium text-body" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {fieldErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-700">
            {fieldErrors.password[0]}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
