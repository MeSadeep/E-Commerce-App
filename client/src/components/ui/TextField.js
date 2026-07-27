import React, { useId } from 'react';

/**
 * Props:
 * - label: string (required — this component won't render an unlabeled input)
 * - error: string            — validation error message; sets aria-invalid + aria-describedby
 * - helperText: string       — shown when there's no error
 * - required: boolean
 * - id: string                (optional — auto-generated via useId if omitted, so label/input/error always link correctly)
 * - as: 'input' | 'textarea'  (default 'input')
 * - className: string        — applied to the input/textarea itself, not the wrapper
 * - ...rest — spread onto the input/textarea (type, value, onChange, placeholder, rows, inputMode, etc.)
 *
 * Accessibility:
 * - <label htmlFor> is always wired to the input's id, generated automatically
 *   with useId if you don't pass one — you can't accidentally ship an
 *   unlabeled field with this component.
 * - Error and helper text are connected via aria-describedby so screen
 *   readers announce them when the field receives focus.
 * - aria-invalid + aria-required reflect actual state, not just visual styling.
 */
export default function TextField({
  label,
  error,
  helperText,
  required = false,
  id,
  as = 'input',
  className = '',
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const Tag = as;

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && (
          <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>
        )}
      </label>
      <Tag
        id={fieldId}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-white transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          error
            ? 'border-red-400 focus:ring-red-500/40'
            : 'border-line focus:border-accent-500 focus:ring-accent-500/30',
          className,
        ].join(' ')}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-xs mt-1.5">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-ink/50 text-xs mt-1.5">
          {helperText}
        </p>
      )}
    </div>
  );
}
