import { Link, Navigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading } = useWishlist();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="page container">
      <h1 className="page-title" style={{ marginBottom: 8 }}>Wishlist</h1>
      <p className="text-muted" style={{ marginBottom: 32 }}>
        {loading ? 'Loading…' : `${items.length} saved ${items.length === 1 ? 'item' : 'items'}`}
      </p>

      {!loading && items.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '80px 0' }}>
          <Heart size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Nothing saved yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tap the heart on any product to keep it here for later.</p>
          <Link to="/shop" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <div className="product-grid">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
