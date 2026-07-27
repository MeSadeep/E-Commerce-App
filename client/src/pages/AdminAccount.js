import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AdminAccount() {
  const { user } = useAuth0();

  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-6">Account</h1>
      <div className="bg-white rounded-2xl border border-line p-6 max-w-lg flex items-center gap-4">
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent-100" />
        )}
        <div>
          <div className="font-medium text-lg">{user?.name}</div>
          <div className="text-ink/50 text-sm">{user?.email}</div>
        </div>
      </div>
      <p className="text-ink/40 text-xs mt-4 max-w-lg">
        Profile fields (name, picture) are managed by Auth0 — to let admins edit them here,
        wire this page to Auth0's Management API's Update User endpoint.
      </p>
    </div>
  );
}
