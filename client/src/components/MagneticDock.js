import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

const DEFAULT_SCALE_RANGE = [1, 1.15, 1]; // subtle — these are text pills, not dock icons
const DEFAULT_DISTANCE = [-120, 0, 120]; // px from cursor to item center where the effect fades out

function DockItem({ mouseX, to, className, children }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  const distance = useTransform(mouseX, (val) => {
    if (val === null || reduce) return 9999; // "cursor is nowhere near" -> no magnification
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return 9999;
    return val - (bounds.left + bounds.width / 2);
  });

  const scale = useTransform(distance, DEFAULT_DISTANCE, DEFAULT_SCALE_RANGE);
  const lift = useTransform(scale, [1, DEFAULT_SCALE_RANGE[1]], [0, -3]);
  const springScale = useSpring(scale, { mass: 0.15, stiffness: 220, damping: 16 });
  const springLift = useSpring(lift, { mass: 0.15, stiffness: 220, damping: 16 });

  return (
    <motion.div ref={ref} style={{ scale: reduce ? 1 : springScale, y: reduce ? 0 : springLift }}>
      <Link to={to} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

/**
 * Props:
 * - items: [{ to, label }]
 * - itemClassName: string — applied to each rendered <Link>
 * - className: string — applied to the outer flex row
 *
 * A shared mouseX value (tracked on the container) drives every item's
 * distance-based scale — this is what makes neighboring items also lift
 * slightly as the cursor passes by, rather than each item reacting only to
 * its own hover state. Resets to null on mouse leave, and is skipped
 * entirely for prefers-reduced-motion.
 */
export default function MagneticDock({ items, itemClassName, className = '' }) {
  const mouseX = useMotionValue(null);

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(null)}
      className={`flex items-center gap-1 ${className}`}
    >
      {items.map((item) => (
        <DockItem key={item.to} mouseX={mouseX} to={item.to} className={itemClassName}>
          {item.label}
        </DockItem>
      ))}
    </div>
  );
}
