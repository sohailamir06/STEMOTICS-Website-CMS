import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { STAFF_ROLES } from '@stemotics/shared';
import { api } from '../lib/api.client.js';
import {
  AuthCard,
  Field,
  FormError,
  inputClass,
  SubmitButton
} from '../components/forms/Field.jsx';

export function meta() {
  return [{ title: 'Sign in | STEMOTICS' }];
}

// Only same-site paths are allowed as redirect targets (no open redirects).
export function safeNext(value, fallback = '/account/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { user } = await api('/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') }
      });
      if (STAFF_ROLES.includes(user.role)) {
        await api('/auth/logout', { method: 'POST' });
        setError('This is a staff account. Please sign in at /admin/.');
        setBusy(false);
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.status === 400 ? 'Enter your email and password.' : err.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError>{error}</FormError>
        <Field id="email" label="Email">
          {(props) => (
            <input {...props} type="email" autoComplete="username" className={inputClass} />
          )}
        </Field>
        <Field id="password" label="Password">
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              className={inputClass}
            />
          )}
        </Field>
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link to="/forgot-password/" className="text-brand underline">
          Forgot password?
        </Link>
        <Link to={`/register/?next=${encodeURIComponent(next)}`} className="text-brand underline">
          Create an account
        </Link>
      </div>
    </AuthCard>
  );
}
