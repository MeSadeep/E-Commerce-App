import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const ROLE_CLAIM = 'https://aperturegoods.com/roles';

// Wrap any admin-only page with this. It checks the SAME custom claim the
// backend checks (see server/middleware/requireRole.js) — but remember this
// is a UI convenience only. The backend's RBAC check is what actually
// protects the data; hiding a button here doesn't stop a direct API call,
// which is why the backend re-checks the role on every admin request too.
export default function RequireAdmin({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) return <p className="max-w-2xl mx-auto px-4 py-16 text-ink/50">Checking permissions…</p>;

  const roles = (user?.[ROLE_CLAIM] || []).map((r) => r.trim());
  if (!isAuthenticated || !roles.includes('admin')) {
    return <p className="max-w-2xl mx-auto px-4 py-16 text-red-600">You don't have access to this page.</p>;
  }

  return children;
}
