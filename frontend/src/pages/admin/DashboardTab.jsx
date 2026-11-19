import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShoppingBag, Wallet, Truck, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { taka, shortTaka, Pill, relative, STATUS_LABEL } from './shared';

function Kpi({ icon: Icon, label, value, sub, trend, onClick, tone }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`kpi card ${onClick ? 'kpi-link' : ''} ${tone ? `kpi-${tone}` : ''}`} onClick={onClick}>
      <div className="kpi-top"><span className="kpi-label">{label}</span><Icon size={18} className="kpi-icon" /></div>
      <p className="kpi-value">{value}</p>
      {(sub || trend != null) && (
        <p className="kpi-sub">
          {trend != null && (
            <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
              {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {Math.abs(trend)}%
            </span>
          )}
          {sub}
        </p>
      )}
    </Tag>
  );
}

/** Daily revenue, last 30 days. Single series: one colour, title names it, hover tooltip per bar. */
function SalesChart({ days }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const W = 720, H = 220, padL = 44, padR = 8, padT = 12, padB = 26;
  const max = Math.max(...days.map(d => Number(d.revenue)), 0);
  const niceMax = max <= 0 ? 1000 : Math.pow(10, Math.floor(Math.log10(max))) * Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max))));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const slot = plotW / days.length;
  const barW = Math.max(4, slot - 4); // 4px gap between bars
  const y = (v) => padT + plotH - (Number(v) / niceMax) * plotH;
  const ticks = [0, 0.5, 1].map(f => niceMax * f);
  const total = days.reduce((s, d) => s + Number(d.revenue), 0);
  const orders = days.reduce((s, d) => s + Number(d.orders), 0);

  return (
    <div className="chart-card card">
      <div className="panel-head">
        <div>
          <h3>Revenue, last 30 days</h3>
          <p className="panel-sub">{taka(total)} from {orders} {orders === 1 ? 'order' : 'orders'} · cancelled orders excluded</p>
        </div>
      </div>
      <div className="chart-wrap" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sales-chart" role="img"
          aria-label={`Daily revenue for the last 30 days, total ${taka(total)}`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padL - 8} y={y(t) + 4} className="axis-text" textAnchor="end">{shortTaka(t)}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = padL + i * slot + (slot - barW) / 2;
            const v = Number(d.revenue);
            const top = y(v);
            const h = padT + plotH - top;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {/* hit target: full column, bigger than the bar */}
                <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path className={`bar ${hover === i ? 'active' : ''}`}
                    d={`M${x},${top + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, barW / 2)},-${Math.min(4, h)} h${barW - 2 * Math.min(4, barW / 2)} q${Math.min(4, barW / 2)},0 ${Math.min(4, barW / 2)},${Math.min(4, h)} V${padT + plotH} H${x} Z`} />
                )}
                {((i % 7 === 0 && i < days.length - 4) || i === days.length - 1) && (
                  <text x={padL + i * slot + slot / 2} y={H - 8} className="axis-text" textAnchor="middle">
                    {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} className="base-line" />
        </svg>
        {hover != null && (
          <div className="chart-tip" style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }}>
            <strong>{new Date(days[hover].date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
            <span>{taka(days[hover].revenue)}</span>
            <span className="muted">{days[hover].orders} {Number(days[hover].orders) === 1 ? 'order' : 'orders'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBreakdown({ byStatus, onPick }) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return (
    <div className="card panel">
      <div className="panel-head"><h3>Orders by status</h3><span className="panel-sub">{total} total</span></div>
      <ul className="status-list">
        {Object.entries(byStatus).map(([s, n]) => (
          <li key={s}>
            <button onClick={() => onPick(s)} className="status-row">
              <Pill value={s} />
              <span className="status-bar"><span className={`status-fill fill-${s.toLowerCase()}`} style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></span>
              <span className="status-count">{n}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardTab({ go }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/api/admin/dashboard')
      .then(r => { setD(r.data); setError(''); })
      .catch(() => setError('Could not load dashboard.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (error) return <div className="admin-error">{error} <button className="btn-outline" onClick={load}>Retry</button></div>;
  if (!d) return <div className="kpi-grid">{[...Array(6)].map((_, i) => <div key={i} className="kpi card skeleton" style={{ height: 118 }} />)}</div>;

  const monthTrend = Number(d.lastMonth.revenue) > 0
    ? Math.round(((Number(d.thisMonth.revenue) - Number(d.lastMonth.revenue)) / Number(d.lastMonth.revenue)) * 100)
    : null;
  const toShip = (d.ordersByStatus.PENDING || 0) + (d.ordersByStatus.CONFIRMED || 0);

  return (
    <div className="dash">
      <div className="dash-toolbar">
        <p className="panel-sub">Today: <strong>{taka(d.today.revenue)}</strong> from {d.today.orders} {d.today.orders === 1 ? 'order' : 'orders'}</p>
        <button className="btn-outline" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
      </div>

      <div className="kpi-grid">
        <Kpi icon={Wallet} label="Revenue this month" value={taka(d.thisMonth.revenue)} trend={monthTrend}
          sub={monthTrend == null ? 'No sales last month to compare' : 'vs last month'} />
        <Kpi icon={ShoppingBag} label="Orders this month" value={d.thisMonth.orders} sub={`${d.allTime.orders} all time`} />
        <Kpi icon={Wallet} label="Average order value" value={taka(d.averageOrderValue)} sub={`${taka(d.collectedRevenue)} collected`} />
        <Kpi icon={Truck} label="To process" value={toShip} sub="Pending + confirmed" tone={toShip > 0 ? 'attention' : null}
          onClick={() => go('orders', { status: 'PENDING' })} />
        <Kpi icon={Users} label="Customers" value={d.customers} sub={`+${d.newCustomers30d} in 30 days`} onClick={() => go('customers')} />
        <Kpi icon={AlertTriangle} label="Low stock variants" value={d.lowStockCount} sub={`${d.lowStockThreshold} or fewer left`}
          tone={d.lowStockCount > 0 ? 'warning' : null} onClick={() => go('inventory', { show: 'low' })} />
      </div>

      <div className="dash-grid">
        <SalesChart days={d.last30Days} />
        <StatusBreakdown byStatus={d.ordersByStatus} onPick={(s) => go('orders', { status: s })} />
      </div>

      <div className="dash-grid three">
        <div className="card panel">
          <div className="panel-head"><h3>Recent orders</h3><button className="link-btn" onClick={() => go('orders')}>View all</button></div>
          {d.recentOrders.length === 0 ? <p className="panel-empty">No orders yet.</p> : (
            <ul className="mini-list">
              {d.recentOrders.map(o => (
                <li key={o.id}>
                  <button className="mini-row" onClick={() => go('orders', { open: o.id })}>
                    <span><strong>{o.orderNumber}</strong><small>{o.customer} · {relative(o.createdAt)}</small></span>
                    <span className="mini-right"><strong>{taka(o.total)}</strong><Pill value={o.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card panel">
          <div className="panel-head"><h3>Best sellers</h3><span className="panel-sub">by units sold</span></div>
          {d.topProducts.length === 0 ? <p className="panel-empty">No sales yet.</p> : (
            <ol className="rank-list">
              {d.topProducts.map((p, i) => (
                <li key={p.name}>
                  <span className="rank">{i + 1}</span>
                  <span className="rank-name">{p.name}</span>
                  <span className="rank-val"><strong>{p.units}</strong> sold<small>{taka(p.revenue)}</small></span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card panel">
          <div className="panel-head"><h3>Low stock</h3><button className="link-btn" onClick={() => go('inventory', { show: 'low' })}>Manage</button></div>
          {d.lowStock.length === 0 ? <p className="panel-empty">Everything is well stocked.</p> : (
            <ul className="mini-list">
              {d.lowStock.map((v, i) => (
                <li key={i} className="stock-row">
                  <span><Link to={`/product/${v.slug}`} target="_blank">{v.productName}</Link><small>{v.size} / {v.color}</small></span>
                  <span className={`stock-num ${v.stock === 0 ? 'out' : ''}`}>{v.stock === 0 ? 'Out of stock' : `${v.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="dash-foot">{Object.entries(d.ordersByStatus).map(([s, n]) => `${STATUS_LABEL[s]} ${n}`).join(' · ')}</p>
    </div>
  );
}
