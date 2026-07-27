import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '../api/client';
import Skeleton from './ui/Skeleton';

const AUTO_ADVANCE_MS = 4000;

/**
 * Cycles through real product images from the catalog (not a single static
 * photo). Auto-advances on a timer, but pauses on hover AND keyboard focus
 * (so tabbing to the prev/next buttons doesn't fight the autoplay), and
 * always offers manual controls — autoplay alone isn't accessible on its own
 * (WCAG 2.2.2), it needs a way to stop/control it.
 */
export default function ImageGallerySlideshow({ className = '' }) {
  const [images, setImages] = useState(null); // null = still loading
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    publicApi
      .get('/api/products')
      .then((res) => setImages(res.data.map((p) => ({ id: p.id, src: p.image_url, alt: p.name }))))
      .catch(() => setImages([]));
  }, []);

  useEffect(() => {
    if (!images || images.length < 2 || paused || reduce) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [images, paused, reduce]);

  const goTo = useCallback(
    (i) => {
      if (!images) return;
      setIndex(((i % images.length) + images.length) % images.length);
    },
    [images]
  );

  if (images === null) {
    return <Skeleton variant="rect" height="100%" className={`rounded-2xl aspect-[5/4] border border-line ${className}`} />;
  }
  if (images.length === 0) return null;

  const current = images[index];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden aspect-[5/4] bg-ink/5 border border-line ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product gallery"
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={current.id}
          src={current.src}
          alt={current.alt}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-ink rounded-full p-2 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-ink rounded-full p-2 backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => goTo(i)}
                aria-label={`Go to image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
