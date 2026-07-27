import React, { useEffect, useState } from 'react';
import { useApi } from '../api/client';

const fmt = (cents) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AdminCustomers() {
  const { authedRequest } = useApi();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authedRequest({ method: 'get', url: '/api/admin/customers' })
      .then((res) => setCustomers(res.data))
      .catch(() => setError('Could not load customers.'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-2">Customers</h1>
      <p className="text-ink/50 text-sm mb-6">
        Grouped from order history by Auth0 user id. Names/emails aren't shown here — that would need
        an Auth0 Management API lookup per customer, which isn't wired up in this build.
      </p>

      {loading && <p className="text-ink/50">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Customer (Auth0 ID)</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Total spent</th>
                <th className="px-4 py-3 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">No customers yet.</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.auth0UserId}>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{c.auth0UserId}</td>
                    <td className="px-4 py-3">{c.orderCount}</td>
                    <td className="px-4 py-3">{fmt(c.totalSpentCents)}</td>
                    <td className="px-4 py-3 text-ink/50">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
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
