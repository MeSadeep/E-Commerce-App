import React from 'react';
import { Mail } from 'lucide-react';

export default function AdminEmail() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <Mail size={40} className="text-accent-500 mb-4" />
      <h1 className="font-display font-bold text-xl mb-2">Email isn't set up yet</h1>
      <p className="text-ink/50 max-w-sm text-sm">
        There's no email-sending integration in this project (order confirmations, marketing
        campaigns, etc). Wire up a provider like Resend, SendGrid, or Postmark to enable this.
      </p>
    </div>
  );
}
