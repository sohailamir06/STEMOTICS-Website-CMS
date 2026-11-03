// Small shared UI primitives for the admin. Kept deliberately plain so staff screens look
// consistent and stay accessible (labels, focus rings, error text tied to inputs).

const BUTTON_STYLES = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line bg-surface text-body hover:bg-surface-alt',
  danger: 'border border-red-200 bg-surface text-red-700 hover:bg-red-50'
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-md font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

export const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-red-400';

// Label + control + hint + error. Pass the control as a render function to get ids wired up.
export function Field({ id, label, error, hint, children, className = '' }) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-body">
        {label}
      </label>
      <div className="mt-1">
        {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      </div>
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

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <section className={`rounded-card border border-line bg-surface p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-surface-alt text-body',
    success: 'bg-green-50 text-green-800',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-red-50 text-red-700'
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Loading() {
  return <p className="text-muted">Loading…</p>;
}
