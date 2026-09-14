import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalItems: 0 });
  const { user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/api/cart');
      setCart(data);
    } catch { /* ignore if not logged in */ }
  }, [user]);

  const addToCart = async (variantId, quantity = 1) => {
    const { data } = await api.post('/api/cart/items', { variantId, quantity });
    setCart(data);
  };

  const updateQuantity = async (itemId, quantity) => {
    const { data } = await api.put(`/api/cart/items/${itemId}`, { quantity });
    setCart(data);
  };

  const removeItem = async (itemId) => {
    await api.delete(`/api/cart/items/${itemId}`);
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
      totalItems: prev.totalItems - (prev.items.find(i => i.id === itemId)?.quantity || 0)
    }));
  };

  const clearCart = async () => {
    await api.delete('/api/cart');
    setCart({ items: [], subtotal: 0, totalItems: 0 });
  };

  return (
    <CartContext.Provider value={{ cart, fetchCart, addToCart, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
