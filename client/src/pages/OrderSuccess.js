import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../api/client';
import Skeleton from '../components/ui/Skeleton';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const { authedRequest } = useApi();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Safe to clear the local cart here — the real payment confirmation
    // already happened server-side via the Stripe webhook, not because
    // the user landed on this page (a URL can be visited without paying).
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    authedRequest({ method: 'get', url: `/api/orders/by-session/${sessionId}` })
      .then((res) => setOrder(res.data))
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-24">
      <div className="text-center mb-10">
        <h1 className="font-display font-bold text-3xl tracking-tight mb-3">Payment received</h1>
        <p className="text-ink/60">Thanks for your order! You'll get a confirmation once it's processed.</p>
      </div>

      {!sessionId && (
        <p className="text-center text-ink/50 text-sm">
          <Link to="/orders" className="text-accent-600 hover:underline">View your orders</Link>
        </p>
      )}

      {sessionId && error && (
        <p className="text-center text-ink/50 text-sm">
          Couldn't load order details right now — check{' '}
          <Link to="/orders" className="text-accent-600 hover:underline">My Orders</Link> in a moment.
        </p>
      )}

      {sessionId && !error && !order && (
        <div className="space-y-3">
          <Skeleton variant="rect" height="70px" className="rounded-xl" />
          <Skeleton variant="rect" height="70px" className="rounded-xl" />
        </div>
      )}

      {order && (
        <>
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
          <div className="flex justify-between items-center text-lg font-medium px-1 mb-8">
            <span>Total</span>
            <span>{formatPrice(order.total_cents, order.currency)}</span>
          </div>
          <p className="text-center">
            <Link to={`/orders/${order.id}`} className="text-accent-600 hover:underline">View order details</Link>
          </p>
        </>
      )}
    </main>
  );
}
