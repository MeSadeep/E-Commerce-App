import React from 'react';

/**
 * Props:
 * - variant: 'text' | 'circle' | 'rect'   (default 'text')
 * - count: number       — for variant="text", renders this many lines (default 1)
 * - width / height: CSS values, e.g. '100%', '2.5rem' — for circle/rect variants
 * - className: string   — additional classes (e.g. to control text-line width)
 *
 * Use this instead of a spinner when you're loading something with a known
 * shape (a product card, a table row) — it previews the layout and feels
 * faster than a blank space + spinner. Uses a plain opacity pulse (no
 * position/size animation), which is gentle enough that it doesn't need a
 * prefers-reduced-motion override.
 */
export default function Skeleton({ variant = 'text', count = 1, width, height, className = '' }) {
  const base = 'animate-pulse bg-ink/10 rounded';

  if (variant === 'circle') {
    return (
      <div
        className={`${base} rounded-full ${className}`}
        style={{ width: width || '2.5rem', height: height || '2.5rem' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'rect') {
    return (
      <div
        className={`${base} ${className}`}
        style={{ width: width || '100%', height: height || '8rem' }}
        aria-hidden="true"
      />
    );
  }

  // text variant — one or more lines, last line slightly shorter (reads more naturally)
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${base} h-4 ${className}`}
          style={{ width: i === count - 1 && count > 1 ? '70%' : width || '100%' }}
        />
      ))}
    </div>
  );
}
