import { useState } from 'react';
import { can, formatCents, formatLongDate } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { api } from '../../lib/api.js';
import { Alert, Badge, Button, Loading, PageHeader } from '../../components/ui/index.jsx';
import { PaymentsTabs } from './PaymentsTabs.jsx';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'status=active', label: 'Active' },
  { value: 'status=cancellation_pending', label: 'Cancelling' },
  { value: 'pastDue=true', label: 'Past due' },
  { value: 'status=ended', label: 'Ended' }
];

function StatusBadge({ subscription }) {
  if (subscription.pastDue) return <Badge tone="danger">Past due</Badge>;
  if (subscription.status === 'active') return <Badge tone="success">Active</Badge>;
  if (subscription.status === 'cancellation_pending')
    return <Badge tone="warning">Cancelling</Badge>;
  return <Badge>Ended</Badge>;
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const canManage = can(user.role, 'payments.manage');
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = useApiData(
    `/admin/subscriptions${filter ? `?${filter}` : ''}`
  );
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function cancelNow(subscription) {
    const confirmed = window.confirm(
      `End ${subscription.childName}'s ${subscription.course?.title} subscription today?\n\n` +
        'Billing stops immediately and the seat is released. Any refund must be issued separately in the payment processor.'
    );
    if (!confirmed) return;
    setNotice(null);
    setActionError(null);
    try {
      await api(`/admin/subscriptions/${subscription.id}/cancel-immediately`, { method: 'POST' });
      await reload();
      setNotice(`Ended ${subscription.childName}'s subscription. The seat has been released.`);
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Payments & Customers"
        description="Monthly subscriptions for regular programs. Parents cancel from their account under the 4-week rule; staff can end a subscription immediately for exceptional cases."
      />
      <PaymentsTabs />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter subscriptions">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={filter === option.value ? 'primary' : 'secondary'}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="mb-4 space-y-2">
        {notice && <Alert tone="success">{notice}</Alert>}
        {actionError && <Alert>{actionError}</Alert>}
      </div>
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Child &amp; program</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Next charge</th>
                <th className="px-4 py-3">Classes end</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{subscription.childName}</div>
                    <div className="text-muted">
                      {subscription.course?.title}{' '}
                      {subscription.levelCode && `[${subscription.levelCode}]`}
                    </div>
                    <div className="text-xs text-muted">{subscription.timeSlotLabel}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{subscription.parent?.name}</div>
                    <div className="text-xs text-muted">{subscription.parent?.email}</div>
                    <div className="text-xs text-muted">{subscription.parent?.phone}</div>
                  </td>
                  <td className="px-4 py-3">{formatCents(subscription.monthlyAmount)}</td>
                  <td className="px-4 py-3">
                    {subscription.nextBillingDate
                      ? formatLongDate(subscription.nextBillingDate)
                      : '—'}
                    {subscription.finalBillingDate && (
                      <div className="text-xs text-muted">(final)</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {subscription.serviceEndDate
                      ? formatLongDate(subscription.serviceEndDate)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge subscription={subscription} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {subscription.status !== 'ended' && (
                        <Button size="sm" variant="danger" onClick={() => cancelNow(subscription)}>
                          End now
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {data.subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    No subscriptions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
