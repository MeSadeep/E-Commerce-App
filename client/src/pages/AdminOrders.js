import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../api/client';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-accent-100 text-accent-700',
  cancelled: 'bg-ink/10 text-ink/50',
  refunded: 'bg-red-100 text-red-700',
};

export default function AdminOrders() {
  const { authedRequest } = useApi();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setOrders(null);
    authedRequest({ method: 'get', url: '/api/admin/orders' })
      .then((res) => setOrders(res.data))
      .catch(() => setError(true));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-6">Orders</h1>

      {error && <ErrorState description="Could not load orders." onRetry={load} />}

      {!error && orders === null && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="52px" className="rounded-xl" />
          ))}
        </div>
      )}

      {!error && orders !== null && (
        <table className="w-full bg-white border border-line rounded-2xl overflow-hidden">
          <thead className="bg-accent-50 text-left text-sm">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-accent-50/40 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-accent-600">
                    #{order.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink/60 truncate max-w-[220px]">{order.auth0_user_id}</td>
                <td className="px-4 py-3 font-medium">{formatPrice(order.total_cents, order.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-ink/10 text-ink/50'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/50">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
