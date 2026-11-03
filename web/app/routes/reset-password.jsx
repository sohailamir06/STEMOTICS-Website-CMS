import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { passwordSchema } from '@stemotics/shared';
import { api } from '../lib/api.client.js';
import {
  AuthCard,
  Field,
  FormError,
  inputClass,
  SubmitButton
} from '../components/forms/Field.jsx';

export function meta() {
  return [{ title: 'Set a new password | STEMOTICS' }, { name: 'robots', content: 'noindex' }];
}

// Never send the reset token to other sites in the Referer header.
export function headers() {
  return { 'Referrer-Policy': 'no-referrer' };
}

export default function ResetPassword() {
  const { token } = useParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get('password');
    const checked = passwordSchema.safeParse(password);
    if (!checked.success) return setError(checked.error.issues[0].message);
    if (password !== form.get('confirm')) return setError('The passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set a new password">
      {done ? (
        <div role="status" className="space-y-4">
          <p>Your password has been set.</p>
          <Link to="/login/" className="inline-block font-semibold text-brand underline">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormError>{error}</FormError>
          <Field id="password" label="New password" hint="At least 10 characters.">
            {(props) => (
              <input
                {...props}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
            )}
          </Field>
          <Field id="confirm" label="Confirm new password">
            {(props) => (
              <input
                {...props}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
            )}
          </Field>
          <SubmitButton busy={busy}>Save password</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
