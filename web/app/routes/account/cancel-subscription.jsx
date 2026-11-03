import { useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { CANCELLATION_NOTICE_DAYS, formatCents, formatLongDate } from '@stemotics/shared';
import { api } from '../../lib/api.client.js';
import { FormError } from '../../components/forms/Field.jsx';

// Brief §5: show and enforce the 4-week rule before the parent confirms (Phase 05 §4.1).
export async function clientLoader({ params }) {
  try {
    const { preview } = await api(`/portal/subscriptions/${params.id}/cancellation-preview`);
    return { preview, id: params.id };
  } catch (err) {
    return { error: err.message, id: params.id };
  }
}

export function HydrateFallback() {
  return <p className="text-muted">Calculating…</p>;
}

export default function CancelSubscription() {
  const { preview, error: loadError, id } = useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loadError) {
    return (
      <div className="space-y-4">
        <FormError>{loadError}</FormError>
        <Link to="/account/" className="text-brand underline">
          Back to my account
        </Link>
      </div>
    );
  }

  const lateNotice = preview.cancellationCase === 'B';

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/portal/subscriptions/${id}/cancel`, { method: 'POST' });
      navigate('/account/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-semibold text-ink">Cancel subscription</h2>
      <p>
        Cancellations need at least {CANCELLATION_NOTICE_DAYS / 7} weeks’ notice before the next
        billing date. Your next billing date is{' '}
        <strong>{formatLongDate(preview.upcomingBillingDate)}</strong> — {preview.noticeDays} days
        from today.
      </p>

      <div
        className={`rounded-card border p-5 ${lateNotice ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}`}
      >
        {lateNotice ? (
          <>
            <p className="font-semibold text-amber-900">Less than 4 weeks’ notice</p>
            <p className="mt-1 text-amber-900">
              Your payment of {formatCents(preview.monthlyAmount)} on{' '}
              {formatLongDate(preview.finalBillingDate)} will still be charged, and classes continue
              until <strong>{formatLongDate(preview.serviceEndDate)}</strong>. There will be no
              payments after that.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-green-900">No further payments</p>
            <p className="mt-1 text-green-900">
              Classes continue until <strong>{formatLongDate(preview.serviceEndDate)}</strong>.
            </p>
          </>
        )}
      </div>

      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {busy ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <Link
          to="/account/"
          className="rounded-lg border border-line px-5 py-2.5 hover:bg-surface-alt"
        >
          Keep my subscription
        </Link>
      </div>
    </div>
  );
}
