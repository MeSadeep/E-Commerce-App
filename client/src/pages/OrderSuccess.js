import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';

export default function OrderSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    // Safe to clear the local cart here — the real payment confirmation
    // already happened server-side via the Stripe webhook, not because
    // the user landed on this page (a URL can be visited without paying).
    clearCart();
  }, [clearCart]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display font-bold text-3xl tracking-tight mb-3">Payment received</h1>
      <p className="text-ink/60">Thanks for your order! You'll get a confirmation once it's processed.</p>
    </main>
  );
}
