import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

/**
 * Usage:
 *   1. Wrap the app once: <ToastProvider><App /></ToastProvider>
 *   2. Anywhere inside: const toast = useToast();
 *      toast.success('Product added to cart');
 *      toast.error('Checkout failed — please try again');
 *      toast.info('Copied to clipboard');
 *
 * Accessibility:
 * - The toast stack is an aria-live="polite" region, so screen readers
 *   announce new toasts without interrupting whatever the user is doing.
 *   Errors use aria-live="assertive" (via role="alert" on that toast) since
 *   those matter more urgently.
 * - Each toast has a real close button, not just an auto-dismiss timer —
 *   someone using a screen reader may need longer than the timeout to
 *   finish hearing it.
 *
 * Mobile: full-width stacked at the bottom on small screens; a corner stack
 * on larger screens.
 */
const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={20} className="text-emerald-600" />,
  error: <XCircle size={20} className="text-red-600" />,
  info: <Info size={20} className="text-accent-600" />,
};

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const reduce = useReducedMotion();

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant, message, duration = DEFAULT_DURATION) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, variant, message }]);
      if (duration) setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const toast = {
    success: (msg, duration) => push('success', msg, duration),
    error: (msg, duration) => push('error', msg, duration),
    info: (msg, duration) => push('info', msg, duration),
    dismiss: remove,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto z-50 flex flex-col gap-2 p-4 sm:p-0 sm:w-80"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                role={t.variant === 'error' ? 'alert' : 'status'}
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-line rounded-xl shadow-lg p-4 flex items-start gap-3"
              >
                <span aria-hidden="true">{ICONS[t.variant]}</span>
                <p className="text-sm text-ink flex-1">{t.message}</p>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss notification"
                  className="text-ink/30 hover:text-ink shrink-0"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
