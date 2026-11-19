import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]); // full product objects, newest first
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/wishlist');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isSaved = (productId) => items.some(p => p.id === productId);

  /** Add or remove; sends guests to the login page. Optimistic, rolls back on error. */
  const toggle = async (product) => {
    if (!user) { navigate('/login'); return; }
    const saved = isSaved(product.id);
    const previous = items;
    setItems(saved ? items.filter(p => p.id !== product.id) : [product, ...items]);
    try {
      if (saved) await api.delete(`/api/wishlist/${product.id}`);
      else await api.post(`/api/wishlist/${product.id}`);
    } catch {
      setItems(previous);
    }
  };

  return (
    <WishlistContext.Provider value={{ items, loading, isSaved, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
