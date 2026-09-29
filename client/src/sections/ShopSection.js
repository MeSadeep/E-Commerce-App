import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, X } from 'lucide-react';
import { publicApi } from '../api/client';
import ProductCard from '../components/ProductCard';
import PopularProducts from '../components/PopularProducts';
import ImageGallerySlideshow from '../components/ImageGallerySlideshow';
import Reveal from '../components/Reveal';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

export default function ShopSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const sort = searchParams.get('sort') || (query ? 'relevance' : 'newest');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState([]);
  const requestId = useRef(0);

  // Local text-input state for price, so typing doesn't refetch on every
  // keystroke — only commits to the URL (and triggers a fetch) on blur/Enter.
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);
  useEffect(() => {
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    publicApi.get('/api/products/categories').then((res) => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  const load = useCallback((signal) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (category) params.set('category', category);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (sort && sort !== 'newest' && sort !== 'relevance') params.set('sort', sort);
    const qs = params.toString();

    publicApi
      .get(`/api/products${qs ? `?${qs}` : ''}`, { signal })
      .then((res) => {
        if (currentRequest === requestId.current) setProducts(res.data);
      })
      .catch((err) => {
        if (currentRequest === requestId.current && err.code !== 'ERR_CANCELED') setError(true);
      })
      .finally(() => {
        if (currentRequest === requestId.current && !signal?.aborted) setLoading(false);
      });
  }, [query, category, minPrice, maxPrice, sort]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Updates the URL's search params while preserving whatever else is
  // already there (like ?q= from the navbar search) — this is what makes
  // filters shareable/bookmarkable, consistent with how search already works.
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['category', 'min_price', 'max_price', 'sort'].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  };

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    if (next.get('sort') === 'relevance') next.delete('sort');
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = category || minPrice || maxPrice || (sort !== (query ? 'relevance' : 'newest'));

  return (
    <section id="shop" className="scroll-mt-28 max-w-6xl mx-auto px-4 md:px-8 pt-24">
      <Reveal>
        <p className="text-accent-500 text-sm font-medium mb-2">— Catalog</p>
        <h2 className="font-display font-bold text-4xl tracking-tight mb-2">Shop</h2>
        {query && (
          <p className="text-ink/60 text-sm mb-8 flex flex-wrap items-center gap-2">
            <span>{loading ? 'Searching' : `${products.length} ${products.length === 1 ? 'result' : 'results'}`} for "<strong className="text-ink font-medium">{query}</strong>"</span>
            <button type="button" onClick={clearSearch} className="underline underline-offset-2 hover:text-ink">Clear search</button>
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

        {/* Filter bar — category, price range, and sort, all synced to the
            URL so filters are shareable/bookmarkable, same pattern as search. */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-line">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('category', '')}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  !category ? 'bg-ink text-white border-ink' : 'border-line text-ink/60 hover:border-accent-300'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => updateFilter('category', c)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    category === c ? 'bg-ink text-white border-ink' : 'border-line text-ink/60 hover:border-accent-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:ml-auto">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Min $"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              onBlur={() => updateFilter('min_price', minPriceInput)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilter('min_price', minPriceInput)}
              aria-label="Minimum price in dollars"
              className="w-20 border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent-500"
            />
            <span className="text-ink/30">–</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Max $"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              onBlur={() => updateFilter('max_price', maxPriceInput)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilter('max_price', maxPriceInput)}
              aria-label="Maximum price in dollars"
              className="w-20 border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent-500"
            />

            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value === (query ? 'relevance' : 'newest') ? '' : e.target.value)}
              aria-label="Sort products"
              className="max-w-full border border-line rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent-500"
            >
              {SORT_OPTIONS.filter((opt) => query || opt.value !== 'relevance').map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-ink/50 hover:text-red-600"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

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
            onRetry={() => load()}
          />
        )}

        {/* Empty state — a genuine "nothing to show", not an error */}
        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon={<SearchX size={40} strokeWidth={1.5} />}
            title={query ? `No products match "${query}"` : hasActiveFilters ? 'No products match these filters' : 'No products yet'}
            description={
              query
                ? 'Try a different search term.'
                : hasActiveFilters
                ? 'Try adjusting the price range or category.'
                : 'Check back soon.'
            }
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
