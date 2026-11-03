import { formatCents, formatLongDate } from '@stemotics/shared';
import { useApiData } from '../../hooks/useApiData.js';
import { Alert, Badge, Loading, PageHeader } from '../../components/ui/index.jsx';
import { PaymentsTabs } from './PaymentsTabs.jsx';

const STATUS = {
  paid: <Badge tone="success">Paid</Badge>,
  pending_payment: <Badge tone="warning">Awaiting payment</Badge>,
  processing: <Badge tone="warning">Processing</Badge>,
  expired: <Badge>Expired</Badge>
};

export default function OrdersPage() {
  const { data, error, loading } = useApiData('/admin/orders');

  return (
    <>
      <PageHeader
        title="Payments & Customers"
        description="Online orders. Expired orders (abandoned before payment) are hidden."
      />
      <PaymentsTabs />
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString('en-CA')}</td>
                  <td className="px-4 py-3">
                    <div>
                      {order.contact.firstName} {order.contact.lastName}
                    </div>
                    <div className="text-xs text-muted">{order.contact.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {order.items.map((item) => (
                      <div key={item.title + item.childName}>
                        <span className="font-medium">{item.childName}</span>: {item.title}
                        <div className="text-xs text-muted">
                          {item.timeSlotLabel} · from {formatLongDate(item.startDate)}
                        </div>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">{formatCents(order.total)}</td>
                  <td className="px-4 py-3">{STATUS[order.status]}</td>
                </tr>
              ))}
              {data.orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    No orders yet.
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
