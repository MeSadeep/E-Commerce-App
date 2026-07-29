import React from 'react';
import ApertureMark from '../components/ApertureMark';
import Reveal from '../components/Reveal';

const STATS = [
  { value: '150k+', label: 'Orders shipped' },
  { value: '4.9/5', label: 'Average rating' },
  { value: '40+', label: 'Countries served' },
  { value: '24h', label: 'Dispatch time' },
];

export default function AboutSection() {
  return (
    <section id="about" className="scroll-mt-28 max-w-6xl mx-auto px-4 md:px-8 pt-24">
      <Reveal>
        <p className="text-accent-500 text-sm font-medium mb-3">— About us</p>
        <h2 className="font-display font-bold text-3xl md:text-4xl leading-tight tracking-tight mb-4 max-w-2xl">
          Designed for Every Moment.
        </h2>
        <p className="text-ink/60 max-w-2xl mb-4">
          An aperture is a modern fashion brand dedicated to creating timeless apparel for everyday living.
          We combine premium fabrics, contemporary designs, and exceptional craftsmanship to deliver clothing 
          that feels as good as it looks.
        </p>
        <p className="text-ink/60 max-w-2xl mb-12">
          Whether you're dressing for work, travel, or weekends, our collections are thoughtfully designed to 
          help you express your personal style with confidence.
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <Reveal delay={0.1}>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="rounded-2xl border border-line p-5">
              <ApertureMark size={26} />
              <h3 className="font-display font-bold text-sm mt-3 mb-1">Material-first</h3>
              <p className="text-ink/60 text-xs">Chosen for what it's made of, not just how it photographs.</p>
            </div>
            <div className="rounded-2xl border border-line p-5">
              <ApertureMark size={26} />
              <h3 className="font-display font-bold text-sm mt-3 mb-1">Tested in hand</h3>
              <p className="text-ink/60 text-xs">We keep what survives daily use, and send the rest back.</p>
            </div>
            <div className="rounded-2xl border border-line p-5">
              <ApertureMark size={26} />
              <h3 className="font-display font-bold text-sm mt-3 mb-1">Built to last</h3>
              <p className="text-ink/60 text-xs">We'd rather sell you one good thing than five average ones.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-accent-500 font-display font-bold text-3xl">{s.value}</div>
                <div className="text-ink/50 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2} className="grid grid-cols-2 gap-4">
          <img
            src="https://picsum.photos/seed/aperture-about-1/500/650"
            alt=""
            className="rounded-2xl w-full h-full object-cover col-span-1 row-span-2"
          />
          <img
            src="https://picsum.photos/seed/aperture-about-2/500/300"
            alt=""
            className="rounded-2xl w-full h-40 object-cover"
          />
          <div className="rounded-2xl bg-accent-50 flex items-center justify-center h-40">
            <ApertureMark size={56} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
