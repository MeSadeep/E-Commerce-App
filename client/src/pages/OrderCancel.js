import React from 'react';
import { Link } from 'react-router-dom';

export default function OrderCancel() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display font-bold text-3xl tracking-tight mb-3">Checkout cancelled</h1>
      <p className="text-ink/60 mb-4">Your cart is still saved.</p>
      <Link to="/cart" className="text-accent-500 font-medium hover:underline">Return to cart</Link>
    </main>
  );
}
