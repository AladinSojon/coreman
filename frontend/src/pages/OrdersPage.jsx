import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import api from '../api/client';
import './OrdersPage.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/orders', { params: { size: 20 } })
      .then(r => setOrders(r.data.content || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s) => ({ PENDING: 'var(--warning)', CONFIRMED: 'var(--accent)', SHIPPED: '#60a5fa', DELIVERED: 'var(--success)', CANCELLED: 'var(--error)' }[s] || 'var(--text-muted)');

  return (
    <div className="page container">
      <h1 className="page-title">My Orders</h1>
      {loading ? <div className="skeleton" style={{ height: 200 }} /> :
        orders.length === 0 ? (
          <div className="empty-state">
            <Package size={64} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 24 }} />
            <h3>No orders yet</h3>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 24 }}>Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(o => (
              <div key={o.id} className="order-card card">
                <div className="order-header">
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>Order</span>
                    <h3>{o.orderNumber}</h3>
                  </div>
                  <span className="badge" style={{ background: `${statusColor(o.status)}22`, color: statusColor(o.status) }}>{o.status}</span>
                </div>
                <div className="order-items-preview">
                  {o.items?.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-muted" style={{ fontSize: '0.88rem' }}>{item.productName} × {item.quantity}</span>
                  ))}
                </div>
                <div className="order-footer">
                  <span className="order-total">${o.total?.toFixed(2)}</span>
                  <span className="text-muted" style={{ fontSize: '0.82rem' }}>{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
