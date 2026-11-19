import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Banknote, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatPrice } from '../utils/price';
import { siteInfo } from '../siteInfo';
import './CheckoutPage.css';

// Bangladeshi mobile: 01XXXXXXXXX, optionally prefixed with +88 / 88.
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
const normalisePhone = (p) => p.replace(/[\s-]/g, '');

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, fetchCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    recipientName: '', phone: '', street: '', city: '', zipCode: '', country: 'Bangladesh',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cartLoaded, setCartLoaded] = useState(false);
  const orderPlaced = useRef(false);

  useEffect(() => {
    if (!user) return;
    fetchCart().finally(() => setCartLoaded(true));
    // Prefill from the most recently saved address.
    api.get('/api/addresses').then(r => {
      const a = Array.isArray(r.data) && r.data.length ? r.data[r.data.length - 1] : null;
      setAddress(prev => ({
        ...prev,
        recipientName: a?.recipientName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: a?.phone || '',
        street: a?.street || '', city: a?.city || '', zipCode: a?.zipCode || '',
      }));
    }).catch(() => {
      setAddress(prev => ({ ...prev, recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() }));
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empty cart → back to the cart page. Skipped once an order is placed (placing it empties the cart).
  useEffect(() => {
    if (cartLoaded && !orderPlaced.current && cart.items.length === 0) navigate('/cart');
  }, [cartLoaded, cart, navigate]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phone = normalisePhone(address.phone);
    if (!BD_PHONE.test(phone)) { setError('Please enter a valid Bangladeshi mobile number, e.g. 01712345678.'); return; }
    setProcessing(true); setError('');
    try {
      const addrRes = await api.post('/api/addresses', { ...address, phone, label: 'Shipping', isDefault: true });
      const orderRes = await api.post('/api/orders', { shippingAddressId: addrRes.data.id, paymentMethod: 'COD' });
      orderPlaced.current = true;
      navigate(`/orders?placed=${encodeURIComponent(orderRes.data.orderNumber)}`);
      fetchCart(); // refresh the (now empty) cart badge
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally { setProcessing(false); }
  };

  const subtotal = Number(cart.subtotal || 0);
  const shipping = subtotal >= siteInfo.freeShippingThreshold ? 0 : siteInfo.shippingFee;
  const total = subtotal + shipping;

  return (
    <div className="page container">
      <h1 className="page-title">Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-section">
            <h2><span className="step-num">1</span> Delivery details</h2>
            <div className="field-grid">
              <div className="input-group">
                <label htmlFor="co-name">Full name</label>
                <input id="co-name" className="input" autoComplete="name" value={address.recipientName} onChange={set('recipientName')} required />
              </div>
              <div className="input-group">
                <label htmlFor="co-phone">Mobile number</label>
                <input id="co-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX"
                  value={address.phone} onChange={set('phone')} required />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="co-street">Address</label>
              <input id="co-street" className="input" autoComplete="street-address" placeholder="House, road, area"
                value={address.street} onChange={set('street')} required />
            </div>
            <div className="field-grid">
              <div className="input-group">
                <label htmlFor="co-city">City / District</label>
                <input id="co-city" className="input" autoComplete="address-level2" value={address.city} onChange={set('city')} required />
              </div>
              <div className="input-group">
                <label htmlFor="co-zip">Postcode</label>
                <input id="co-zip" className="input" autoComplete="postal-code" inputMode="numeric" value={address.zipCode} onChange={set('zipCode')} required />
              </div>
            </div>
          </section>

          <section className="checkout-section">
            <h2><span className="step-num">2</span> Payment</h2>
            <div className="pay-option selected" role="radio" aria-checked="true">
              <Banknote size={22} />
              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay the courier in cash when your order arrives.</p>
              </div>
              <Check size={18} className="pay-check" />
            </div>
          </section>

          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={processing}>
            {processing ? 'Placing order…' : `Place order — ${formatPrice(total)}`}
          </button>
          <p className="checkout-note">By placing your order you agree to our <a href="/pages/terms">terms</a>. We'll call to confirm before shipping.</p>
        </form>

        <div className="checkout-summary card">
          <h3>Order summary</h3>
          {cart.items.map(item => (
            <div key={item.id} className="checkout-item">
              <div className="checkout-item-img"><img src={item.imageUrl || 'https://placehold.co/80x100'} alt="" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.productName}</p>
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>{item.size} / {item.color} × {item.quantity}</p>
              </div>
              <span style={{ fontWeight: 600 }}>{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          {shipping > 0 && (
            <p className="free-ship-hint">Add {formatPrice(siteInfo.freeShippingThreshold - subtotal)} more for free shipping.</p>
          )}
          <div className="summary-row total"><span>Total (pay on delivery)</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
