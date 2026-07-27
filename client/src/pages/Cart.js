import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function Cart() {
  const { items, removeItem, updateQuantity, totalCents } = useCart();
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { authedRequest } = useApi();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: '/cart' } });
      return;
    }
    setLoading(true);
    try {
      const payload = { items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) };
      const res = await authedRequest({ method: 'post', url: '/api/checkout/create-session', data: payload });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <p className="text-accent-500 text-sm font-medium mb-3">— Your cart</p>
      <h1 className="font-display font-bold text-4xl tracking-tight mb-10">{items.length === 0 ? 'Empty' : 'Cart'}</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={40} strokeWidth={1.5} />}
          title="Your cart is empty"
          description="Find something you'll actually want to keep."
          action={
            <Button as={Link} to="/#shop">
              Browse products
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-line mb-8">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-4 py-4">
                <span className="font-body text-sm flex-1">{item.name}</span>
                <label className="sr-only" htmlFor={`qty-${item.productId}`}>
                  Quantity for {item.name}
                </label>
                <input
                  id={`qty-${item.productId}`}
                  type="number"
                  min="1"
                  max="100"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                  className="w-16 border border-line rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-sm w-20 text-right">{formatPrice(item.price_cents * item.quantity, item.currency)}</span>
                <button onClick={() => removeItem(item.productId)} className="text-red-600 text-sm hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center text-lg font-medium mb-8">
            <span>Total</span>
            <span>{formatPrice(totalCents)}</span>
          </div>

          <Button onClick={handleCheckout} loading={loading} fullWidth size="lg">
            {loading ? 'Redirecting to Stripe…' : 'Checkout with Stripe'}
          </Button>
        </>
      )}
    </main>
  );
}
