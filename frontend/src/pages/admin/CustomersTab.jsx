import { useEffect, useState, useCallback } from 'react';
import { Search, X, Mail, Phone } from 'lucide-react';
import api from '../../api/client';
import { Pill, Pagination, EmptyRow, taka, dateOnly, dateTime, relative, useDebounced, useToast } from './shared';

function CustomerDrawer({ id, onClose, go }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/api/admin/customers/${id}`).then(r => setD(r.data)).catch(() => {}); }, [id]);
  const c = d?.customer;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" aria-label="Customer">
        <div className="drawer-head">
          <div><h2>{c?.name || 'Loading…'}</h2>{c && <p className="panel-sub">Customer since {dateOnly(c.joinedAt)}</p>}</div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {c && (
          <div className="drawer-body">
            <div className="mini-kpis">
              <div><span>Orders</span><strong>{c.orders}</strong></div>
              <div><span>Total spent</span><strong>{taka(c.totalSpent)}</strong></div>
              <div><span>Avg order</span><strong>{c.orders ? taka(Number(c.totalSpent) / c.orders) : '—'}</strong></div>
            </div>
            <section className="drawer-section">
              <h4>Contact</h4>
              {c.email ? <p><a className="phone-link" href={`mailto:${c.email}`}><Mail size={14} /> {c.email}</a></p> : <p className="muted">Guest checkout (no account)</p>}
              {[...new Set([c.phone, ...d.addresses.map(a => a.phone)].filter(Boolean))].map(p => (
                <p key={p}><a className="phone-link" href={`tel:${p}`}><Phone size={14} /> {p}</a></p>
              ))}
            </section>
            <section className="drawer-section">
              <h4>Orders</h4>
              {d.orders.length === 0 ? <p className="muted">No orders yet.</p> : d.orders.map(o => (
                <button key={o.id} className="mini-row" onClick={() => go('orders', { open: o.id })}>
                  <span><strong>{o.orderNumber}</strong><small>{dateTime(o.createdAt)} · {o.items} items</small></span>
                  <span className="mini-right"><strong>{taka(o.total)}</strong><Pill value={o.status} /></span>
                </button>
              ))}
            </section>
            {d.addresses.length > 0 && (
              <section className="drawer-section">
                <h4>Saved addresses</h4>
                {[...new Map(d.addresses.map(a => [`${a.street}|${a.city}|${a.zipCode}`, a])).values()].map(a => (
                  <p key={a.id} className="addr">{a.recipientName && <strong>{a.recipientName}<br /></strong>}{a.street}, {a.city} {a.zipCode}</p>
                ))}
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default function CustomersTab({ params, setParams, go }) {
  const toast = useToast();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q || '');
  const debouncedQ = useDebounced(q);
  const page = Number(params.page || 0);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/customers', { params: { q: debouncedQ || undefined, page, size: 20 } })
      .then(r => setData(r.data)).catch(e => toast.error(e)).finally(() => setLoading(false));
  }, [debouncedQ, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  useEffect(() => { if (debouncedQ !== (params.q || '')) setParams({ q: debouncedQ || null, page: null }); }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="admin-section">
      <div className="toolbar">
        <div className="search-box"><Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email or phone" aria-label="Search customers" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
      </div>
      <div className="admin-table">
        <table>
          <thead><tr><th>Customer</th><th>Joined</th><th className="r">Orders</th><th className="r">Total spent</th><th>Last order</th></tr></thead>
          <tbody>
            {data.content.map(c => (
              <tr key={c.id} className="clickable" onClick={() => setOpen(c.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(c.id)}>
                <td><strong>{c.name}</strong>{c.role === 'ADMIN' && <span className="pill pill-admin">Admin</span>}{c.role === 'GUEST' && <span className="pill pill-unpaid" style={{ marginLeft: 8 }}>Guest</span>}<small className="cell-sub">{c.email || c.phone}</small></td>
                <td className="nowrap muted">{dateOnly(c.joinedAt)}</td>
                <td className="r">{c.orders}</td>
                <td className="r"><strong>{taka(c.totalSpent)}</strong></td>
                <td className="muted nowrap">{c.lastOrderAt ? relative(c.lastOrderAt) : '—'}</td>
              </tr>
            ))}
            {!loading && data.content.length === 0 && <EmptyRow cols={5}>No customers match.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} label="customers"
        onChange={p => setParams({ page: p || null })} />
      {open && <CustomerDrawer id={open} onClose={() => setOpen(null)} go={go} />}
      {toast.node}
    </div>
  );
}
