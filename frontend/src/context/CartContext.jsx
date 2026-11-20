import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const GUEST_KEY = 'coreman-guest-cart'; // [{ variantId, quantity }] for shoppers without an account
const EMPTY = { items: [], subtotal: 0, totalItems: 0 };

function readGuest() {
  try { const v = JSON.parse(localStorage.getItem(GUEST_KEY)); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeGuest(lines) {
  try { lines.length ? localStorage.setItem(GUEST_KEY, JSON.stringify(lines)) : localStorage.removeItem(GUEST_KEY); } catch { /* storage unavailable */ }
}

/**
 * Signed-in shoppers: cart stored on the server.
 * Guests: cart lines kept in the browser; names/prices/stock come from /api/guest/cart/preview.
 * When a guest signs in, their browser cart is moved into their account cart.
 * In guest mode item.id is the variant id.
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY);
  const { user, loading } = useAuth();
  const merging = useRef(false);

  const previewGuest = useCallback(async (lines) => {
    if (!lines.length) { setCart(EMPTY); return EMPTY; }
    const { data } = await api.post('/api/guest/cart/preview', { items: lines });
    // Keep only lines that still exist, with quantities capped to stock.
    writeGuest(data.items.filter(i => i.quantity > 0).map(i => ({ variantId: i.variantId, quantity: i.quantity })));
    setCart(data);
    return data;
  }, []);

  const fetchCart = useCallback(async () => {
    if (user) {
      try { const { data } = await api.get('/api/cart'); setCart(data); } catch { /* ignore */ }
    } else {
      try { await previewGuest(readGuest()); } catch { /* ignore */ }
    }
  }, [user, previewGuest]);

  // Load the right cart when auth settles; on sign-in, move the guest cart into the account.
  useEffect(() => {
    if (loading) return;
    if (!user) { fetchCart(); return; }
    const lines = readGuest();
    if (!lines.length || merging.current) { fetchCart(); return; }
    merging.current = true;
    (async () => {
      for (const l of lines) {
        try { await api.post('/api/cart/items', { variantId: l.variantId, quantity: l.quantity }); } catch { /* out of stock etc. */ }
      }
      writeGuest([]);
      merging.current = false;
      fetchCart();
    })();
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToCart = async (variantId, quantity = 1) => {
    if (user) {
      const { data } = await api.post('/api/cart/items', { variantId, quantity });
      setCart(data);
      return;
    }
    const lines = readGuest();
    const existing = lines.find(l => l.variantId === variantId);
    const before = existing ? existing.quantity : 0;
    if (existing) existing.quantity += quantity; else lines.unshift({ variantId, quantity });
    const data = await previewGuest(lines);
    const after = data.items.find(i => i.variantId === variantId)?.quantity ?? 0;
    if (after < before + quantity) throw new Error('Not enough stock for that quantity.');
  };

  const updateQuantity = async (itemId, quantity) => {
    if (user) {
      const { data } = await api.put(`/api/cart/items/${itemId}`, { quantity });
      setCart(data);
      return;
    }
    const lines = readGuest().map(l => (l.variantId === itemId ? { ...l, quantity } : l)).filter(l => l.quantity > 0);
    await previewGuest(lines);
  };

  const removeItem = async (itemId) => {
    if (user) {
      await api.delete(`/api/cart/items/${itemId}`);
      setCart(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
        totalItems: prev.totalItems - (prev.items.find(i => i.id === itemId)?.quantity || 0),
      }));
      return;
    }
    await previewGuest(readGuest().filter(l => l.variantId !== itemId));
  };

  const clearCart = async () => {
    if (user) await api.delete('/api/cart');
    else writeGuest([]);
    setCart(EMPTY);
  };

  /** Lines to send with a guest order. */
  const guestLines = () => readGuest();

  return (
    <CartContext.Provider value={{ cart, fetchCart, addToCart, updateQuantity, removeItem, clearCart, guestLines, isGuest: !user }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
