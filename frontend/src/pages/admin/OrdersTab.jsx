import { useEffect, useState, useCallback } from 'react';
import { Search, Download, Printer, X, Phone, RefreshCw, StickyNote } from 'lucide-react';
import api from '../../api/client';
import { siteInfo } from '../../siteInfo';
import {
  ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABEL, Pill, Pagination, EmptyRow,
  taka, dateTime, useDebounced, useToast,
} from './shared';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Opens a printable invoice / packing slip in a new window. */
function printInvoice(o) {
  const a = o.shippingAddress || {};
  const rows = (o.items || []).map(i => `
    <tr><td>${esc(i.productName)}<br><small>${esc(i.size)} / ${esc(i.color)}</small></td>
    <td class="r">${i.quantity}</td><td class="r">${taka(i.unitPrice)}</td><td class="r">${taka(i.unitPrice * i.quantity)}</td></tr>`).join('');
  const contact = [siteInfo.phone, siteInfo.email].filter(Boolean).map(esc).join(' · ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.orderNumber)}</title>
  <style>
    body{font:14px/1.5 -apple-system,'Segoe UI',sans-serif;color:#17150f;margin:40px;max-width:760px}
    h1{font-size:22px;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .muted{color:#5c574e}.box{display:flex;gap:40px;margin-bottom:24px}.box h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8a847a;margin:0 0 6px}
    table{width:100%;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid #e4ded4;text-align:left;vertical-align:top}
    th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8a847a}.r{text-align:right}
    .tot td{border:none;padding:4px 8px}.grand td{font-weight:700;font-size:16px;border-top:2px solid #17150f;padding-top:10px}
    .cod{margin-top:24px;padding:12px 14px;border:2px dashed #17150f;font-weight:700;text-align:center}
    small{color:#5c574e}@media print{body{margin:16px}}
  </style></head><body>
  <div class="top"><div><h1>CORE<span style="color:#c2410c">MAN</span></h1><div class="muted">${contact}</div></div>
  <div style="text-align:right"><strong>Invoice ${esc(o.orderNumber)}</strong><div class="muted">${esc(dateTime(o.createdAt))}</div>
  <div class="muted">${esc(STATUS_LABEL[o.status] || o.status)}</div></div></div>
  <div class="box"><div><h3>Ship to</h3><strong>${esc(a.recipientName || `${o.user?.firstName || ''} ${o.user?.lastName || ''}`)}</strong><br>
  ${esc(a.phone || '')}<br>${esc(a.street || '')}<br>${esc(a.city || '')} ${esc(a.zipCode || '')}<br>${esc(a.country || '')}</div>
  <div><h3>Customer</h3>${o.user?.guest ? 'Guest checkout' : esc(o.user?.email || '')}<br><h3 style="margin-top:12px">Payment</h3>${o.paymentMethod === 'SSLCOMMERZ' ? 'Online (SSLCommerz)' + (o.paymentChannel ? ' — ' + esc(o.paymentChannel) : '') : 'Cash on Delivery'} ·${esc(STATUS_LABEL[o.paymentStatus] || o.paymentStatus)}</div></div>
  <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <table style="width:280px;margin-left:auto;margin-top:8px">
    <tr class="tot"><td>Subtotal</td><td class="r">${taka(o.subtotal)}</td></tr>
    <tr class="tot"><td>Shipping</td><td class="r">${Number(o.shippingCost) === 0 ? 'Free' : taka(o.shippingCost)}</td></tr>
    <tr class="grand"><td>Total</td><td class="r">${taka(o.total)}</td></tr></table>
  ${o.paymentStatus === 'UNPAID' && o.paymentMethod !== 'SSLCOMMERZ' ? `<div class="cod">Collect ${taka(o.total)} on delivery</div>` : ''}
  ${o.paymentStatus === 'PAID' ? `<div class="cod">PAID — do not collect cash</div>` : ''}
  <p class="muted" style="margin-top:32px;text-align:center">Thank you for shopping with CoreMan.</p>
  <script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}

function OrderDrawer({ order, onClose, onChanged, toast }) {
  const [note, setNote] = useState(order.adminNote || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => setNote(order.adminNote || ''), [order]);

  const a = order.shippingAddress || {};
  const run = async (fn, msg) => {
    setSaving(true);
    try { const r = await fn(); onChanged(r.data); toast.ok(msg); }
    catch (e) { toast.error(e); }
    finally { setSaving(false); }
  };
  const setStatus = (status) => {
    if (status === order.status) return;
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${order.orderNumber}? Items go back into stock. This can't be undone.`)) return;
    run(() => api.put(`/api/admin/orders/${order.id}/status`, { status }), `Status: ${STATUS_LABEL[status]}`);
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" aria-label={`Order ${order.orderNumber}`}>
        <div className="drawer-head">
          <div><h2>{order.orderNumber}</h2><p className="panel-sub">{dateTime(order.createdAt)}</p></div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="drawer-body">
          <div className="drawer-controls">
            <label>Status
              <select value={order.status} disabled={saving || order.status === 'CANCELLED'} onChange={e => setStatus(e.target.value)}>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label>Payment
              <select value={order.paymentStatus} disabled={saving} onChange={e => run(() => api.put(`/api/admin/orders/${order.id}/payment`, { paymentStatus: e.target.value }), `Payment: ${STATUS_LABEL[e.target.value]}`)}>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
          </div>
          {order.status === 'CANCELLED' && <p className="drawer-hint">Cancelled orders are final; their stock has been returned.</p>}

          <section className="drawer-section">
            <h4>Items</h4>
            {order.items?.map((i, idx) => (
              <div key={idx} className="drawer-item">
                <span className="qty">{i.quantity}×</span>
                <span className="grow">{i.productName}<small>{i.size} / {i.color}</small></span>
                <strong>{taka(i.unitPrice * i.quantity)}</strong>
              </div>
            ))}
            <div className="drawer-totals">
              <div><span>Subtotal</span><span>{taka(order.subtotal)}</span></div>
              <div><span>Shipping</span><span>{Number(order.shippingCost) === 0 ? 'Free' : taka(order.shippingCost)}</span></div>
              <div className="grand"><span>Total</span><span>{taka(order.total)}</span></div>
              <div className="muted"><span>Payment</span><span>{order.paymentMethod === 'SSLCOMMERZ' ? 'Online (SSLCommerz)' : 'Cash on Delivery'}</span></div>
              {order.paymentMethod === 'SSLCOMMERZ' && (
                <>
                  {order.paymentChannel && <div className="muted"><span>Paid with</span><span>{order.paymentChannel}</span></div>}
                  {order.paymentGatewayRef && <div className="muted"><span>Bank txn</span><span>{order.paymentGatewayRef}</span></div>}
                  {order.paymentIntentId && <div className="muted"><span>Gateway txn</span><span>{order.paymentIntentId}</span></div>}
                  {order.paidAt && <div className="muted"><span>Paid at</span><span>{dateTime(order.paidAt)}</span></div>}
                </>
              )}
            </div>
          </section>

          <section className="drawer-section two">
            <div>
              <h4>Ship to</h4>
              <p><strong>{a.recipientName || `${order.user?.firstName} ${order.user?.lastName}`}</strong></p>
              {a.phone && <p><a className="phone-link" href={`tel:${a.phone}`}><Phone size={14} /> {a.phone}</a></p>}
              <p>{a.street}</p><p>{a.city} {a.zipCode}</p>
            </div>
            <div>
              <h4>Customer</h4>
              <p>{order.user?.firstName} {order.user?.lastName}</p>
              <p className="muted">{order.user?.guest ? 'Guest checkout (no account)' : order.user?.email}</p>
            </div>
          </section>

          <section className="drawer-section">
            <h4><StickyNote size={14} /> Internal note</h4>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Only visible to staff, e.g. 'Called, deliver after 5pm'" />
            <button className="btn-outline" disabled={saving || note === (order.adminNote || '')}
              onClick={() => run(() => api.put(`/api/admin/orders/${order.id}/note`, { note }), 'Note saved')}>Save note</button>
          </section>
        </div>

        <div className="drawer-foot">
          <button className="btn-primary" onClick={() => { if (!printInvoice(order)) toast.error('Allow pop-ups to print the invoice.'); }}>
            <Printer size={16} /> Print invoice
          </button>
        </div>
      </aside>
    </>
  );
}

export default function OrdersTab({ params, setParams }) {
  const toast = useToast();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q || '');
  const debouncedQ = useDebounced(q);
  const status = params.status || '';
  const payment = params.payment || '';
  const page = Number(params.page || 0);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/orders', { params: { q: debouncedQ || undefined, status: status || undefined, payment: payment || undefined, page, size: 20 } })
      .then(r => setData(r.data))
      .catch(e => toast.error(e))
      .finally(() => setLoading(false));
  }, [debouncedQ, status, payment, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load]);
  useEffect(() => { if (debouncedQ !== (params.q || '')) setParams({ q: debouncedQ || null, page: null }); }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link from the dashboard: ?tab=orders&open=ID
  useEffect(() => {
    if (!params.open) return;
    api.get(`/api/admin/orders/${params.open}`).then(r => setOpen(r.data)).catch(() => {});
  }, [params.open]);

  const onChanged = (updated) => {
    setOpen(updated);
    setData(d => ({ ...d, content: d.content.map(o => o.id === updated.id ? updated : o) }));
  };

  const exportCsv = async () => {
    try {
      const r = await api.get('/api/admin/orders/export', { params: { q: debouncedQ || undefined, status: status || undefined, payment: payment || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = url; link.download = `coreman-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e); }
  };

  return (
    <div className="admin-section">
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Order #, name, email or phone" aria-label="Search orders" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <select value={payment} onChange={e => setParams({ payment: e.target.value || null, page: null })} aria-label="Payment status">
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="btn-outline" onClick={load} aria-label="Refresh"><RefreshCw size={14} className={loading ? 'spin' : ''} /></button>
        <button className="btn-outline" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      <div className="seg" role="tablist" aria-label="Filter by status">
        {['', ...ORDER_STATUSES].map(s => (
          <button key={s || 'all'} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''}
            onClick={() => setParams({ status: s || null, page: null })}>{s ? STATUS_LABEL[s] : 'All'}</button>
        ))}
      </div>

      <div className="admin-table">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th className="r">Total</th><th>Status</th><th>Payment</th><th>Placed</th></tr></thead>
          <tbody>
            {data.content.map(o => (
              <tr key={o.id} className="clickable" onClick={() => setOpen(o)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(o)}>
                <td><strong>{o.orderNumber}</strong>{o.adminNote && <StickyNote size={12} className="note-flag" aria-label="Has note" />}</td>
                <td>{o.shippingAddress?.recipientName || `${o.user?.firstName} ${o.user?.lastName}`}
                  <small className="cell-sub">{o.shippingAddress?.phone || o.user?.email}{o.user?.guest ? ' · guest' : ''}</small></td>
                <td>{o.items?.reduce((s, i) => s + i.quantity, 0) || 0}</td>
                <td className="r"><strong>{taka(o.total)}</strong></td>
                <td><Pill value={o.status} /></td>
                <td><Pill value={o.paymentStatus} /></td>
                <td className="nowrap muted">{dateTime(o.createdAt)}</td>
              </tr>
            ))}
            {!loading && data.content.length === 0 && <EmptyRow cols={7}>No orders match.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} label="orders"
        onChange={p => setParams({ page: p || null })} />

      {open && <OrderDrawer order={open} toast={toast} onChanged={onChanged}
        onClose={() => { setOpen(null); if (params.open) setParams({ open: null }); }} />}
      {toast.node}
    </div>
  );
}
