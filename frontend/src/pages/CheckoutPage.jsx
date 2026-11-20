import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Banknote, Check, CreditCard, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatPrice } from '../utils/price';
import { siteInfo } from '../siteInfo';
import { getOnlinePayments } from '../utils/paymentOptions';
import { loadGuestDetails, saveGuestDetails, rememberGuestOrder } from '../utils/guestOrders';
import './CheckoutPage.css';

// Bangladeshi mobile: 01XXXXXXXXX, optionally prefixed with +88 / 88.
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
const normalisePhone = (p) => p.replace(/[\s-]/g, '');

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, fetchCart, guestLines, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    recipientName: '', phone: '', street: '', city: '', zipCode: '', country: 'Bangladesh',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cartLoaded, setCartLoaded] = useState(false);
  const orderPlaced = useRef(false);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');

  useEffect(() => { getOnlinePayments().then(setOnlineEnabled); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Guest: browser cart, and details remembered on this device from a previous order.
      fetchCart().finally(() => setCartLoaded(true));
      const d = loadGuestDetails();
      if (d) setAddress(prev => ({ ...prev, ...d }));
      return;
    }
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
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empty cart → back to the cart page. Skipped once an order is placed (placing it empties the cart).
  useEffect(() => {
    if (cartLoaded && !orderPlaced.current && cart.items.length === 0) navigate('/cart');
  }, [cartLoaded, cart, navigate]);

  if (authLoading) return null;

  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phone = normalisePhone(address.phone);
    if (!BD_PHONE.test(phone)) { setError('Please enter a valid Bangladeshi mobile number, e.g. 01712345678.'); return; }
    setProcessing(true); setError('');
    if (!user) { await placeGuestOrder(phone); return; }
    try {
      const addrRes = await api.post('/api/addresses', { ...address, phone, label: 'Shipping', isDefault: true });
      const method = paymentMethod === 'SSLCOMMERZ' && onlineEnabled ? 'SSLCOMMERZ' : 'COD';
      const orderRes = await api.post('/api/orders', { shippingAddressId: addrRes.data.id, paymentMethod: method });
      const orderNumber = orderRes.data.orderNumber;
      orderPlaced.current = true;
      fetchCart(); // refresh the (now empty) cart badge

      if (method === 'SSLCOMMERZ') {
        try {
          const { data } = await api.post('/api/payments/sslcommerz/init', { orderNumber });
          window.location.assign(data.gatewayUrl); // SSLCommerz payment page
          return;
        } catch {
          // Order exists but the gateway didn't start: let the customer retry from My Orders.
          navigate(`/orders?payment=retry&order=${encodeURIComponent(orderNumber)}`);
          return;
        }
      }
      navigate(`/orders?placed=${encodeURIComponent(orderNumber)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally { setProcessing(false); }
  };

  // Checkout without an account: order number + phone are all a guest needs to track or pay later.
  const placeGuestOrder = async (phone) => {
    const method = paymentMethod === 'SSLCOMMERZ' && onlineEnabled ? 'SSLCOMMERZ' : 'COD';
    try {
      const { data: order } = await api.post('/api/guest/orders', {
        items: guestLines(), recipientName: address.recipientName, phone,
        street: address.street, city: address.city, zipCode: address.zipCode, paymentMethod: method,
      });
      orderPlaced.current = true;
      saveGuestDetails({ ...address, phone });
      rememberGuestOrder(order.orderNumber, phone);
      clearCart();
      if (method === 'SSLCOMMERZ') {
        try {
          const { data } = await api.post('/api/guest/payments/init', { orderNumber: order.orderNumber, phone });
          window.location.assign(data.gatewayUrl);
          return;
        } catch {
          navigate(`/track?payment=retry&order=${encodeURIComponent(order.orderNumber)}`);
          return;
        }
      }
      navigate(`/track?placed=1&order=${encodeURIComponent(order.orderNumber)}`);
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
      {!user && (
        <p className="guest-note">Checking out as a guest — no account needed. Have an account? <Link to="/login">Sign in</Link></p>
      )}
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
            <div role="radiogroup" aria-label="Payment method" className="pay-options">
              {onlineEnabled && (
                <button type="button" role="radio" aria-checked={paymentMethod === 'SSLCOMMERZ'}
                  className={`pay-option ${paymentMethod === 'SSLCOMMERZ' ? 'selected' : ''}`} onClick={() => setPaymentMethod('SSLCOMMERZ')}>
                  <CreditCard size={22} />
                  <div>
                    <strong>Pay online</strong>
                    <p>bKash, Nagad, Rocket, Visa, Mastercard or internet banking — secured by SSLCommerz.</p>
                    <span className="pay-brands">bKash · Nagad · Rocket · VISA · Mastercard</span>
                  </div>
                  {paymentMethod === 'SSLCOMMERZ' && <Check size={18} className="pay-check" />}
                </button>
              )}
              <button type="button" role="radio" aria-checked={paymentMethod === 'COD'}
                className={`pay-option ${paymentMethod === 'COD' ? 'selected' : ''}`} onClick={() => setPaymentMethod('COD')}>
                <Banknote size={22} />
                <div>
                  <strong>Cash on Delivery</strong>
                  <p>Pay the courier in cash when your order arrives.</p>
                </div>
                {paymentMethod === 'COD' && <Check size={18} className="pay-check" />}
              </button>
            </div>
          </section>

          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={processing}>
            {processing
              ? (paymentMethod === 'SSLCOMMERZ' ? 'Opening secure payment…' : 'Placing order…')
              : paymentMethod === 'SSLCOMMERZ' ? `Pay ${formatPrice(total)} securely` : `Place order — ${formatPrice(total)}`}
          </button>
          {paymentMethod === 'SSLCOMMERZ' && (
            <p className="checkout-note"><Lock size={12} /> You'll be taken to SSLCommerz to pay. Unpaid online orders are cancelled after 1 hour.</p>
          )}
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
          <div className="summary-row total"><span>Total{paymentMethod === 'COD' ? ' (pay on delivery)' : ''}</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
