import { Link, useLoaderData } from 'react-router';
import { formatCents, formatLongDate } from '@stemotics/shared';
import { api, readCheckoutToken } from '../lib/api.client.js';

export function meta() {
  return [{ title: 'Registration confirmed | STEMOTICS' }, { name: 'robots', content: 'noindex' }];
}

export async function clientLoader({ params }) {
  try {
    const { order } = await api(`/checkout/orders/${params.orderId}`, {
      headers: { 'X-Checkout-Token': readCheckoutToken(params.orderId) }
    });
    const signedIn = await api('/auth/me')
      .then(() => true)
      .catch(() => false);
    return { order, signedIn };
  } catch (err) {
    if (err.status === 404) return { order: null };
    throw err;
  }
}

export function HydrateFallback() {
  return <p className="mx-auto max-w-2xl px-4 py-16 text-muted">Loading…</p>;
}

export default function OrderSuccess() {
  const { order, signedIn } = useLoaderData();

  if (!order || order.status !== 'paid') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold text-ink">We could not confirm this order here</h1>
        <p className="mt-2">If you completed payment, your confirmation email has the details.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Registration confirmed
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">Thank you, {order.contact.firstName}!</h1>
      <p className="mt-2">
        Order <strong>{order.orderNumber}</strong>. A confirmation has been sent to{' '}
        {order.contact.email}.
      </p>

      <ul className="mt-6 divide-y divide-line rounded-card border border-line">
        {order.items.map((item) => (
          <li key={item.title + item.childName} className="p-4 text-sm">
            <p className="font-semibold text-ink">{item.title}</p>
            <p>
              {item.childName} · {item.timeSlotLabel} · starts {formatLongDate(item.startDate)}
            </p>
            <p className="text-muted">Monthly fee: {formatCents(item.amount)}</p>
          </li>
        ))}
      </ul>

      <section className="mt-6 space-y-2 text-sm">
        <h2 className="text-lg font-semibold text-ink">What happens next</h2>
        <p>Your card is charged automatically each month on the same day as the start date.</p>
        <p>
          To cancel, give at least 4 weeks’ notice before your next billing date from your account.
        </p>
        {signedIn ? (
          <Link to="/account/" className="inline-block font-semibold text-brand underline">
            Go to your account
          </Link>
        ) : (
          <p>
            We’ve emailed you a link to set a password so you can manage this registration online.
          </p>
        )}
      </section>
    </div>
  );
}
