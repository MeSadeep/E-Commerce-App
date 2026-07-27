import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const CartContext = createContext(null);

// Each identity gets its own storage bucket: 'cart:guest' for a not-logged-in
// browser, 'cart:<auth0-user-id>' per logged-in user. This is the actual fix
// for a real bug — a customer could add items, then log in as a completely
// different account (no logout in between, so nothing ever triggered a
// clear), and the previous person's cart would still be sitting there. A
// single shared 'cart' key can never be safe on a browser more than one
// identity ever touches; scoping the key itself is what fixes it at the root.
function storageKeyFor(isAuthenticated, user) {
  return isAuthenticated && user?.sub ? `cart:${user.sub}` : 'cart:guest';
}

export function CartProvider({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const storageKey = storageKeyFor(isAuthenticated, user);
  const [items, setItems] = useState([]);

  // Reload from the correct bucket whenever the active identity changes —
  // this fires on login, logout, and switching to a different account.
  // Waits for Auth0 to finish resolving (isLoading) so we don't briefly read
  // the guest bucket before Auth0 tells us someone's actually logged in.
  useEffect(() => {
    if (isLoading) return;
    try {
      const saved = localStorage.getItem(storageKey);
      setItems(saved ? JSON.parse(saved) : []);
    } catch {
      setItems([]);
    }
  }, [storageKey, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey, isLoading]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price_cents: product.price_cents,
          currency: product.currency,
          quantity,
        },
      ];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  const totalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalCents }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
