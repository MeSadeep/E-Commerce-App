import React, { useState } from 'react';
import Reveal from '../components/Reveal';

export default function ContactSection() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // No backend endpoint wired up yet — this is a UI placeholder.
    // Wire this to a real email/support endpoint before relying on it.
    setSent(true);
  };

  return (
    <section id="contact" className="scroll-mt-28 max-w-2xl mx-auto px-4 md:px-8 pt-24 pb-24">
      <Reveal>
        <p className="text-accent-500 text-sm font-medium mb-3">— Get in touch</p>
        <h2 className="font-display font-bold text-4xl tracking-tight mb-10">Contact us</h2>

        {sent ? (
          <p className="text-ink/70">Thanks — we'll get back to you soon.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              placeholder="Your name"
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-500"
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-500"
            />
            <textarea
              required
              placeholder="Message"
              rows={5}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-500"
            />
            <button
              type="submit"
              className="bg-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              Send message
            </button>
          </form>
        )}
      </Reveal>
    </section>
  );
}
