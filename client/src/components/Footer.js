import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck } from 'lucide-react';
import ApertureMark from './ApertureMark';

export default function Footer() {
  return (
    <footer className="bg-ink mt-24 text-white/60">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
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

        {/* Location — replace with your real business address */}
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-2 text-white">
            <MapPin size={16} />
            <span className="font-medium">Visit us</span>
          </div>
          <address className="not-italic leading-relaxed">
            123 Market Street<br />
            Colombo 03<br />
            Sri Lanka
          </address>
          <Link to="/#contact" className="inline-block mt-2 hover:text-white">Contact us</Link>
        </div>

        {/* Payment methods — named as text, not reproduced logo artwork (those are trademarked) */}
        <div className="text-sm">
          <div className="flex items-center gap-2 mb-2 text-white">
            <ShieldCheck size={16} />
            <span className="font-medium">Secure checkout</span>
          </div>
          <p className="leading-relaxed mb-2">We accept Visa, Mastercard, and American Express.</p>
          <p className="text-xs text-white/40">Payments processed securely by Stripe. We never see or store your card details.</p>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs py-4">
        © {new Date().getFullYear()} Aperture Goods
      </div>
    </footer>
  );
}
