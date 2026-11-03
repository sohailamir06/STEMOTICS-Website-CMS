// Form building blocks for the public site: label, control, hint and error wired together.

export const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-red-500';

export function Field({ id, label, error, hint, children, className = '' }) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, name: id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {Array.isArray(error) ? error[0] : error}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {children}
    </div>
  );
}

// `busy` shows the busy label; `disabled` only greys the button out (e.g. while loading).
export function SubmitButton({ busy, disabled = false, children, busyLabel = 'Please wait…' }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {busy ? busyLabel : children}
    </button>
  );
}

// Small centred card used by the sign-in, register and password pages.
export function AuthCard({ title, children }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-card border border-line bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-ink">{title}</h1>
        {children}
      </div>
    </div>
  );
}
