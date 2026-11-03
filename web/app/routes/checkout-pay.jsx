import { useEffect, useState } from 'react';
import { Link, Navigate, useLoaderData, useNavigate } from 'react-router';
import { formatCents, formatLongDate } from '@stemotics/shared';
import { api, readCheckoutToken } from '../lib/api.client.js';
import { FormError } from '../components/forms/Field.jsx';

export function meta() {
  return [{ title: 'Payment | STEMOTICS' }, { name: 'robots', content: 'noindex' }];
}

// Loaded in the browser: the order belongs to this tab's checkout (token) or the signed-in parent.
export async function clientLoader({ params }) {
  const checkoutToken = readCheckoutToken(params.orderId);
  try {
    const data = await api(`/checkout/orders/${params.orderId}`, {
      headers: { 'X-Checkout-Token': checkoutToken }
    });
    return { ...data, checkoutToken };
  } catch (err) {
    if (err.status === 404) return { notFound: true };
    throw err;
  }
}

export function HydrateFallback() {
  return <p className="mx-auto max-w-2xl px-4 py-16 text-muted">Loading your order…</p>;
}

function useMinutesLeft(until) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 60_000));
}

// Until Decision D-1 picks Helcim/Stripe, payments run through the built-in test gateway.
// Real processors replace TestPayment with their hosted card fields.
function TestPayment({ onPay, busy }) {
  return (
    <div className="space-y-3 rounded-card border-2 border-dashed border-amber-400 bg-amber-50 p-5">
      <p className="font-semibold text-amber-900">Test mode — no real payment is taken</p>
      <p className="text-sm text-amber-900">
        The payment processor (Helcim/Stripe) is connected once STEMOTICS confirms Decision D-1.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onPay('approve')}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Approve payment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPay('decline')}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Decline card
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPay('approve_then_fail')}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Approve, fail next month
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPay() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const minutesLeft = useMinutesLeft(data.order?.holdExpiresAt ?? 0);

  if (data.notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <FormError>
          We could not find this order in this browser. If you already paid, check your email for
          the confirmation.
        </FormError>
        <Link to="/courses/" className="mt-4 inline-block text-brand underline">
          Browse courses
        </Link>
      </div>
    );
  }

  const { order, payment, checkoutToken } = data;
  if (order.status === 'paid') return <Navigate to={`/order-success/${order.id}`} replace />;
  const expired = order.status === 'expired' || minutesLeft === 0;

  async function pay(testOutcome) {
    setBusy(true);
    setError(null);
    try {
      await api(`/checkout/orders/${order.id}/complete`, {
        method: 'POST',
        // Signed-in parents are recognised by their session; the token field just has to be present.
        body: {
          checkoutToken: checkoutToken || 'signed-in-parent-no-token',
          payment: { testOutcome }
        }
      });
      navigate(`/order-success/${order.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">Payment</h1>
      <p className="mt-1 text-sm text-muted">Order {order.orderNumber}</p>

      <ul className="mt-6 divide-y divide-line rounded-card border border-line">
        {order.items.map((item) => (
          <li key={item.title + item.childName} className="flex justify-between gap-4 p-4 text-sm">
            <div>
              <p className="font-semibold text-ink">{item.title}</p>
              <p>
                {item.childName} · {item.timeSlotLabel} · from {formatLongDate(item.startDate)}
              </p>
            </div>
            <p className="font-semibold">{formatCents(item.amount)}</p>
          </li>
        ))}
        <li className="flex justify-between p-4 font-bold text-ink">
          <span>Due today</span>
          <span>{formatCents(order.total)}</span>
        </li>
      </ul>

      <div className="mt-6 space-y-4">
        {expired ? (
          <FormError>
            Your reserved place has expired.{' '}
            <Link to="/courses/" className="underline">
              Start again
            </Link>
          </FormError>
        ) : (
          <>
            <p className="text-sm">
              Your place is held for{' '}
              <strong>
                {minutesLeft} more minute{minutesLeft === 1 ? '' : 's'}
              </strong>
              .
            </p>
            <FormError>{error}</FormError>
            {payment?.mode === 'test' ? (
              <TestPayment onPay={pay} busy={busy} />
            ) : (
              <FormError>Online payment is not available right now. Please contact us.</FormError>
            )}
          </>
        )}
      </div>
    </div>
  );
}
