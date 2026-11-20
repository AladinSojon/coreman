import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Heart, Star, Minus, Plus, ChevronLeft, Zap } from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import ProductReviews from '../components/ProductReviews';
import { formatPrice, sortSizes } from '../utils/price';
import { useCountdown, shortLeft } from '../utils/campaigns';
import './ProductDetailPage.css';

/** "Black Friday Sale · ends in 2d 4h" above the price while a campaign sets it. */
function SaleStrip({ product }) {
  const left = useCountdown(product.saleEndsAt);
  if (!product.saleName || left.done) return null;
  return (
    <Link to={`/sale/${product.saleSlug}`} className="pdp-sale-strip">
      <strong>{product.saleName}</strong> · ends in <span className="tabular">{shortLeft(left)}</span>
    </Link>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isSaved, toggle: toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState('');

  // Index of the gallery photo for a colour (the variant's own picture), or -1 when there isn't one.
  const imageForColor = (p, color) => {
    const url = p.variants?.find(v => v.color === color && v.imageUrl)?.imageUrl;
    return url ? (p.images || []).findIndex(i => i.imageUrl === url) : -1;
  };

  const pickColor = (p, color) => {
    setSelectedColor(color);
    setSelectedSize(null);
    const i = imageForColor(p, color);
    if (i >= 0) setSelectedImage(i);
  };

  const loadProduct = (resetSelection) => api.get(`/api/products/${slug}`)
    .then(r => {
      setProduct(r.data);
      if (resetSelection && r.data.variants?.length) {
        // Start on the colour shown in the main photo, so the picture and the selection agree.
        const colors = [...new Set(r.data.variants.map(v => v.color))];
        const mainUrl = r.data.images?.[0]?.imageUrl;
        const first = colors.find(c => r.data.variants.some(v => v.color === c && v.imageUrl === mainUrl)) || colors[0];
        setSelectedImage(0);
        pickColor(r.data, first);
        setQuantity(1);
      }
    });

  useEffect(() => {
    loadProduct(true).catch(() => navigate('/shop'));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) return <div className="page container"><div className="skeleton" style={{ height: '60vh' }} /></div>;

  const colors = [...new Set(product.variants?.map(v => v.color))];
  const colorHexMap = Object.fromEntries(product.variants?.map(v => [v.color, v.colorHex]) || []);
  const sizes = sortSizes([...new Set(product.variants?.filter(v => v.color === selectedColor).map(v => v.size))]);
  const selectedVariant = product.variants?.find(v => v.color === selectedColor && v.size === selectedSize);
  const price = Number(selectedVariant?.price || product.basePrice);
  const wasPrice = product.compareAtPrice != null && Number(product.compareAtPrice) > price ? Number(product.compareAtPrice) : null;
  const saved = isSaved(product.id);

  // No account needed: guests get a browser cart and check out with name + phone + address.
  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true); setCartError('');
    try { await addToCart(selectedVariant.id, quantity); }
    catch (e) { setCartError(e.response?.data?.message || e.message || 'Could not add to cart.'); setAdding(false); return; }
    setTimeout(() => setAdding(false), 1000);
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;
    setAdding(true); setCartError('');
    try {
      await addToCart(selectedVariant.id, quantity);
      navigate('/checkout');
    } catch (e) { setCartError(e.response?.data?.message || e.message || 'Could not add to cart.'); }
    setAdding(false);
  };

  return (
    <div className="page container">
      <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /> Back</button>
      <div className="pdp-layout">
        <div className="pdp-gallery">
          <div className="pdp-main-image">
            <img src={product.images?.[selectedImage]?.imageUrl} alt={product.name} />
          </div>
          {product.images?.length > 1 && (
            <div className="pdp-thumbs">
              {product.images.map((img, i) => (
                <button key={i} className={`pdp-thumb ${i === selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(i)}>
                  <img src={img.imageUrl} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pdp-info">
          <span className="product-card-brand">{product.brand}</span>
          <h1 className="pdp-name">{product.name}</h1>

          <a href="#reviews" className="pdp-rating">
            {product.averageRating ? (
              <>
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < Math.round(product.averageRating) ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" />)}
                <span>{product.averageRating} · {product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'}</span>
              </>
            ) : <span>No reviews yet</span>}
          </a>

          <SaleStrip product={product} />
          <p className="pdp-price">
            <span className={wasPrice ? 'price-sale' : ''}>{formatPrice(price)}</span>
            {wasPrice && (
              <>
                <s className="pdp-was">{formatPrice(wasPrice)}</s>
                <span className="badge badge-accent">Save {Math.round((1 - price / wasPrice) * 100)}%</span>
              </>
            )}
          </p>
          <p className="pdp-description">{product.description}</p>

          {/* Color picker */}
          {colors.length > 0 && (
            <div className="pdp-option">
              <label>Color: <strong>{selectedColor}</strong></label>
              <div className="pdp-colors">
                {colors.map(c => (
                  <button key={c} className={`color-swatch ${c === selectedColor ? 'active' : ''}`}
                    style={{ background: colorHexMap[c] }} onClick={() => pickColor(product, c)} aria-label={c} title={c} />
                ))}
              </div>
            </div>
          )}

          {/* Size picker */}
          {sizes.length > 0 && (
            <div className="pdp-option">
              <label>Size:</label>
              <div className="pdp-sizes">
                {sizes.map(s => {
                  const v = product.variants.find(v => v.color === selectedColor && v.size === s);
                  const oos = v?.stockQuantity === 0;
                  return (
                    <button key={s} className={`size-btn ${s === selectedSize ? 'active' : ''} ${oos ? 'oos' : ''}`}
                      disabled={oos} onClick={() => setSelectedSize(s)}>{s}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="pdp-option">
            <label>Quantity:</label>
            <div className="pdp-quantity">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus size={16} /></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}><Plus size={16} /></button>
            </div>
          </div>

          {/* Actions */}
          <div className="pdp-actions">
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleAddToCart}
              disabled={!selectedSize || adding}>
              <ShoppingBag size={18} />
              {adding ? 'Added!' : 'Add to Cart'}
            </button>
            <button className="btn btn-buy-now btn-lg" style={{ flex: 1 }} onClick={handleBuyNow}
              disabled={!selectedSize || adding}>
              <Zap size={18} />
              Buy Now
            </button>
            <button className={`btn btn-secondary btn-lg pdp-wishlist ${saved ? 'saved' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved}>
              <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          {selectedVariant && selectedVariant.stockQuantity <= 5 && selectedVariant.stockQuantity > 0 && (
            <p className="stock-warning">Only {selectedVariant.stockQuantity} left in stock!</p>
          )}
          {cartError && <p className="stock-warning" role="alert">{cartError}</p>}

          <ul className="pdp-perks">
            <li>Cash on Delivery available</li>
            <li>Free shipping on orders over ৳2,000</li>
            <li><Link to="/pages/returns">Easy returns &amp; exchanges</Link></li>
          </ul>
        </div>
      </div>

      <ProductReviews slug={slug} onReviewAdded={() => loadProduct(false)} />
    </div>
  );
}
