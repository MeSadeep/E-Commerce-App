import React, { useEffect, useState } from 'react';
import { publicApi } from '../api/client';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    publicApi
      .get('/api/products')
      .then((res) => setProducts(res.data))
      .catch(() => setError('Could not load products. Please try again shortly.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-16">
      <div className="mb-10">
        <p className="text-brass-500 text-sm font-medium mb-2">— Catalog</p>
        <h1 className="font-display font-bold text-4xl tracking-tight">Shop</h1>
      </div>

      {loading && <p className="text-ink/50">Loading products…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
