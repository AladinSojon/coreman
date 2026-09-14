import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const primaryImage = product.images?.find(i => i.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl
    || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';

  const colors = [...new Set(product.variants?.map(v => v.colorHex))];

  return (
    <Link to={`/product/${product.slug}`} className="product-card card">
      <div className="product-card-image">
        <img src={primaryImage} alt={product.name} loading="lazy" />
        {product.isFeatured && <span className="badge badge-accent product-badge">Featured</span>}
        <button className="product-wishlist" onClick={e => { e.preventDefault(); }}>
          <Heart size={18} />
        </button>
      </div>
      <div className="product-card-info">
        <p className="product-card-brand">{product.brand}</p>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-meta">
          <span className="product-card-price">${product.basePrice?.toFixed(2)}</span>
          {product.averageRating && (
            <span className="product-card-rating"><Star size={14} fill="var(--accent)" stroke="var(--accent)" /> {product.averageRating}</span>
          )}
        </div>
        {colors.length > 0 && (
          <div className="product-card-colors">
            {colors.slice(0, 5).map(hex => <span key={hex} className="color-dot" style={{ background: hex }} />)}
          </div>
        )}
      </div>
    </Link>
  );
}
