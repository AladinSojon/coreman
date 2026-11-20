import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Package, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/price';
import './OrdersPage.css';

const STATUS_LABEL = { PENDING: 'Pending', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };
const PAYMENT_LABEL = { COD: 'Cash on Delivery', SSLCOMMERZ: 'Online payment' };

const PAYMENT_BANNER = {
  success: { tone: 'ok', title: (o) => `Payment received — order ${o} is confirmed as paid.`, body: "Thank you! We'll call to confirm and ship it soon." },
  failed: { tone: 'bad', title: (o) => `Payment for ${o} didn't go through.`, body: 'No money was taken. Tap "Pay now" to try again, or contact us.' },
  cancelled: { tone: 'warn', title: (o) => `Payment for ${o} was cancelled.`, body: 'Your order is saved. Tap "Pay now" to finish paying within 1 hour, or it will be cancelled.' },
  retry: { tone: 'warn', title: (o) => `Order ${o} is placed, but the payment page didn't open.`, body: 'Tap "Pay now" to try again.' },
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const placed = searchParams.get('placed');
  const paymentResult = PAYMENT_BANNER[searchParams.get('payment')] ? searchParams.get('payment') : null;
  const paymentOrder = searchParams.get('order');
  const [paying, setPaying] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/api/orders', { params: { size: 20 } })
    .then(r => setOrders(r.data.content || []))
    .catch(() => setError('Could not load your orders.'))
    .finally(() => setLoading(false));

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const payNow = async (orderNumber) => {
    setPaying(orderNumber); setError('');
    try {
      const { data } = await api.post('/api/payments/sslcommerz/init', { orderNumber });
      window.location.assign(data.gatewayUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open the payment page.');
      setPaying(null);
    }
  };

  const cancel = async (orderNumber) => {
    if (!window.confirm(`Cancel order ${orderNumber}?`)) return;
    setCancelling(orderNumber); setError('');
    try {
      await api.post(`/api/orders/${orderNumber}/cancel`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel the order.');
    } finally { setCancelling(null); }
  };

  return (
    <div className="page container">
      <h1 className="page-title">My Orders</h1>

      {placed && (
        <div className="order-placed">
          <CheckCircle2 size={22} />
          <div>
            <strong>Thank you — order {placed} is placed.</strong>
            <p>We'll call you to confirm before it ships. Pay in cash when it arrives.</p>
          </div>
        </div>
      )}
      {paymentResult && paymentOrder && (
        <div className={`order-placed tone-${PAYMENT_BANNER[paymentResult].tone}`}>
          {PAYMENT_BANNER[paymentResult].tone === 'ok' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <div>
            <strong>{PAYMENT_BANNER[paymentResult].title(paymentOrder)}</strong>
            <p>{PAYMENT_BANNER[paymentResult].body}</p>
          </div>
        </div>
      )}
      {error && <div className="auth-error" style={{ maxWidth: 700, marginBottom: 16 }}>{error}</div>}

      {loading ? <div className="skeleton" style={{ height: 200, maxWidth: 700 }} /> :
        orders.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '80px 0' }}>
            <Package size={56} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 20 }} />
            <h3>No orders yet</h3>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 24 }}>Start shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(o => (
              <div key={o.id} className={`order-card card ${o.orderNumber === placed || o.orderNumber === paymentOrder ? 'highlight' : ''}`}>
                <div className="order-header">
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <h3>{o.orderNumber}</h3>
                  </div>
                  <span className={`status-pill status-${o.status?.toLowerCase()}`}>{STATUS_LABEL[o.status] || o.status}</span>
                </div>
                <ul className="order-items-preview">
                  {o.items?.map((item, i) => (
                    <li key={i}>{item.productName} <span className="text-muted">· {item.size} / {item.color} × {item.quantity}</span></li>
                  ))}
                </ul>
                <div className="order-footer">
                  <div>
                    <span className="order-total">{formatPrice(o.total)}</span>
                    <span className="order-pay">{PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod} · {o.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}</span>
                  </div>
                  <div className="order-actions">
                    {o.paymentMethod === 'SSLCOMMERZ' && o.paymentStatus === 'UNPAID' && (o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                      <button className="btn btn-primary btn-sm" disabled={paying === o.orderNumber} onClick={() => payNow(o.orderNumber)}>
                        {paying === o.orderNumber ? 'Opening…' : `Pay now`}
                      </button>
                    )}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && o.paymentStatus === 'PAID' && (
                      <Link to="/pages/contact" className="btn btn-secondary btn-sm">Need to cancel? Contact us</Link>
                    )}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && o.paymentStatus !== 'PAID' && (
                      <button className="btn btn-secondary btn-sm" disabled={cancelling === o.orderNumber} onClick={() => cancel(o.orderNumber)}>
                        {cancelling === o.orderNumber ? 'Cancelling…' : 'Cancel order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
