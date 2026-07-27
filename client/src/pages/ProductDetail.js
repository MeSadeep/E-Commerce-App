import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicApi } from '../api/client';
import { useCart } from '../context/CartContext';
import PopularProducts from '../components/PopularProducts';
import Button from '../components/ui/Button';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';

function formatPrice(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function variantLabel(v) {
  return [v.color, v.size, v.material].filter(Boolean).join(' / ') || 'Option';
}

// A variant's photos, falling back to the base product's single image if
// the variant has none of its own.
function imagesFor(variant, product) {
  if (variant?.image_urls?.length > 0) return variant.image_urls;
  if (variant?.image_url) return [variant.image_url];
  return [product.image_url];
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(false);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  const load = () => {
    setError(false);
    setProduct(null);
    setSelectedVariant(null);
    setActiveImage(0);
    publicApi.get(`/api/products/${id}`).then((res) => setProduct(res.data)).catch(() => setError(true));
    publicApi.get(`/api/products/${id}/variants`).then((res) => setVariants(res.data)).catch(() => setVariants([]));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState title="Product not found" description="It may have been removed or the link is wrong." onRetry={load} />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-16 grid md:grid-cols-2 gap-12">
        <Skeleton variant="rect" height="100%" className="rounded-2xl aspect-square" />
        <div>
          <Skeleton variant="rect" height="2rem" width="70%" className="mb-4" />
          <Skeleton variant="rect" height="1.5rem" width="30%" className="mb-6" />
          <Skeleton count={3} />
        </div>
      </main>
    );
  }

  // Selecting a variant swaps the shown photo(s) — but NOT the price or what
  // gets added to the cart. Checkout only validates price/stock against the
  // base `products` row (a deliberate security choice, see
  // server/routes/checkout.js), so displaying a different price here would
  // be misleading until checkout is actually made variant-aware. Treat
  // variants as "here's what the options look like" for now, not a priced
  // selection — a real next step if you want per-variant pricing/stock to
  // actually affect checkout.
  const images = imagesFor(selectedVariant, product);
  const mainImage = images[activeImage] || images[0];

  const selectVariant = (v) => {
    setSelectedVariant(selectedVariant?.id === v.id ? null : v);
    setActiveImage(0);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-16">
      <div className="grid md:grid-cols-2 gap-12 mb-12">
        <div>
          <img src={mainImage} alt={product.name} className="rounded-2xl w-full aspect-square object-cover mb-3" />
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Photo ${i + 1} of ${images.length}`}
                  aria-pressed={activeImage === i}
                  className={`rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-accent-500' : 'border-line hover:border-accent-300'
                  }`}
                >
                  <img src={src} alt="" className="w-14 h-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight mb-3">{product.name}</h1>
          <p className="text-accent-600 font-medium text-xl mb-6">{formatPrice(product.price_cents, product.currency)}</p>
          <p className="text-ink/60 leading-relaxed mb-6">{product.description}</p>
          <p className="text-ink/40 text-sm mb-8">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>

          {variants.length > 0 && (
            <div className="mb-8">
              <p className="text-sm font-medium text-ink mb-3">
                Options{selectedVariant && <span className="text-ink/50 font-normal"> — {variantLabel(selectedVariant)}</span>}
              </p>
              <div className="flex flex-wrap gap-3">
                {variants.map((v) => {
                  const thumb = v.image_urls?.[0] || v.image_url || product.image_url;
                  return (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v)}
                      aria-pressed={selectedVariant?.id === v.id}
                      aria-label={variantLabel(v)}
                      className={`rounded-xl overflow-hidden border-2 transition-colors ${
                        selectedVariant?.id === v.id ? 'border-accent-500' : 'border-line hover:border-accent-300'
                      }`}
                    >
                      <img src={thumb} alt="" className="w-14 h-14 object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            size="lg"
            disabled={product.stock === 0}
            onClick={() => {
              addItem(product, 1);
              navigate('/cart');
            }}
          >
            Add to cart
          </Button>
        </div>
      </div>

      <h3 className="font-display font-bold text-2xl tracking-tight mb-6">Popular products</h3>
      <PopularProducts excludeId={product.id} />
    </main>
  );
}
