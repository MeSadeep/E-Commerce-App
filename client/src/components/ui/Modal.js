import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Props:
 * - isOpen: boolean
 * - onClose: function            — called on ESC, overlay click, or the X button
 * - title: string                — required; rendered as the accessible dialog heading
 * - children: ReactNode
 * - size: 'sm' | 'md' | 'lg'     (default 'md')
 * - closeOnOverlayClick: boolean (default true)
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby pointing at the title.
 * - Focus moves into the dialog on open, is trapped inside it (Tab/Shift+Tab
 *   cycle within the dialog, never escape to the page behind it), and
 *   returns to whatever triggered the modal when it closes.
 * - ESC closes it. Background scroll is locked while open so mobile users
 *   can't accidentally scroll the page behind the dialog.
 * - Renders via a portal so it's not visually/DOM-nested inside whatever
 *   component opened it (avoids z-index and overflow:hidden ancestor bugs).
 *
 * Mobile: full-screen sheet below the `sm` breakpoint, centered card above it.
 */
const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md', closeOnOverlayClick = true }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
    // Deliberately only [isOpen] here, NOT onClose — this effect's job is
    // "grab initial focus once when the dialog opens." If a parent passes a
    // new onClose function every render (very common — e.g. an inline arrow
    // function not wrapped in useCallback), including it here would re-run
    // this effect on every keystroke inside the dialog, which yanks focus
    // back to the first focusable element (the X button) every time. That
    // was a real bug, not a hypothetical one — typing in a field would snap
    // focus to the close button after the first character.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard handling (ESC + Tab trap) is safe to re-subscribe on every
  // onClose change — it only adds/removes an event listener, it never
  // moves focus on its own, so it can't cause the bug above.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      const focusable = dialog?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-ink/50"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`relative bg-white w-full ${SIZES[size]} rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-6`}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-title" className="font-display font-bold text-lg text-ink">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="text-ink/40 hover:text-ink p-1 rounded-full hover:bg-ink/5"
              >
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
