import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Search, PackageSearch } from 'lucide-react';
import api from '../api/client';
import { formatPrice } from '../utils/price';
import { recentGuestOrders, rememberGuestOrder } from '../utils/guestOrders';
import './OrdersPage.css';
import './TrackOrderPage.css';

const STATUS_LABEL = { PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };
const STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
const PAYMENT_LABEL = { COD: 'Cash on Delivery', SSLCOMMERZ: 'Online payment' };

const BANNERS = {
  placed: { tone: 'ok', title: (o) => `Thank you — order ${o} is placed.`, body: "We'll call you to confirm before it ships. Keep your order number to track it here." },
  success: { tone: 'ok', title: (o) => `Payment received — order ${o} is paid.`, body: "Thank you! We'll call to confirm and ship it soon." },
  failed: { tone: 'bad', title: (o) => `Payment for ${o} didn't go through.`, body: 'No money was taken. Enter your phone below and tap "Pay now" to try again.' },
  cancelled: { tone: 'warn', title: (o) => `Payment for ${o} was cancelled.`, body: 'Your order is saved. Pay within 1 hour or it will be cancelled.' },
  retry: { tone: 'warn', title: (o) => `Order ${o} is placed, but the payment page didn't open.`, body: 'Tap "Pay now" below to try again.' },
};

/** Order tracking without an account: order number + the phone number used at checkout. */
export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const banner = params.get('placed') ? 'placed' : (BANNERS[params.get('payment')] ? params.get('payment') : null);
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const recent = recentGuestOrders();

  const lookup = async (num = orderNumber, ph = phone) => {
    if (!num.trim() || !ph.trim()) { setError('Enter your order number and phone number.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/api/guest/orders/track', { orderNumber: num.trim(), phone: ph.trim() });
      setOrder(data);
      rememberGuestOrder(data.orderNumber, ph.trim());
    } catch (e) {
      setOrder(null);
      setError(e.response?.data?.message || "We couldn't find that order.");
    } finally { setBusy(false); }
  };

  // Coming back from checkout/payment on this device: look the order up automatically.
  useEffect(() => {
    const num = params.get('order');
    const match = num && recent.find(r => r.orderNumber === num);
    if (match) { setPhone(match.phone); lookup(match.orderNumber, match.phone); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const payNow = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/api/guest/payments/init', { orderNumber: order.orderNumber, phone });
      window.location.assign(data.gatewayUrl);
    } catch (e) { setError(e.response?.data?.message || 'Could not open the payment page.'); setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setBusy(true); setError('');
    try { const { data } = await api.post('/api/guest/orders/cancel', { orderNumber: order.orderNumber, phone }); setOrder(data); }
    catch (e) { setError(e.response?.data?.message || 'Could not cancel the order.'); }
    finally { setBusy(false); }
  };

  const open = order && (order.status === 'PENDING' || order.status === 'CONFIRMED');
  const b = banner && BANNERS[banner];
  const stepIndex = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div className="page container track-page">
      <h1 className="page-title">Track your order</h1>

      {b && params.get('order') && (
        <div className={`order-placed tone-${b.tone}`}>
          {b.tone === 'ok' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <div><strong>{b.title(params.get('order'))}</strong><p>{b.body}</p></div>
        </div>
      )}

      <form className="track-form card" onSubmit={e => { e.preventDefault(); lookup(); }}>
        <div className="input-group">
          <label htmlFor="t-order">Order number</label>
          <input id="t-order" className="input" placeholder="CM-XXXXXXXX" value={orderNumber}
            onChange={e => setOrderNumber(e.target.value.toUpperCase())} autoComplete="off" />
        </div>
        <div className="input-group">
          <label htmlFor="t-phone">Phone used for the order</label>
          <input id="t-phone" className="input" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={phone}
            onChange={e => setPhone(e.target.value)} autoComplete="tel" />
        </div>
        <button className="btn btn-primary" disabled={busy}><Search size={16} /> {busy ? 'Looking…' : 'Find order'}</button>
      </form>

      {recent.length > 0 && !order && (
        <div className="track-recent">
          <span>Orders from this device:</span>
          {recent.slice(0, 5).map(r => (
            <button key={r.orderNumber} className="chip" onClick={() => { setOrderNumber(r.orderNumber); setPhone(r.phone); lookup(r.orderNumber, r.phone); }}>
              {r.orderNumber}
            </button>
          ))}
        </div>
      )}

      {error && <div className="auth-error" style={{ maxWidth: 700, marginTop: 16 }}>{error}</div>}

      {order && (
        <div className="order-card card track-result">
          <div className="order-header">
            <div>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <h3>{order.orderNumber}</h3>
            </div>
            <span className={`status-pill status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span>
          </div>

          {order.status !== 'CANCELLED' && (
            <ol className="track-steps" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= stepIndex ? 'done' : ''}><span />{STATUS_LABEL[s]}</li>
              ))}
            </ol>
          )}

          <ul className="order-items-preview">
            {order.items.map((it, i) => (
              <li key={i}>{it.productName} <span className="text-muted">· {it.size} / {it.color} × {it.quantity}</span></li>
            ))}
          </ul>
          <div className="order-footer">
            <div>
              <span className="order-total">{formatPrice(order.total)}</span>
              <span className="order-pay">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod} · {order.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}</span>
            </div>
            <div className="order-actions">
              {open && order.paymentMethod === 'SSLCOMMERZ' && order.paymentStatus === 'UNPAID' && (
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={payNow}>Pay now</button>
              )}
              {open && order.paymentStatus !== 'PAID' && (
                <button className="btn btn-secondary btn-sm" disabled={busy} onClick={cancel}>Cancel order</button>
              )}
              {open && order.paymentStatus === 'PAID' && (
                <Link to="/pages/contact" className="btn btn-secondary btn-sm">Need to cancel? Contact us</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {!order && (
        <p className="track-help"><PackageSearch size={16} /> Your order number starts with <strong>CM-</strong> and is shown after checkout.
          Lost it? <Link to="/pages/contact">Contact us</Link> with your phone number. Have an account? <Link to="/orders">See My Orders</Link>.</p>
      )}
    </div>
  );
}
