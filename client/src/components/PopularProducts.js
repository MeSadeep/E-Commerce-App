import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../api/client';
import Skeleton from './ui/Skeleton';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

/**
 * A curated row of products in a single bordered container (distinct from
 * the individually-bordered cards in the main Shop grid) — matches the
 * Figma reference's "Popular Products" treatment. Currently just shows the
 * first few products from the catalog (there's no real "popularity"/featured
 * flag on products yet); swap the slice for a real featured-products query
 * once that exists.
 */
export default function PopularProducts({ excludeId, limit = 4 }) {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    publicApi
      .get('/api/products')
      .then((res) => {
        const filtered = res.data.filter((p) => p.id !== excludeId).slice(0, limit);
        setProducts(filtered);
      })
      .catch(() => setProducts([]));
  }, [excludeId, limit]);

  if (products === null) {
    return (
      <div className="border border-line rounded-2xl overflow-hidden bg-white flex divide-x divide-line">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[140px] p-3">
            <Skeleton variant="rect" height="120px" className="rounded-xl mb-3" />
            <Skeleton count={2} />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="border border-line rounded-2xl overflow-x-auto bg-white">
      <div className="flex divide-x divide-line min-w-max sm:min-w-0">
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/products/${p.id}`}
            className="flex-1 min-w-[150px] p-3 hover:bg-accent-50/60 transition-colors"
          >
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="rounded-xl w-full aspect-square object-cover mb-3"
            />
            <p className="text-sm font-medium text-ink truncate">{p.name}</p>
            <p className="text-accent-600 text-sm font-medium">{formatPrice(p.price_cents, p.currency)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
