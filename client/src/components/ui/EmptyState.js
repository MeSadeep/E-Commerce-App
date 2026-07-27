import React from 'react';

/**
 * Props:
 * - icon: ReactNode          — typically a lucide-react icon, rendered large and muted
 * - title: string            — required, e.g. "Your cart is empty"
 * - description: string      — optional supporting line
 * - action: ReactNode        — optional, typically a <Button> (e.g. "Browse products")
 *
 * Use this for: empty cart, no search results, no orders yet, empty admin
 * tables — anywhere the "correct" state is genuinely "there's nothing here,"
 * not an error. Keeping this visually distinct from ErrorState matters: an
 * empty cart isn't a problem, a failed fetch is.
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      {icon && (
        <div className="text-ink/25 mb-4" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-display font-bold text-lg text-ink mb-1">{title}</h3>
      {description && <p className="text-ink/50 text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
