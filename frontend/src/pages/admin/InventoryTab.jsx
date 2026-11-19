import { useEffect, useMemo, useState } from 'react';
import { Search, X, Download, ChevronDown, ChevronRight, Package, RefreshCw, ExternalLink } from 'lucide-react';
import api from '../../api/client';
import { useToast } from './shared';
import { sortSizes } from '../../utils/price';

const LOW = 5;
const DEPARTMENTS = [
  { id: 'MEN', label: 'Men' },
  { id: 'WOMEN', label: 'Women' },
  { id: 'UNISEX', label: 'Unisex' },
];

const stockOf = (p) => p.variants.reduce((s, v) => s + v.stock, 0);
const lowOf = (p) => p.variants.filter(v => v.stock > 0 && v.stock <= LOW).length;
const outOf = (p) => p.variants.filter(v => v.stock === 0).length;

/** One editable stock cell; saves on blur or Enter. */
function Cell({ v, onSaved, toast }) {
  const [val, setVal] = useState(v.stock);
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(v.stock), [v.stock]);
  const save = async () => {
    const n = Math.max(0, parseInt(val, 10) || 0);
    if (n === v.stock) { setVal(n); return; }
    setSaving(true);
    try { await api.put(`/api/admin/products/variants/${v.id}/stock`, { stockQuantity: n }); onSaved(v.id, n); toast.ok('Stock updated'); }
    catch (e) { setVal(v.stock); toast.error(e); }
    finally { setSaving(false); }
  };
  const n = Number(val);
  return (
    <input type="number" min="0" value={val} disabled={saving} title={v.sku || undefined}
      className={`inv-cell ${n === 0 ? 'out' : n <= LOW ? 'low' : ''}`}
      onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      onFocus={e => e.target.select()} aria-label={`${v.color} ${v.size} stock`} />
  );
}

/** Colour × size grid for one product. */
function StockMatrix({ product, onSaved, toast }) {
  const sizes = sortSizes([...new Set(product.variants.map(v => v.size || '—'))]);
  const colors = [...new Map(product.variants.map(v => [v.color, v.colorHex])).entries()];
  const find = (c, s) => product.variants.find(v => v.color === c && (v.size || '—') === s);
  return (
    <table className="inv-matrix">
      <thead><tr><th />{sizes.map(s => <th key={s}>{s}</th>)}<th className="r">Total</th></tr></thead>
      <tbody>
        {colors.map(([c, hex]) => {
          const rowTotal = product.variants.filter(v => v.color === c).reduce((s, v) => s + v.stock, 0);
          return (
            <tr key={c}>
              <th><span className="swatch" style={{ background: hex || '#ccc' }} /> {c}</th>
              {sizes.map(s => { const v = find(c, s); return <td key={s}>{v ? <Cell v={v} onSaved={onSaved} toast={toast} /> : <span className="inv-na">—</span>}</td>; })}
              <td className="r"><strong>{rowTotal}</strong></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function InventoryTab({ params, setParams }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const dept = params.dept || '';
  const show = params.show || ''; // '' | low | out
  const hideHidden = params.hidden === 'hide';

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/api/admin/inventory'), api.get('/api/categories')])
      .then(([inv, cats]) => { setItems(inv.data); setTree(cats.data || []); })
      .catch(e => toast.error(e))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Category order = menu order (depth-first through the tree).
  const catOrder = useMemo(() => {
    const m = new Map(); let i = 0;
    const walk = (list) => list.forEach(c => { m.set(c.id, i++); walk(c.children || []); });
    walk(tree);
    return m;
  }, [tree]);

  const onSaved = (productId) => (variantId, n) => setItems(list => list.map(p => p.id !== productId ? p
    : { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, stock: n } : v) }));

  const filtered = useMemo(() => (items || []).filter(p => {
    if (dept && p.gender !== dept) return false;
    if (hideHidden && !p.active) return false;
    if (show === 'low' && lowOf(p) === 0 && outOf(p) === 0) return false;
    if (show === 'out' && outOf(p) === 0) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.variants.some(v => (v.sku || '').toLowerCase().includes(s))
        && !p.categoryPath.join(' ').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [items, dept, hideHidden, show, q]);

  // department → category → products
  const sections = useMemo(() => DEPARTMENTS.map(d => {
    const products = filtered.filter(p => p.gender === d.id);
    const groups = new Map();
    products.forEach(p => {
      const key = p.categoryId ?? 'none';
      if (!groups.has(key)) groups.set(key, { key, label: p.categoryPath.length ? p.categoryPath.join(' › ') : 'Uncategorised', order: p.categoryId != null ? (catOrder.get(p.categoryId) ?? 9999) : 99999, products: [] });
      groups.get(key).products.push(p);
    });
    return { ...d, products, groups: [...groups.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)) };
  }).filter(s => s.products.length > 0), [filtered, catOrder]);

  const totals = (list) => ({
    products: list.length,
    units: list.reduce((s, p) => s + stockOf(p), 0),
    low: list.reduce((s, p) => s + lowOf(p), 0),
    out: list.reduce((s, p) => s + outOf(p), 0),
  });
  const all = totals(items || []);

  const toggle = (key) => setCollapsed(c => ({ ...c, [key]: !c[key] }));
  const setAll = (value) => {
    const next = {};
    sections.forEach(s => { next[s.id] = value; s.groups.forEach(g => { next[`${s.id}:${g.key}`] = value; }); });
    setCollapsed(next);
  };

  const exportCsv = () => {
    const q2 = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const rows = [['Department', 'Category', 'Product', 'Visible', 'Colour', 'Size', 'SKU', 'Stock']];
    sections.forEach(s => s.groups.forEach(g => g.products.forEach(p => sortVariants(p.variants).forEach(v =>
      rows.push([s.label, g.label, p.name, p.active ? 'Yes' : 'No', v.color, v.size, v.sku || '', v.stock])))));
    const blob = new Blob(['﻿' + rows.map(r => r.map(q2).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `coreman-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!items) return <div className="kpi-grid">{[...Array(3)].map((_, i) => <div key={i} className="kpi card skeleton" style={{ height: 110 }} />)}</div>;

  return (
    <div className="admin-section inventory">
      <div className="inv-summary">
        <button className={`inv-sum card ${dept === '' ? 'active' : ''}`} onClick={() => setParams({ dept: null })}>
          <span className="kpi-label">All departments</span>
          <strong>{all.units.toLocaleString()} units</strong>
          <small>{all.products} products · {all.low} low · {all.out} out</small>
        </button>
        {DEPARTMENTS.map(d => {
          const t = totals((items || []).filter(p => p.gender === d.id));
          if (t.products === 0) return null;
          return (
            <button key={d.id} className={`inv-sum card ${dept === d.id ? 'active' : ''}`} onClick={() => setParams({ dept: dept === d.id ? null : d.id })}>
              <span className="kpi-label">{d.label}</span>
              <strong>{t.units.toLocaleString()} units</strong>
              <small>{t.products} products · <span className={t.low ? 'warn' : ''}>{t.low} low</span> · <span className={t.out ? 'bad' : ''}>{t.out} out</span></small>
            </button>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="search-box"><Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Product, category or SKU" aria-label="Search inventory" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <button className="btn-outline" onClick={load} aria-label="Refresh"><RefreshCw size={14} className={loading ? 'spin' : ''} /></button>
        <button className="btn-outline" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      <div className="inv-controls">
        <div className="seg">
          {[['', 'All stock'], ['low', 'Low or out'], ['out', 'Out of stock']].map(([v, l]) => (
            <button key={l} className={show === v ? 'active' : ''} onClick={() => setParams({ show: v || null })}>{l}</button>
          ))}
          <button className={hideHidden ? 'active' : ''} onClick={() => setParams({ hidden: hideHidden ? null : 'hide' })}>Hide hidden products</button>
        </div>
        <div className="inv-expand">
          <button className="link-btn" onClick={() => setAll(false)}>Expand all</button>
          <button className="link-btn" onClick={() => setAll(true)}>Collapse all</button>
        </div>
      </div>
      <p className="inv-legend"><span className="inv-key low" /> {LOW} or fewer <span className="inv-key out" /> out of stock · click a number to edit, Enter to save</p>

      {sections.length === 0 && <p className="admin-empty">No products match.</p>}

      {sections.map(s => {
        const st = totals(s.products);
        const open = !collapsed[s.id];
        return (
          <section key={s.id} className="inv-dept">
            <button className="inv-dept-head" onClick={() => toggle(s.id)} aria-expanded={open}>
              {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <h2>{s.label}</h2>
              <span className="inv-meta">{st.products} products · <strong>{st.units.toLocaleString()} units</strong>
                {st.low > 0 && <span className="warn"> · {st.low} low</span>}{st.out > 0 && <span className="bad"> · {st.out} out</span>}</span>
            </button>

            {open && s.groups.map(g => {
              const gt = totals(g.products);
              const gKey = `${s.id}:${g.key}`;
              const gOpen = !collapsed[gKey];
              return (
                <div key={gKey} className="inv-cat card">
                  <button className="inv-cat-head" onClick={() => toggle(gKey)} aria-expanded={gOpen}>
                    {gOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="inv-cat-name">{g.label}</span>
                    <span className="inv-meta">{gt.products} {gt.products === 1 ? 'product' : 'products'} · <strong>{gt.units.toLocaleString()}</strong>
                      {gt.low > 0 && <span className="warn"> · {gt.low} low</span>}{gt.out > 0 && <span className="bad"> · {gt.out} out</span>}</span>
                  </button>
                  {gOpen && g.products.map(p => (
                    <div key={p.id} className={`inv-product ${p.active ? '' : 'hidden-product'}`}>
                      <div className="inv-product-info">
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="table-img" /> : <div className="table-img placeholder"><Package size={16} /></div>}
                        <div>
                          <strong>{p.name}</strong>
                          <small className="cell-sub">{stockOf(p)} in stock{!p.active && ' · hidden from shop'}</small>
                          <a className="inv-link" href={`/product/${p.slug}`} target="_blank" rel="noreferrer">View <ExternalLink size={11} /></a>
                        </div>
                      </div>
                      <div className="inv-matrix-wrap"><StockMatrix product={p} onSaved={onSaved(p.id)} toast={toast} /></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
      {toast.node}
    </div>
  );
}

function sortVariants(variants) {
  const order = sortSizes([...new Set(variants.map(v => v.size))]);
  return [...variants].sort((a, b) => a.color.localeCompare(b.color) || order.indexOf(a.size) - order.indexOf(b.size));
}
