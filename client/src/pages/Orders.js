import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { useApi } from '../api/client';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-accent-100 text-accent-700',
};

export default function Orders() {
  const { authedRequest } = useApi();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setOrders(null);
    authedRequest({ method: 'get', url: '/api/orders' })
      .then((res) => setOrders(res.data))
      .catch(() => setError(true));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <p className="text-accent-500 text-sm font-medium mb-2">— Account</p>
      <h1 className="font-display font-bold text-4xl tracking-tight mb-10">My Orders</h1>

      {error && <ErrorState description="Could not load your orders." onRetry={load} />}

      {!error && orders === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height="70px" className="rounded-xl" />
          ))}
        </div>
      )}

      {!error && orders !== null && orders.length === 0 && (
        <EmptyState
          icon={<PackageSearch size={40} strokeWidth={1.5} />}
          title="No orders yet"
          description="Once you place an order, it'll show up here."
          action={<Button as={Link} to="/#shop">Browse products</Button>}
        />
      )}

      {!error && orders !== null && orders.length > 0 && (
        <ul className="divide-y divide-line border border-line rounded-2xl overflow-hidden bg-white">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent-50/40 transition-colors"
              >
                <div>
                  <p className="font-medium text-ink">Order #{order.id}</p>
                  <p className="text-ink/50 text-sm">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-ink">{formatPrice(order.total_cents, order.currency)}</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${
                      STATUS_STYLES[order.status] || 'bg-ink/10 text-ink/50'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
