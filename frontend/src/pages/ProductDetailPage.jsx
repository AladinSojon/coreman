import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Star, Minus, Plus, ChevronLeft } from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get(`/api/products/${slug}`)
      .then(r => {
        setProduct(r.data);
        if (r.data.variants?.length) {
          const colors = [...new Set(r.data.variants.map(v => v.color))];
          setSelectedColor(colors[0]);
        }
      })
      .catch(() => navigate('/shop'));
  }, [slug]);

  if (!product) return <div className="page container"><div className="skeleton" style={{ height: '60vh' }} /></div>;

  const colors = [...new Set(product.variants?.map(v => v.color))];
  const colorHexMap = Object.fromEntries(product.variants?.map(v => [v.color, v.colorHex]) || []);
  const sizes = [...new Set(product.variants?.filter(v => v.color === selectedColor).map(v => v.size))];
  const selectedVariant = product.variants?.find(v => v.color === selectedColor && v.size === selectedSize);
  const price = selectedVariant?.price || product.basePrice;

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    if (!selectedVariant) return;
    setAdding(true);
    try { await addToCart(selectedVariant.id, quantity); } catch {}
    setTimeout(() => setAdding(false), 1000);
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

          {product.averageRating && (
            <div className="pdp-rating">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < Math.round(product.averageRating) ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" />)}
              <span>{product.averageRating} ({product.reviewCount} reviews)</span>
            </div>
          )}

          <p className="pdp-price">${price?.toFixed(2)}</p>
          <p className="pdp-description">{product.description}</p>

          {/* Color picker */}
          {colors.length > 0 && (
            <div className="pdp-option">
              <label>Color: <strong>{selectedColor}</strong></label>
              <div className="pdp-colors">
                {colors.map(c => (
                  <button key={c} className={`color-swatch ${c === selectedColor ? 'active' : ''}`}
                    style={{ background: colorHexMap[c] }} onClick={() => { setSelectedColor(c); setSelectedSize(null); }} />
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
            <button className="btn btn-secondary btn-lg"><Heart size={18} /></button>
          </div>

          {selectedVariant && selectedVariant.stockQuantity <= 5 && selectedVariant.stockQuantity > 0 && (
            <p className="stock-warning">Only {selectedVariant.stockQuantity} left in stock!</p>
          )}
        </div>
      </div>
    </div>
  );
}
