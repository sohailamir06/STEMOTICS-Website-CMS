import { Link, useLoaderData } from 'react-router';
import { formatCents, formatLongDate } from '@stemotics/shared';
import { api } from '../../lib/api.client.js';

// Brief §10: view orders, cancel subscriptions, place new orders.
export async function clientLoader() {
  const [{ subscriptions }, { orders }] = await Promise.all([
    api('/portal/subscriptions'),
    api('/portal/orders')
  ]);
  return { subscriptions, orders };
}

export function HydrateFallback() {
  return <p className="text-muted">Loading…</p>;
}

const STATUS_LABELS = {
  active: { text: 'Active', className: 'bg-green-50 text-green-800' },
  cancellation_pending: {
    text: 'Cancelled — ending soon',
    className: 'bg-amber-50 text-amber-800'
  },
  ended: { text: 'Ended', className: 'bg-surface-alt text-body' }
};

function SubscriptionCard({ subscription }) {
  const status = STATUS_LABELS[subscription.status];
  return (
    <li className="rounded-card border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {subscription.course?.title}{' '}
            {subscription.levelCode && (
              <span className="font-mono text-sm text-muted">[{subscription.levelCode}]</span>
            )}
          </p>
          <p className="text-sm">
            {subscription.childName} · {subscription.timeSlotLabel} · started{' '}
            {formatLongDate(subscription.startDate)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
          {status.text}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Monthly fee</dt>
          <dd className="font-medium">{formatCents(subscription.monthlyAmount)}</dd>
        </div>
        {subscription.nextBillingDate && (
          <div>
            <dt className="text-muted">
              {subscription.finalBillingDate ? 'Final payment' : 'Next payment'}
            </dt>
            <dd className="font-medium">{formatLongDate(subscription.nextBillingDate)}</dd>
          </div>
        )}
        {subscription.serviceEndDate && (
          <div>
            <dt className="text-muted">Last day of classes</dt>
            <dd className="font-medium">{formatLongDate(subscription.serviceEndDate)}</dd>
          </div>
        )}
      </dl>

      {subscription.pastDue && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          Your last payment was declined. Please contact us to update your card.
        </p>
      )}
      {subscription.status === 'active' && (
        <Link
          to={`/account/subscriptions/${subscription.id}/cancel`}
          className="mt-4 inline-block text-sm font-semibold text-red-700 underline"
        >
          Cancel subscription
        </Link>
      )}
    </li>
  );
}

export default function AccountHome() {
  const { subscriptions, orders } = useLoaderData();

  return (
    <div className="space-y-10">
      <section aria-labelledby="subs-heading">
        <h2 id="subs-heading" className="mb-4 text-xl font-semibold text-ink">
          Programs &amp; subscriptions
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-muted">
            No registrations yet.{' '}
            <Link to="/courses/" className="text-brand underline">
              Browse courses
            </Link>
          </p>
        ) : (
          <ul className="space-y-4">
            {subscriptions.map((subscription) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-4 text-xl font-semibold text-ink">
          Orders
        </h2>
        {orders.length === 0 ? (
          <p className="text-muted">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-alt text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      {new Date(order.paidAt ?? order.createdAt).toLocaleDateString('en-CA')}
                    </td>
                    <td className="px-4 py-3">
                      {order.items.map((item) => `${item.childName}: ${item.title}`).join('; ')}
                    </td>
                    <td className="px-4 py-3">{formatCents(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
