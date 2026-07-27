import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../api/client';

export default function AdminAnalytics() {
  const { authedRequest } = useApi();
  const [sales, setSales] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authedRequest({ method: 'get', url: '/api/admin/analytics/sales?days=30' }),
      authedRequest({ method: 'get', url: '/api/admin/analytics/conversion' }),
    ])
      .then(([salesRes, convRes]) => {
        setSales(
          salesRes.data.map((row) => ({
            day: new Date(row.day).toLocaleDateString(),
            revenue: row.revenue_cents / 100,
            orders: Number(row.order_count),
          }))
        );
        setConversion(convRes.data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="max-w-6xl mx-auto px-4 py-16 text-ink/50">Loading analytics…</p>;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-16">
      <p className="text-brass-500 text-sm font-medium mb-3">— Admin</p>
      <h1 className="font-display font-bold text-3xl tracking-tight mb-6">Analytics</h1>

      {conversion && (
        <p className="text-ink/70 mb-8">
          Conversion rate: <strong className="text-ink">{(conversion.conversion_rate * 100).toFixed(1)}%</strong>{' '}
          ({conversion.paid_count} paid / {conversion.total_count} started)
        </p>
      )}

      <h3 className="font-display font-bold text-lg mb-4">Revenue — last 30 days</h3>
      <div style={{ width: '100%', height: 320 }} className="bg-white rounded-2xl border border-line p-4">
        <ResponsiveContainer>
          <LineChart data={sales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#B8793A" name="Revenue ($)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
