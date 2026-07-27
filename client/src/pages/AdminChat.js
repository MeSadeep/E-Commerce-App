import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function AdminChat() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <MessageSquare size={40} className="text-accent-500 mb-4" />
      <h1 className="font-display font-bold text-xl mb-2">Chat isn't set up yet</h1>
      <p className="text-ink/50 max-w-sm text-sm">
        There's no messaging backend in this project. To add real customer chat, integrate
        a service like Intercom, Crisp, or a custom WebSocket-based inbox.
      </p>
    </div>
  );
}
