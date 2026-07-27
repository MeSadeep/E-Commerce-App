import React from 'react';

export default function TermsOfService() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-20 [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:mb-6 [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:text-ink/60 [&_p]:leading-relaxed">
      <h1>Terms of Service</h1>
      <p><em>Replace this placeholder with real terms reviewed by a lawyer before launch — this is a starting structure, not legal advice.</em></p>

      <h3>Orders and payment</h3>
      <p>All prices are shown in the listed currency. Payment is processed securely by Stripe. Orders are confirmed once payment is verified.</p>

      <h3>Returns and refunds</h3>
      <p>Describe your actual return window and refund process here.</p>

      <h3>Account termination</h3>
      <p>We may suspend accounts that violate these terms. You may delete your account at any time.</p>

      <h3>Limitation of liability</h3>
      <p>Standard liability limitation language goes here — have a lawyer draft this for your jurisdiction.</p>
    </main>
  );
}
