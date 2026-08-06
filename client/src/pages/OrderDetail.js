import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../api/client';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-accent-100 text-accent-700',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { authedRequest } = useApi();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setOrder(null);
    authedRequest({ method: 'get', url: `/api/orders/${id}` })
      .then((res) => setOrder(res.data))
      .catch(() => setError(true));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState title="Order not found" description="It may not belong to your account, or the link is wrong." onRetry={load} />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-16">
        <Skeleton variant="rect" height="200px" className="rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-16">
      <Link to="/orders" className="text-accent-600 text-sm hover:underline mb-6 inline-block">← Back to My Orders</Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight">Order #{order.id}</h1>
          <p className="text-ink/50 text-sm mt-1">
            {new Date(order.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[order.status] || 'bg-ink/10 text-ink/50'}`}>
          {order.status}
        </span>
      </div>

      <ul className="divide-y divide-line border border-line rounded-2xl overflow-hidden bg-white mb-6">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4">
            {item.image_url && (
              <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium text-ink">{item.name}</p>
              <p className="text-ink/50 text-sm">Qty {item.quantity}</p>
            </div>
            <p className="font-medium text-ink">{formatPrice(item.unit_price_cents * item.quantity, order.currency)}</p>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center text-lg font-medium px-1">
        <span>Total</span>
        <span>{formatPrice(order.total_cents, order.currency)}</span>
      </div>

      {order.status === 'pending' && (
        <p className="text-amber-600 text-sm mt-6 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          Payment is still processing — this usually resolves within a minute. Refresh this page shortly if it doesn't update.
        </p>
      )}
    </main>
  );
}
