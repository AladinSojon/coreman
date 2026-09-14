import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api/client';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', country: 'US' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (cart.items.length === 0) navigate('/cart'); }, [cart]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setProcessing(true); setError('');
    try {
      // Save address first
      const addrRes = await api.post('/api/addresses', { ...address, label: 'Shipping', isDefault: true });
      // Place order
      const orderRes = await api.post('/api/orders', { shippingAddressId: addrRes.data.id });
      navigate(`/orders`);
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally { setProcessing(false); }
  };

  const total = cart.subtotal + (cart.subtotal >= 100 ? 0 : 9.99) + cart.subtotal * 0.08;

  return (
    <div className="page container">
      <h1 className="page-title">Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>Shipping Address</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="input-group">
            <label>Street Address</label>
            <input className="input" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="input-group"><label>City</label><input className="input" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} required /></div>
            <div className="input-group"><label>State</label><input className="input" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="input-group"><label>ZIP Code</label><input className="input" value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})} required /></div>
            <div className="input-group"><label>Country</label><input className="input" value={address.country} onChange={e => setAddress({...address, country: e.target.value})} required /></div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} disabled={processing}>
            {processing ? 'Processing...' : `Place Order — $${total.toFixed(2)}`}
          </button>
        </form>

        <div className="checkout-summary card">
          <h3>Order Summary</h3>
          {cart.items.map(item => (
            <div key={item.id} className="checkout-item">
              <div className="checkout-item-img"><img src={item.imageUrl || 'https://placehold.co/80x100'} alt="" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.productName}</p>
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>{item.size} / {item.color} × {item.quantity}</p>
              </div>
              <span style={{ fontWeight: 600 }}>${item.totalPrice?.toFixed(2)}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div className="summary-row"><span>Subtotal</span><span>${cart.subtotal?.toFixed(2)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{cart.subtotal >= 100 ? 'Free' : '$9.99'}</span></div>
          <div className="summary-row"><span>Tax</span><span>${(cart.subtotal * 0.08).toFixed(2)}</span></div>
          <div className="summary-row total"><span>Total</span><span>${total.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}
