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
  useEffect(() => {
    if (location.hash) {
      // Small delay lets the section actually be in the DOM before we
      // measure its position — matters most on first mount from another route.
      const id = location.hash.slice(1);
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return () => clearTimeout(timer);
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
