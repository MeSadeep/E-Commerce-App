import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const CartContext = createContext(null);

// Keep each account's browser cart separate. This is convenience storage;
// checkout must still look up product prices and availability on the server.
function storageKeyFor(isAuthenticated, user) {
  return isAuthenticated && user?.sub ? `cart:${user.sub}` : 'cart:guest';
}

export function CartProvider({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const storageKey = storageKeyFor(isAuthenticated, user);
  const [cart, setCart] = useState({ key: null, items: [] });
  const items = !isLoading && cart.key === storageKey ? cart.items : [];

  // Load the active identity before allowing its cart to be persisted. Keeping
  // the key alongside items also prevents a previous account's cart flashing
  // on screen while Auth0 switches identities.
  useEffect(() => {
    if (isLoading) return;
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setCart({ key: storageKey, items: Array.isArray(parsed) ? parsed : [] });
    } catch {
      setCart({ key: storageKey, items: [] });
    }
  }, [storageKey, isLoading]);

  useEffect(() => {
    if (isLoading || cart.key !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart.items));
    } catch {
      // Cart remains usable in memory if browser storage is unavailable.
    }
  }, [cart, storageKey, isLoading]);

  const updateCart = (change) => {
    if (isLoading || cart.key !== storageKey) return;
    setCart((current) => current.key === storageKey
      ? { key: storageKey, items: change(current.items) }
      : current);
  };

  const addItem = (product, quantity = 1) => {
    updateCart((prev) => {
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
    updateCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    updateCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  };

  const clearCart = useCallback(() => {
    if (isLoading || cart.key !== storageKey) return;
    // Logout can switch identities before React's persistence effect runs.
    // Remove the current user's saved cart synchronously first.
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // The in-memory cart is still cleared.
    }
    setCart({ key: storageKey, items: [] });
  }, [isLoading, cart.key, storageKey]);

  const totalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cartReady: !isLoading && cart.key === storageKey, cartIdentity: storageKey, items, addItem, removeItem, updateQuantity, clearCart, totalCents }}
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
