import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Props:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger'   (default 'primary')
 * - size: 'sm' | 'md' | 'lg'                                (default 'md')
 * - loading: boolean       — shows a spinner, disables interaction, keeps width stable
 * - disabled: boolean
 * - icon: ReactNode        — optional leading/trailing icon
 * - iconPosition: 'left' | 'right'                          (default 'left')
 * - iconOnly: boolean      — true if this button has NO visible text (forces aria-label to be required)
 * - fullWidth: boolean
 * - as: 'button' | any React component (e.g. react-router's Link) — polymorphic rendering
 * - children: button label
 * - ...rest — spread onto the underlying element (onClick, type, href, aria-*, etc.)
 *
 * Accessibility:
 * - Real <button> by default (or whatever `as` renders, e.g. an <a>/<Link>) — no <div onClick>.
 * - Loading state sets aria-busy and disables the control, but keeps the label
 *   in the DOM for screen readers (spinner is aria-hidden, not a text replacement).
 * - iconOnly buttons require aria-label — this throws a dev-time console warning
 *   if you forget, rather than shipping an unlabeled icon button.
 * - Minimum 44px touch target on all sizes (mobile tap-target guidance).
 */
const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink/90 focus-visible:ring-ink/50',
  secondary: 'bg-white text-ink border border-line hover:bg-accent-50 focus-visible:ring-accent-500/50',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 focus-visible:ring-ink/30',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/50',
};

const SIZES = {
  sm: 'text-xs px-3 py-2 gap-1.5 min-h-[36px]',
  md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
  lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  iconOnly = false,
  fullWidth = false,
  as: Component = 'button',
  className = '',
  children,
  'aria-label': ariaLabel,
  ...rest
}) {
  if (process.env.NODE_ENV !== 'production' && iconOnly && !ariaLabel) {
    console.warn('Button: iconOnly buttons must have an aria-label for screen reader users.');
  }

  const isDisabled = disabled || loading;

  return (
    <Component
      className={[
        'inline-flex items-center justify-center rounded-full font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={Component !== 'button' ? isDisabled : undefined}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {!loading && icon && iconPosition === 'left' && <span aria-hidden="true">{icon}</span>}
      {!iconOnly && children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span aria-hidden="true">{icon}</span>}
    </Component>
  );
}
