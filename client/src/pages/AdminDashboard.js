import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApi } from '../api/client';
import RadialGauge from '../components/RadialGauge';

const fmt = (cents) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function ChangeBadge({ pct }) {
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct)}%
    </span>
  );
}

export default function AdminDashboard() {
  const { authedRequest } = useApi();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    authedRequest({ method: 'get', url: '/api/admin/dashboard' })
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'));
  }, [authedRequest]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-ink/50">Loading dashboard…</p>;

  const trendData = data.salesTrend.map((r) => ({ day: new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: r.revenueCents / 100 }));
  const barData = data.activeSales.last7Days.map((r) => ({ day: new Date(r.day).toLocaleDateString(undefined, { weekday: 'short' }), revenue: r.revenueCents / 100 }));
  const conversionPct = (data.salesPerformance.conversionRate * 100).toFixed(1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-ink/50 text-sm mt-1">Track your sales and performance at a glance</p>
      </div>

      {/* Top row: Product overview, Active sales, Product revenue */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-line p-5">
          <p className="text-sm text-ink/50 mb-2">Product overview</p>
          <div className="text-2xl font-display font-bold">{fmt(data.overview.totalSalesCents)}</div>
          <p className="text-xs text-ink/40 mt-1">Total sales · {data.overview.newSalesCount} new (30d)</p>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-ink/50 mb-2">Active sales</p>
              <div className="text-2xl font-display font-bold">{fmt(data.activeSales.valueCents)}</div>
              <div className="mt-1"><ChangeBadge pct={data.activeSales.changePct} /></div>
            </div>
            <div style={{ width: 70, height: 44 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <Bar dataKey="revenue" fill="#67E8F9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-ink/50 mb-2">Product revenue</p>
            <div className="text-2xl font-display font-bold">{fmt(data.productRevenue.valueCents)}</div>
            <div className="mt-1"><ChangeBadge pct={data.productRevenue.changePct} /></div>
          </div>
          <RadialGauge value={Math.min(1, Math.max(0, data.productRevenue.changePct / 100 + 0.5))} size={56} stroke={6} />
        </div>
      </div>

      {/* Second row: Analytics chart + Sales performance gauge */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        <div className="md:col-span-2 bg-white rounded-2xl border border-line p-5">
          <p className="text-sm text-ink/50 mb-4">Analytics — last 30 days</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <Line type="monotone" dataKey="revenue" stroke="#22D3EE" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 flex flex-col items-center justify-center">
          <p className="text-sm text-ink/50 mb-3 self-start">Sales performance</p>
          <div className="relative">
            <RadialGauge value={data.salesPerformance.conversionRate} size={140} stroke={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-display font-bold">{conversionPct}%</span>
              <span className="text-xs text-ink/40">Conversion</span>
            </div>
          </div>
          <p className="text-xs text-ink/40 mt-3">{data.salesPerformance.paidCount} paid / {data.salesPerformance.totalCount} started</p>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-2xl border border-line p-5">
        <p className="text-sm text-ink/50 mb-4">Top products</p>
        {data.topProducts.length === 0 ? (
          <p className="text-ink/40 text-sm">No paid orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/40 border-b border-line">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Units sold</th>
                <th className="pb-2 font-medium">Revenue</th>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.topProducts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5">{p.name}</td>
                  <td className="py-2.5">{p.unitsSold} pcs</td>
                  <td className="py-2.5">{fmt(p.revenueCents)}</td>
                  <td className="py-2.5">{p.stock}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${p.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
