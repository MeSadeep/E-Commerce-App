import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

export default function HeroSection() {
  const reduce = useReducedMotion();
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <section id="home" className="scroll-mt-28 mx-4 md:mx-8 pt-10">
      <div className="relative mx-auto max-w-6xl rounded-xl2 overflow-hidden bg-ink min-h-[560px] flex flex-col">
        {/* Wave background — built as layered SVG gradients rather than a
            stock photo, so it's exactly reproducible and never depends on an
            external image source. */}
        
        <img
          src="https://res.cloudinary.com/s3j01zmg/image/upload/v1785185282/pexels-rachel-claire-5531541_1_hweepv.jpg"
          alt="Hero background: a woman in a flowing dress"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />

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
            className="flex flex-col items-start gap-4 max-w-4xl"
            initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-body text-white/60 text-sm max-w-[220px]">
              Discover timeless fashion crafted for every occasion.
            </p>
            <div className="max-w-2xl">
              {/* Monospace + cyan glow — deliberately scoped to just this
                  headline (the rest of the site keeps Space Grotesk) to
                  match the Figma reference's distinct hero treatment without
                  changing the whole app's typography. */}
              <h1
                className="font-display font-bold text-paper text-3xl md:text-5xl leading-[1.15] tracking-tight"
                style={{ textShadow: '0 0 18px rgba(34, 211, 238, 0.55), 0 0 40px rgba(34, 211, 238, 0.25)' }}
              >
                Style That Speaks for You
              </h1>
            </div>
          </motion.div>

          {/* Buttons Container */}
          <motion.div
            className="mt-8 flex items-center gap-3 flex-wrap"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/#shop"
              className="inline-flex items-center gap-3 bg-white text-ink rounded-full pl-6 pr-2 py-2 font-body text-sm font-medium hover:bg-accent-300/70 transition-colors"
            >
              New Arrivals
              <span className="w-8 h-8 rounded-full bg-flash-500 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 11L11 3M11 3H4M11 3V10" stroke="#0A0F1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>

            {!isAuthenticated && (
              <button onClick={() => loginWithRedirect()} className="inline-flex items-center gap-6 bg-white/2 text-white border border-accent-300 rounded-full px-10 py-3 font-body text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm">
                Log in
              </button>
            )}
          </motion.div>

          {/* Modern Trust Badges / Stats Bar */}
  <motion.div 
    className="mt-8 pt-6 border-t border-accent-300/50 grid grid-cols-2 md:grid-cols-4 gap-6"
    initial={reduce ? false : { opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* Stat 1 */}
    <div className="flex flex-col">
      <span className="font-mono text-white text-lg md:text-xl font-bold">500+</span>
      <span className="font-body text-white/50 text-xs tracking-wide uppercase mt-0.5">Premium Products</span>
    </div>

    {/* Stat 2 */}
    <div className="flex flex-col">
      <span className="font-mono text-white text-lg md:text-xl font-bold">25,000+</span>
      <span className="font-body text-white/50 text-xs tracking-wide uppercase mt-0.5">Happy Customers</span>
    </div>

    {/* Stat 3 */}
    <div className="flex flex-col">
      <span className="font-mono text-accent-300 text-lg md:text-xl font-bold">Free</span>
      <span className="font-body text-white/50 text-xs tracking-wide uppercase mt-0.5">Shipping Over $75</span>
    </div>

    {/* Stat 4 */}
    <div className="flex flex-col">
      <span className="font-mono text-white text-lg md:text-xl font-bold">30-Day</span>
      <span className="font-body text-white/50 text-xs tracking-wide uppercase mt-0.5">Easy Returns</span>
    </div>
  </motion.div>
        </div>
      </div>
    </section>
  );
}
