import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

/**
 * Props:
 * - title: string          (default "Something went wrong")
 * - description: string    — optional, e.g. the actual error message or a friendlier explanation
 * - onRetry: function      — optional; if provided, renders a "Try again" button
 *
 * Use this for: failed API calls, network errors, anything where the fix is
 * "try the request again." role="alert" ensures screen readers announce it
 * immediately when it appears, without the user needing to navigate to it.
 */
export default function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center text-center py-16 px-4">
      <div className="text-red-500 mb-4" aria-hidden="true">
        <AlertTriangle size={40} strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-bold text-lg text-ink mb-1">{title}</h3>
      {description && <p className="text-ink/50 text-sm max-w-sm mb-6">{description}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
