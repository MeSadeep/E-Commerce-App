import React from 'react';
import { Link } from 'react-router-dom';
import ApertureMark from './ApertureMark';

export default function Footer() {
  return (
    <footer className="bg-ink mt-24 text-white/60">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ApertureMark size={22} />
            <span className="font-display font-bold text-white">APERTURE</span>
          </div>
          <p className="text-sm max-w-xs">Precision-made goods for people who notice the details.</p>
        </div>

        <div className="text-sm space-y-2">
          <Link to="/privacy" className="block hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="block hover:text-white">Terms of Service</Link>
          <Link to="/delete-account" className="block hover:text-white">Delete my account</Link>
        </div>

        <div className="text-sm space-y-3">
          <Link to="/#contact" className="block hover:text-white">Contact</Link>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs py-4">
        © {new Date().getFullYear()} Aperture Goods
      </div>
    </footer>
  );
}
