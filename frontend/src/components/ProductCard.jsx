import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice, isOnSale, discountPercent } from '../utils/price';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.id);

  const primaryImage = product.images?.find(i => i.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl
    || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';

  const colors = [...new Set(product.variants?.map(v => v.colorHex).filter(Boolean))];
  const onSale = isOnSale(product);

  return (
    <Link to={`/product/${product.slug}`} className="product-card card">
      <div className="product-card-image">
        <img src={primaryImage} alt={product.name} loading="lazy" />
        {onSale
          ? <span className="badge badge-accent product-badge">−{discountPercent(product)}%</span>
          : product.isNew
            ? <span className="badge badge-new product-badge">New</span>
            : product.isBestSeller && <span className="badge badge-ink product-badge">Best seller</span>}
        <button
          type="button"
          className={`product-wishlist ${saved ? 'saved' : ''}`}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(product); }}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-card-info">
        <p className="product-card-brand">{product.brand}</p>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-meta">
          <span className="product-card-price">
            <span className={onSale ? 'price-sale' : ''}>{formatPrice(product.basePrice)}</span>
            {onSale && <s className="price-was">{formatPrice(product.compareAtPrice)}</s>}
          </span>
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
