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
  // Why several attempts instead of one: sections further down the page
  // (About, FAQ, Contact) sit below images that are still loading (the Hero
  // photo, About's images, the Shop showcase slideshow's fetched photos).
  // A single scroll fired too early lands at the right position for that
  // instant, then the page keeps growing as images finish loading, silently
  // shifting the target section further down — leaving the navbar
  // overlapping mid-content instead of sitting cleanly above the section.
  // Re-issuing the same scroll a few times over ~1.2s corrects for that
  // without needing a more complex ResizeObserver/MutationObserver setup.
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
  }, [location]);

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