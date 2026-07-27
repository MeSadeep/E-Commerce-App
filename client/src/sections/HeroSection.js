import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export default function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section id="home" className="scroll-mt-28 mx-4 md:mx-8 pt-6">
      <div className="relative mx-auto max-w-6xl rounded-xl2 overflow-hidden bg-ink min-h-[560px] flex flex-col">
        {/* Wave background — built as layered SVG gradients rather than a
            stock photo, so it's exactly reproducible and never depends on an
            external image source. */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#164E63" />
              <stop offset="100%" stopColor="#0A0F1E" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#0E7490" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="#0A0F1E" />
          <motion.path
            d="M0,560 C300,460 500,660 800,510 C1100,360 1300,560 1600,460 L1600,900 L0,900 Z"
            fill="url(#wave1)"
            opacity="0.85"
            animate={reduce ? {} : { x: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M0,620 C350,520 550,720 850,570 C1150,420 1350,620 1600,520 L1600,900 L0,900 Z"
            fill="url(#wave2)"
            opacity="0.45"
            animate={reduce ? {} : { x: [0, -30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>

        {/* Ambient drifting gradient overlay — slow, subtle, never distracting */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent"
          animate={reduce ? {} : { opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          className="absolute top-16 left-1/2 -translate-x-1/2 font-display font-bold text-[7rem] md:text-[10rem] text-white/5 select-none tracking-tight whitespace-nowrap"
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          APERTURE
        </motion.span>

        <div className="relative flex-1 flex flex-col justify-end p-6 md:p-12">
          <motion.div
            className="flex items-start justify-between gap-6 flex-wrap"
            initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-white/60 text-sm max-w-[220px]">
              Precision-made goods, engineered for people who notice the details.
            </p>
            <div className="max-w-2xl">
              {/* Monospace + cyan glow — deliberately scoped to just this
                  headline (the rest of the site keeps Space Grotesk) to
                  match the Figma reference's distinct hero treatment without
                  changing the whole app's typography. */}
              <h1
                className="font-mono font-bold text-accent-300 text-3xl md:text-5xl leading-[1.15] tracking-tight"
                style={{ textShadow: '0 0 18px rgba(34, 211, 238, 0.55), 0 0 40px rgba(34, 211, 238, 0.25)' }}
              >
                Goods built to be looked at closely
              </h1>
            </div>
          </motion.div>
          <motion.div
            className="mt-8"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/#shop"
              className="inline-flex items-center gap-3 bg-white text-ink rounded-full pl-6 pr-2 py-2 font-body text-sm font-medium hover:bg-flash-500/10 transition-colors"
            >
              Shop the collection
              <span className="w-8 h-8 rounded-full bg-flash-500 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 11L11 3M11 3H4M11 3V10" stroke="#0A0F1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
