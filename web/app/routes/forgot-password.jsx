import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.client.js';
import {
  AuthCard,
  Field,
  FormError,
  inputClass,
  SubmitButton
} from '../components/forms/Field.jsx';

export function meta() {
  return [{ title: 'Forgot password | STEMOTICS' }];
}

// Also how guest-checkout parents set their first password (Brief §10).
export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: new FormData(event.currentTarget).get('email') }
      });
      setSent(true);
    } catch (err) {
      setError(err.status === 400 ? 'Enter a valid email address.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Forgot your password?">
      {sent ? (
        <p role="status">
          If an account exists for that email, we have sent a link to set a new password. It expires
          in 1 hour.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="text-sm text-muted">
            Enter your email and we’ll send you a link to set a new password. Registered as a guest?
            Use this to create your password.
          </p>
          <FormError>{error}</FormError>
          <Field id="email" label="Email">
            {(props) => (
              <input {...props} type="email" autoComplete="email" className={inputClass} />
            )}
          </Field>
          <SubmitButton busy={busy}>Send link</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link to="/login/" className="text-brand underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
