import React from 'react';

export default function PrivacyPolicy() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-20 [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:mb-6 [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:text-ink/60 [&_p]:leading-relaxed">
      <h1>Privacy Policy</h1>
      <p><em>Replace this placeholder with real copy reviewed by a lawyer before launch — this is a starting structure, not legal advice.</em></p>

      <h3>What we collect</h3>
      <p>Account information (name, email) via Auth0 when you sign up or log in. Order history and totals when you make a purchase. We never see or store your raw card number — that goes directly to Stripe.</p>

      <h3>How we use it</h3>
      <p>To process orders, provide customer support, and improve the store. We do not sell your personal data to third parties.</p>

      <h3>Your rights</h3>
      <p>You can request deletion of your account and personal data at any time from your account settings, or by contacting us directly.</p>

      <h3>Third parties we share data with</h3>
      <p>Auth0 (authentication), Stripe (payment processing). Each has its own privacy policy governing how they handle your data.</p>

      <h3>Contact</h3>
      <p>Questions about this policy: replace-with-your-real-support-email@example.com</p>
    </main>
  );
}
