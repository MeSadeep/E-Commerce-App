import React, { useEffect, useState } from 'react';
import { useApi } from '../api/client';

const fmt = (cents, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

const statusStyle = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
};

export default function AdminOrders() {
  const { authedRequest } = useApi();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authedRequest({ method: 'get', url: '/api/admin/orders' })
      .then((res) => setOrders(res.data))
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-6">Orders</h1>

      {loading && <p className="text-ink/50">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-ink/40">No orders yet.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">#{o.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{o.auth0_user_id}</td>
                    <td className="px-4 py-3">{fmt(o.total_cents, o.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusStyle[o.status] || 'bg-ink/10 text-ink/60'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/50">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
