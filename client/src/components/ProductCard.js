import React from 'react';
import { Link } from 'react-router-dom';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group block rounded-2xl overflow-hidden bg-white border border-line hover:border-accent-500 transition-colors"
    >
      <div className="aspect-square overflow-hidden bg-accent-50">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <h3 className="font-body font-medium text-sm text-ink">{product.name}</h3>
        <p className="text-accent-500 font-medium text-sm mt-1">
          {formatPrice(product.price_cents, product.currency)}
        </p>
      </div>
    </Link>
  );
}
