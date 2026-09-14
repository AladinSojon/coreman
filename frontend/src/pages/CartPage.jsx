import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './CartPage.css';

export default function CartPage() {
  const { cart, fetchCart, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) fetchCart(); }, [user]);

  if (!user) return (
    <div className="page container text-center" style={{ paddingTop: 100 }}>
      <ShoppingBag size={64} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 24 }} />
      <h2>Sign in to view your cart</h2>
      <Link to="/login" className="btn btn-primary" style={{ marginTop: 24 }}>Sign In</Link>
    </div>
  );

  if (cart.items.length === 0) return (
    <div className="page container text-center" style={{ paddingTop: 100 }}>
      <ShoppingBag size={64} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 24 }} />
      <h2>Your cart is empty</h2>
      <p className="text-muted" style={{ marginTop: 8 }}>Discover something you'll love</p>
      <Link to="/shop" className="btn btn-primary" style={{ marginTop: 24 }}>Shop Now</Link>
    </div>
  );

  return (
    <div className="page container">
      <h1 className="page-title">Shopping Cart ({cart.totalItems} items)</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map(item => (
            <div key={item.id} className="cart-item card">
              <Link to={`/product/${item.productSlug}`} className="cart-item-image">
                <img src={item.imageUrl || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200'} alt={item.productName} />
              </Link>
              <div className="cart-item-info">
                <Link to={`/product/${item.productSlug}`}><h3>{item.productName}</h3></Link>
                <p className="text-muted">{item.size} / {item.color}</p>
                <p className="cart-item-price">${item.unitPrice?.toFixed(2)}</p>
              </div>
              <div className="cart-item-actions">
                <div className="pdp-quantity">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                </div>
                <p className="cart-item-total">${item.totalPrice?.toFixed(2)}</p>
                <button className="cart-remove" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary card">
          <h3>Order Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>${cart.subtotal?.toFixed(2)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{cart.subtotal >= 100 ? 'Free' : '$9.99'}</span></div>
          <div className="summary-row"><span>Estimated Tax</span><span>${(cart.subtotal * 0.08).toFixed(2)}</span></div>
          <hr />
          <div className="summary-row total"><span>Total</span><span>${(cart.subtotal + (cart.subtotal >= 100 ? 0 : 9.99) + cart.subtotal * 0.08).toFixed(2)}</span></div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/checkout')}>
            Checkout <ArrowRight size={16} />
          </button>
          {cart.subtotal < 100 && <p className="free-shipping-note">Add ${(100 - cart.subtotal).toFixed(2)} more for free shipping</p>}
        </div>
      </div>
    </div>
  );
}
