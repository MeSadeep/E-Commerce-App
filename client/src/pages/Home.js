import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import HeroSection from '../sections/HeroSection';
import ShopSection from '../sections/ShopSection';
import AboutSection from '../sections/AboutSection';
import FAQSection from '../sections/FAQSection';
import ContactSection from '../sections/ContactSection';

export default function Home() {
  const location = useLocation();

  // The navbar links to "/#shop", "/#about", etc. instead of separate routes
  // now that everything lives on one scrollable page. This effect does the
  // actual scrolling — it runs whether we're already on "/" (hash just
  // changes) or arriving fresh from another route like /cart (Home mounts
  // and location.hash is already set on first render).
  //
  // IMPORTANT: this only depends on location.hash, not the whole location
  // object. The Shop filter bar updates the URL's query string (e.g.
  // ?category=Electronics) via setSearchParams, which changes location.search
  // but not location.hash — if this effect reacted to the whole location
  // object, every filter change would re-trigger it, see no hash present,
  // and scroll the page to the top (looking like an unwanted jump back to
  // the homepage). Depending on just the hash avoids that entirely, while
  // still firing correctly on mount and on real nav-link clicks.
  //
  // Several scroll attempts (not just one) because sections further down
  // the page sit below images that are still loading (Hero photo, About's
  // images, the Shop showcase slideshow) — a single early scroll can land
  // right, then get silently pushed off by the page growing as those finish.
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const delays = [50, 250, 600, 1200];
      const timers = delays.map((delay) =>
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, delay)
      );
      return () => timers.forEach(clearTimeout);
    } else {
      window.scrollTo({ top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  return (
    <main>
      <HeroSection />
      <ShopSection />
      <AboutSection />
      <FAQSection />
      <ContactSection />
    </main>
  );
}
