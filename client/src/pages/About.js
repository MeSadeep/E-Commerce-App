import React from 'react';
import ApertureMark from '../components/ApertureMark';

export default function About() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-20">
      <p className="text-brass-500 text-sm font-medium mb-3">— About Aperture</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight leading-tight mb-8">
        We name things after the part that lets the light in.
      </h1>
      <p className="text-ink/60 text-lg leading-relaxed mb-6 max-w-2xl">
        An aperture is the opening that controls exactly how much light reaches
        the lens — too little and detail disappears into shadow, too much and
        it washes out. That's the standard we hold every product to: precise,
        deliberate, nothing left to chance.
      </p>
      <p className="text-ink/60 text-lg leading-relaxed mb-16 max-w-2xl">
        We're a small team who got tired of goods that looked good in photos
        and fell apart in your hands. Everything in the catalog is tested for
        materials, tolerances, and how it holds up after the hundredth use,
        not just the first.
      </p>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="rounded-2xl border border-line p-6">
          <ApertureMark size={32} />
          <h3 className="font-display font-bold text-lg mt-4 mb-2">Material-first</h3>
          <p className="text-ink/60 text-sm">Every product is chosen for what it's made of, not just what it looks like.</p>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <ApertureMark size={32} />
          <h3 className="font-display font-bold text-lg mt-4 mb-2">Tested in hand</h3>
          <p className="text-ink/60 text-sm">We keep what survives real daily use, and send the rest back.</p>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <ApertureMark size={32} />
          <h3 className="font-display font-bold text-lg mt-4 mb-2">Built to last</h3>
          <p className="text-ink/60 text-sm">No planned obsolescence — we'd rather sell you one good thing.</p>
        </div>
      </div>

      <img
        src="https://picsum.photos/seed/aperture-about-page/1200/500"
        alt=""
        className="rounded-2xl w-full h-72 object-cover"
      />
    </main>
  );
}
