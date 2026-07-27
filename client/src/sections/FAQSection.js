import React, { useState } from 'react';
import Reveal from '../components/Reveal';

const FAQS = [
  {
    q: 'How long does shipping take?',
    a: 'Most orders dispatch within 24 hours and arrive in 3-7 business days depending on your location.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major cards via Stripe. Your card details are never seen or stored by us — Stripe handles the entire payment securely.',
  },
  {
    q: 'Can I return a product?',
    a: 'Yes, unused items in original packaging can be returned within 30 days. Contact us to start a return.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'We currently ship to over 40 countries. Shipping cost and time are calculated at checkout.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Delete my account in the footer. This permanently removes your login and personal profile.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-body font-medium text-ink">{q}</span>
        <span className={`text-accent-500 text-xl transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="text-ink/60 mt-3 text-sm leading-relaxed max-w-2xl">{a}</p>}
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="scroll-mt-28 max-w-3xl mx-auto px-4 md:px-8 pt-24">
      <Reveal>
        <p className="text-accent-500 text-sm font-medium mb-3">— Support</p>
        <h2 className="font-display font-bold text-4xl tracking-tight mb-10">Frequently asked questions</h2>
        <div>
          {FAQS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
