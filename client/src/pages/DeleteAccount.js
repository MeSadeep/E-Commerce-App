import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useApi } from '../api/client';

export default function DeleteAccount() {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { authedRequest } = useApi();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const btnPrimary = 'bg-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50';

  if (!isAuthenticated) {
    return (
      <main className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display font-bold text-3xl tracking-tight mb-4">Delete my account</h1>
        <p className="text-ink/60 mb-6">Log in first to delete your account.</p>
        <button className={btnPrimary} onClick={() => loginWithRedirect()}>Log in</button>
      </main>
    );
  }

  if (done) {
    return (
      <main className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display font-bold text-3xl tracking-tight mb-4">Account deleted</h1>
        <p className="text-ink/60">Your account and personal data have been removed.</p>
      </main>
    );
  }

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await authedRequest({ method: 'delete', url: '/api/account' });
      setDone(true);
      setTimeout(() => logout({ logoutParams: { returnTo: window.location.origin } }), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account. Please try again or contact support.');
      setLoading(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display font-bold text-3xl tracking-tight mb-4">Delete my account</h1>
      <p className="text-ink/60 mb-6">
        This permanently deletes your login and personal profile. Your past orders are kept
        for tax/accounting purposes, but are no longer linked to your identity.
      </p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {!confirming ? (
        <button className={btnPrimary} onClick={() => setConfirming(true)}>Delete my account</button>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Are you sure? This can't be undone.</p>
          <div className="flex items-center justify-center gap-4">
            <button className={btnPrimary} onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Yes, permanently delete'}
            </button>
            <button className="text-ink/50 text-sm hover:underline" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
