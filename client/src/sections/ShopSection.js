import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { publicApi } from '../api/client';
import ProductCard from '../components/ProductCard';
import PopularProducts from '../components/PopularProducts';
import ImageGallerySlideshow from '../components/ImageGallerySlideshow';
import Reveal from '../components/Reveal';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

export default function ShopSection() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const url = query ? `/api/products?search=${encodeURIComponent(query)}` : '/api/products';
    publicApi
      .get(url)
      .then((res) => setProducts(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section id="shop" className="scroll-mt-28 max-w-6xl mx-auto px-4 md:px-8 pt-24">
      <Reveal>
        <p className="text-accent-500 text-sm font-medium mb-2">— Catalog</p>
        <h2 className="font-display font-bold text-4xl tracking-tight mb-2">Shop</h2>
        {query && (
          <p className="text-ink/50 text-sm mb-8">
            Showing results for "<span className="text-ink">{query}</span>"
          </p>
        )}
        {!query && <div className="mb-12" />}
      </Reveal>

      {/* Showcase panel — a hero moment for the shop itself before the full grid */}
      {!query && (
        <Reveal className="grid md:grid-cols-2 gap-8 items-center mb-16 shadow-xl bg-gradient-to-b from-accent-50/50 to-accent-100 rounded-2xl p-6 md:p-2">
          <ImageGallerySlideshow />
          <div>
            <h3 className="font-display font-bold text-3xl tracking-tight mb-4">Shop Collection</h3>
            <p className="text-ink/60 mb-8 max-w-md">
              Every product here earned its place through the same process:
              materials tested, tolerances checked, and a long look under
              bright light before it's allowed in the catalog.
            </p>
            <a
              href="#shop-grid"
              className="inline-flex items-center bg-gradient-to-r from-accent-600 to-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Explore more
            </a>
          </div>
        </Reveal>
      )}

      {/* Popular products — curated strip, not the full catalog */}
      {!query && (
        <Reveal delay={0.1} className="mb-16">
          <h3 className="font-display font-bold text-2xl tracking-tight mb-6">Popular products</h3>
          <PopularProducts />
        </Reveal>
      )}

      <div id="shop-grid" className="scroll-mt-28">
        {!query && <h3 className="font-display font-bold text-2xl tracking-tight mb-6">All products</h3>}

        {/* Loading state — skeleton cards preview the real grid shape instead of a spinner */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton variant="rect" height="180px" className="rounded-2xl mb-3" />
                <Skeleton count={2} />
              </div>
            ))}
          </div>
        )}

        {/* Error state — real failure, with a retry action */}
        {!loading && error && (
          <ErrorState
            description="Could not load products. Check your connection and try again."
            onRetry={load}
          />
        )}

        {/* Empty state — a genuine "nothing to show", not an error */}
        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon={<SearchX size={40} strokeWidth={1.5} />}
            title={query ? `No products match "${query}"` : 'No products yet'}
            description={query ? 'Try a different search term.' : 'Check back soon.'}
          />
        )}

        {!loading && !error && products.length > 0 && (
          <Reveal delay={0.1} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
