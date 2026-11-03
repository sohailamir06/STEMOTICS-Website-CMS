import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import {
  checkoutSchema,
  CANCELLATION_NOTICE_DAYS,
  formatCents,
  formatLongDate,
  isAllowedStartDate,
  todayInToronto
} from '@stemotics/shared';
import { apiGet, rethrowNotFound } from '../lib/api.server.js';
import { api, saveCheckoutToken } from '../lib/api.client.js';
import { Field, FormError, inputClass, SubmitButton } from '../components/forms/Field.jsx';

export function meta() {
  return [{ title: 'Registration | STEMOTICS' }, { name: 'robots', content: 'noindex' }];
}

// The selection from the course page (?course=&level=&slot=&start=) is checked here so the
// parent sees problems before filling in the form; the API checks everything again on submit.
export async function loader({ request }) {
  const params = new URL(request.url).searchParams;
  const slug = params.get('course') ?? '';
  let course;
  try {
    ({ course } = await apiGet(`/courses/${encodeURIComponent(slug)}`, request));
  } catch (err) {
    rethrowNotFound(err);
  }
  const slot = course.timeSlots.find((item) => item.id === params.get('slot')) ?? null;
  const level = course.levels.find((item) => item.code === params.get('level')) ?? null;
  const startDate = params.get('start') ?? '';
  const problem =
    !slot || slot.isFull
      ? 'This time slot is no longer available.'
      : course.levels.length > 0 && !level
        ? 'Please choose a level.'
        : !isAllowedStartDate(startDate, slot.dayOfWeek, todayInToronto())
          ? 'Please choose a valid start date.'
          : course.monthlyFee === null
            ? 'Online registration is not available for this program yet.'
            : null;
  return { course, slot, level, startDate, problem };
}

function ages(course) {
  if (course.ageMin === null || course.ageMax === null) return [];
  return Array.from({ length: course.ageMax - course.ageMin + 1 }, (_, i) => course.ageMin + i);
}

function Summary({ course, slot, level, startDate }) {
  return (
    <aside className="rounded-card border border-line bg-surface-alt p-5 text-sm">
      <h2 className="mb-3 font-semibold text-ink">Your registration</h2>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted">Program</dt>
          <dd className="font-medium text-ink">
            {course.title} {level ? `— ${level.name} [${level.code}]` : `[${course.code}]`}
          </dd>
        </div>
        {slot && (
          <div>
            <dt className="text-muted">Day &amp; time</dt>
            <dd className="font-medium text-ink">{slot.label}</dd>
          </div>
        )}
        {startDate && (
          <div>
            <dt className="text-muted">Start date</dt>
            <dd className="font-medium text-ink">{formatLongDate(startDate)}</dd>
          </div>
        )}
        {course.monthlyFee !== null && (
          <div>
            <dt className="text-muted">Today you pay (first month)</dt>
            <dd className="text-lg font-bold text-ink">{formatCents(course.monthlyFee)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-xs text-muted">
        Then {course.monthlyFee !== null && formatCents(course.monthlyFee)} is charged automatically
        on the same day each month until you cancel.
      </p>
    </aside>
  );
}

export default function Checkout() {
  const { course, slot, level, startDate, problem } = useLoaderData();
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined); // undefined = checking, null = guest
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);

  useEffect(() => {
    api('/auth/me')
      .then(({ user: me }) => setUser(me))
      .catch(() => setUser(null));
  }, []);

  const backToCourse = `/product/${course.slug}/`;
  const signInHref = `/login?next=${encodeURIComponent(
    typeof window === 'undefined' ? '/checkout/' : window.location.pathname + window.location.search
  )}`;

  if (problem) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <FormError>{problem}</FormError>
        <Link to={backToCourse} className="mt-4 inline-block text-brand underline">
          Back to {course.title}
        </Link>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      courseSlug: course.slug,
      levelCode: level?.code,
      timeSlotId: slot.id,
      startDate,
      child: {
        firstName: form.get('childFirstName'),
        lastName: form.get('childLastName'),
        age: Number(form.get('childAge')) || undefined
      },
      ...(user
        ? {}
        : {
            parent: {
              firstName: form.get('parentFirstName'),
              lastName: form.get('parentLastName'),
              email: form.get('parentEmail'),
              phone: form.get('parentPhone')
            },
            createAccount,
            password: createAccount ? form.get('password') : undefined
          }),
      acceptCancellationPolicy: form.get('acceptCancellationPolicy') === 'on'
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      // Flatten nested errors (child.firstName → childFirstName) to match field ids.
      const flat = {};
      for (const issue of parsed.error.issues) {
        const [first, second] = issue.path;
        const key = second
          ? `${first}${String(second)[0].toUpperCase()}${String(second).slice(1)}`
          : first;
        flat[key] ??= [issue.message];
      }
      setErrors(flat);
      setFormError('Please check the highlighted fields.');
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const result = await api('/checkout', { method: 'POST', body: parsed.data });
      saveCheckoutToken(result.order.id, result.checkoutToken);
      navigate(`/checkout/pay/${result.order.id}`);
    } catch (err) {
      const details = err.details ?? {};
      setErrors({ ...details, childAge: details.age });
      setFormError(err.message);
      setBusy(false);
    }
  }

  const childAges = ages(course);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to={backToCourse} className="text-sm text-brand hover:underline">
        ← Back to {course.title}
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-ink">Registration</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <FormError>{formError}</FormError>

          <section aria-labelledby="child-heading" className="space-y-4">
            <h2 id="child-heading" className="text-lg font-semibold text-ink">
              Child
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="childFirstName" label="First name" error={errors.childFirstName}>
                {(props) => <input {...props} className={inputClass} autoComplete="off" />}
              </Field>
              <Field id="childLastName" label="Last name" error={errors.childLastName}>
                {(props) => <input {...props} className={inputClass} autoComplete="off" />}
              </Field>
              <Field id="childAge" label="Age" error={errors.childAge}>
                {(props) => (
                  <select {...props} className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Select age
                    </option>
                    {childAges.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </section>

          <section aria-labelledby="parent-heading" className="space-y-4">
            <h2 id="parent-heading" className="text-lg font-semibold text-ink">
              Parent or guardian
            </h2>
            {user === undefined && <p className="text-sm text-muted">Checking your account…</p>}
            {user && (
              <p className="rounded-md bg-surface-alt px-4 py-3 text-sm">
                Signed in as{' '}
                <strong>
                  {user.firstName} {user.lastName}
                </strong>{' '}
                ({user.email}).
              </p>
            )}
            {user === null && (
              <>
                <p className="text-sm">
                  Already have an account?{' '}
                  <Link to={signInHref} className="font-semibold text-brand underline">
                    Sign in
                  </Link>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="parentFirstName" label="First name" error={errors.parentFirstName}>
                    {(props) => (
                      <input {...props} className={inputClass} autoComplete="given-name" />
                    )}
                  </Field>
                  <Field id="parentLastName" label="Last name" error={errors.parentLastName}>
                    {(props) => (
                      <input {...props} className={inputClass} autoComplete="family-name" />
                    )}
                  </Field>
                  <Field id="parentEmail" label="Email" error={errors.parentEmail ?? errors.parent}>
                    {(props) => (
                      <input {...props} type="email" className={inputClass} autoComplete="email" />
                    )}
                  </Field>
                  <Field
                    id="parentPhone"
                    label="Mobile phone"
                    error={errors.parentPhone}
                    hint="For order updates by text."
                  >
                    {(props) => (
                      <input {...props} type="tel" className={inputClass} autoComplete="tel" />
                    )}
                  </Field>
                </div>
                <fieldset className="space-y-3">
                  <legend className="sr-only">Account</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="accountMode"
                      checked={!createAccount}
                      onChange={() => setCreateAccount(false)}
                      className="accent-brand"
                    />
                    Continue as a guest (we’ll email you a link to set a password later)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="accountMode"
                      checked={createAccount}
                      onChange={() => setCreateAccount(true)}
                      className="accent-brand"
                    />
                    Create an account now
                  </label>
                  {createAccount && (
                    <Field
                      id="password"
                      label="Choose a password"
                      error={errors.password}
                      hint="At least 10 characters."
                    >
                      {(props) => (
                        <input
                          {...props}
                          type="password"
                          className={inputClass}
                          autoComplete="new-password"
                        />
                      )}
                    </Field>
                  )}
                </fieldset>
              </>
            )}
          </section>

          <section className="space-y-2">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptCancellationPolicy"
                className="mt-0.5 size-4 accent-brand"
                aria-invalid={Boolean(errors.acceptCancellationPolicy)}
                aria-describedby={errors.acceptCancellationPolicy ? 'policy-error' : undefined}
              />
              <span>
                I understand this is a monthly subscription and that cancellations must be requested
                at least {CANCELLATION_NOTICE_DAYS / 7} weeks before the next billing date;
                otherwise the upcoming month is still charged.
              </span>
            </label>
            {errors.acceptCancellationPolicy && (
              <p id="policy-error" className="text-sm text-red-700">
                {errors.acceptCancellationPolicy[0]}
              </p>
            )}
          </section>

          <SubmitButton busy={busy} disabled={user === undefined} busyLabel="Reserving your place…">
            Continue to payment
          </SubmitButton>
          <p className="text-center text-xs text-muted">
            Your place is held for 15 minutes while you pay.
          </p>
        </form>

        <Summary course={course} slot={slot} level={level} startDate={startDate} />
      </div>
    </div>
  );
}
