import React from 'react';

// The brand's signature mark: six blades arranged like a camera aperture
// diaphragm. `size` controls px dimensions; `spin` adds a slow ambient
// rotation (respects prefers-reduced-motion via CSS); `color` sets blade fill.
export default function ApertureMark({ size = 32, spin = false, color = '#22D3EE', className = '' }) {
  const blades = Array.from({ length: 6 });
  const cx = 50;
  const cy = 50;
  const r = 42;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${spin ? 'iris-spin' : ''} ${className}`}
      role="img"
      aria-label="Aperture Goods mark"
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" />
      {blades.map((_, i) => {
        const angle = (360 / blades.length) * i;
        return (
          <polygon
            key={i}
            className="iris-blade"
            points="50,50 50,10 68,18"
            fill={color}
            opacity="0.85"
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="10" fill="#0A0F1E" />
    </svg>
  );
}
