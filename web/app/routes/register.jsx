import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { registerSchema } from '@stemotics/shared';
import { api } from '../lib/api.client.js';
import {
  AuthCard,
  Field,
  FormError,
  inputClass,
  SubmitButton
} from '../components/forms/Field.jsx';
import { safeNext } from './login.jsx';

export function meta() {
  return [{ title: 'Create an account | STEMOTICS' }];
}

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      await api('/auth/register', { method: 'POST', body: parsed.data });
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setErrors(err.details ?? {});
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create an account">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError>{error}</FormError>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="First name" error={errors.firstName}>
            {(props) => <input {...props} autoComplete="given-name" className={inputClass} />}
          </Field>
          <Field id="lastName" label="Last name" error={errors.lastName}>
            {(props) => <input {...props} autoComplete="family-name" className={inputClass} />}
          </Field>
        </div>
        <Field id="email" label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" autoComplete="email" className={inputClass} />}
        </Field>
        <Field id="phone" label="Mobile phone" error={errors.phone}>
          {(props) => <input {...props} type="tel" autoComplete="tel" className={inputClass} />}
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint="At least 10 characters."
        >
          {(props) => (
            <input {...props} type="password" autoComplete="new-password" className={inputClass} />
          )}
        </Field>
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm">
        Already registered?{' '}
        <Link to="/login/" className="text-brand underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
