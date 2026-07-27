import React from 'react';

export default function AdminSettings() {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl tracking-tight mb-6">Settings</h1>
      <div className="bg-white rounded-2xl border border-line p-6 max-w-lg space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Low-stock alert threshold</p>
          <p className="text-ink/50 text-sm">
            Controlled by <code className="bg-accent-50 px-1.5 py-0.5 rounded">LOW_STOCK_THRESHOLD</code> in
            the backend's <code className="bg-accent-50 px-1.5 py-0.5 rounded">.env</code> file — not editable
            from here yet.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Currency</p>
          <p className="text-ink/50 text-sm">Set per-product when adding a product — no store-wide default yet.</p>
        </div>
      </div>
      <p className="text-ink/40 text-xs mt-4 max-w-lg">
        This page is a placeholder. Add real settings here as the store needs them —
        e.g. store name, default currency, notification preferences.
      </p>
    </div>
  );
}
