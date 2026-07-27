import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Wraps a section so it fades/slides/un-blurs into place every time it
// scrolls into view (not just the first time) — the "smooth scroll action"
// look, replayed on every pass. Automatically turns itself off for
// prefers-reduced-motion users (just renders children plainly, no animation).
export default function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
