import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { Package, Plus, Edit2, Trash2, X, Save, Image, Layers, Copy, ExternalLink, Search, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { uploadImage } from '../../api/supabase';
import { Pagination, EmptyRow, taka, useDebounced, useToast } from './shared';

const LOW = 5;
const blankVariant = () => ({ size: '', color: '', colorHex: '#000000', sku: '', stockQuantity: 0 });
const blankForm = () => ({
  name: '', slug: '', description: '', basePrice: '', compareAtPrice: '', brand: 'CoreMan',
  gender: 'MEN', categoryId: '', isActive: true, isFeatured: false, images: [], variants: [blankVariant()],
});
const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const STATUS_FILTERS = [
  ['', 'All'], ['active', 'Active'], ['inactive', 'Hidden'], ['featured', 'Featured'],
  ['sale', 'On sale'], ['lowstock', 'Low stock'], ['outofstock', 'Out of stock'],
];

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
  );
}

/** Stock cell editor: saves on blur / Enter. */
function StockInput({ variant, onSaved, toast }) {
  const [v, setV] = useState(variant.stockQuantity);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(variant.stockQuantity), [variant.stockQuantity]);
  const save = async () => {
    const n = Math.max(0, parseInt(v, 10) || 0);
    if (n === variant.stockQuantity) { setV(n); return; }
    setSaving(true);
    try { await api.put(`/api/admin/products/variants/${variant.id}/stock`, { stockQuantity: n }); onSaved(variant.id, n); toast.ok('Stock updated'); }
    catch (e) { toast.error(e); setV(variant.stockQuantity); }
    finally { setSaving(false); }
  };
  return (
    <input type="number" min="0" className={`stock-edit ${v <= 0 ? 'out' : v <= LOW ? 'low' : ''}`} value={v} disabled={saving}
      onChange={e => setV(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label={`Stock for ${variant.size} ${variant.color}`} />
  );
}

export default function ProductsTab({ params, setParams }) {
  const toast = useToast();
  const formRef = useRef(null);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(params.q || '');
  const debouncedQ = useDebounced(q);
  const status = params.status || '';
  const categoryId = params.category || '';
  const page = Number(params.page || 0);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(blankForm());

  useEffect(() => { api.get('/api/categories').then(r => setCategories(r.data || [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/products', { params: { q: debouncedQ || undefined, status: status || undefined, categoryId: categoryId || undefined, page, size: 20 } })
      .then(r => setData(r.data))
      .catch(e => toast.error(e))
      .finally(() => setLoading(false));
  }, [debouncedQ, status, categoryId, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  useEffect(() => { if (debouncedQ !== (params.q || '')) setParams({ q: debouncedQ || null, page: null }); }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const flatCats = [];
  const walk = (list, depth) => list.forEach(c => { flatCats.push({ id: c.id, label: `${'  '.repeat(depth)}${depth ? '└ ' : ''}${c.name}` }); walk(c.children || [], depth + 1); });
  walk(categories, 0);

  const patchRow = (id, changes) => setData(d => ({ ...d, content: d.content.map(p => p.id === id ? { ...p, ...changes } : p) }));

  const quickToggle = async (p, field, value) => {
    patchRow(p.id, { [field]: value });
    try { await api.put(`/api/admin/products/${p.id}`, { [field]: value }); toast.ok(field === 'isActive' ? (value ? 'Visible in shop' : 'Hidden from shop') : (value ? 'Featured' : 'Not featured')); }
    catch (e) { patchRow(p.id, { [field]: !value }); toast.error(e); }
  };

  const stockSaved = (productId) => (variantId, n) =>
    setData(d => ({ ...d, content: d.content.map(p => p.id !== productId ? p : { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, stockQuantity: n } : v) }) }));

  const openNew = () => { setForm(blankForm()); setEditing(null); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); };
  const openEdit = (p) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description || '', basePrice: p.basePrice, compareAtPrice: p.compareAtPrice ?? '',
      brand: p.brand || 'CoreMan', gender: p.gender || 'MEN', categoryId: p.category?.id || '',
      isActive: p.isActive ?? true, isFeatured: p.isFeatured ?? false,
      images: p.images?.map(i => ({ imageUrl: i.imageUrl })) || [],
      variants: p.variants?.length ? p.variants.map(v => ({ size: v.size, color: v.color, colorHex: v.colorHex || '#000000', sku: v.sku || '', stockQuantity: v.stockQuantity })) : [blankVariant()],
    });
    setEditing(p.id); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      basePrice: Number(form.basePrice),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      images: form.images.filter(i => i.imageUrl),
      variants: form.variants.filter(v => v.size && v.color),
    };
    if (body.variants.length === 0) { toast.error('Add at least one variant with a size and colour.'); return; }
    try {
      if (editing) await api.put(`/api/admin/products/${editing}`, body);
      else await api.post('/api/admin/products', body);
      toast.ok(editing ? 'Product updated' : 'Product created');
      setShowForm(false); setEditing(null); setForm(blankForm()); load();
    } catch (err) { toast.error(err); }
  };

  const duplicate = async (p) => {
    try { const r = await api.post(`/api/admin/products/${p.id}/duplicate`); toast.ok('Copy created (hidden, stock 0)'); load(); openEdit(r.data); }
    catch (e) { toast.error(e); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try { await api.delete(`/api/admin/products/${p.id}`); toast.ok('Product deleted'); load(); }
    catch (e) { toast.error(e); }
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploading(true);
    try { const urls = await Promise.all(files.map(uploadImage)); setForm(f => ({ ...f, images: [...f.images, ...urls.map(imageUrl => ({ imageUrl }))] })); }
    catch (err) { toast.error(err); }
    setUploading(false); e.target.value = '';
  };
  const setVariant = (i, k, val) => setForm(f => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, [k]: val } : v) }));
  const moveImage = (i, dir) => setForm(f => { const imgs = [...f.images]; const j = i + dir; if (j < 0 || j >= imgs.length) return f; [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; return { ...f, images: imgs }; });
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="admin-section">
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, slug or SKU" aria-label="Search products" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <select value={categoryId} onChange={e => setParams({ category: e.target.value || null, page: null })} aria-label="Category">
          <option value="">All categories</option>
          {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button className="btn-primary" onClick={showForm ? () => setShowForm(false) : openNew}>
          {showForm ? <><X size={16} /> Close form</> : <><Plus size={16} /> Add product</>}
        </button>
      </div>

      <div className="seg">
        {STATUS_FILTERS.map(([v, label]) => (
          <button key={label} className={status === v ? 'active' : ''} onClick={() => setParams({ status: v || null, page: null })}>{label}</button>
        ))}
      </div>

      {showForm && (
        <form ref={formRef} className="admin-form card" onSubmit={submit}>
          <div className="panel-head"><h3>{editing ? 'Edit product' : 'New product'}</h3>
            <button type="button" className="btn-icon" onClick={() => setShowForm(false)} aria-label="Close form"><X size={18} /></button></div>
          <div className="form-grid">
            <div className="form-group"><label>Name *</label>
              <input value={form.name} required onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) })} /></div>
            <div className="form-group"><label>Slug (web address)</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: autoSlug(e.target.value) })} /></div>
            <div className="form-group"><label>Price (BDT) *</label>
              <input type="number" step="0.01" min="0" required value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} /></div>
            <div className="form-group"><label>Compare-at price (BDT)</label>
              <input type="number" step="0.01" min="0" value={form.compareAtPrice ?? ''} placeholder="Original price, if on sale" onChange={e => setForm({ ...form, compareAtPrice: e.target.value })} />
              {form.compareAtPrice && Number(form.compareAtPrice) > Number(form.basePrice) && (
                <small className="form-hint ok">Shows as {Math.round((1 - form.basePrice / form.compareAtPrice) * 100)}% off</small>)}
              {form.compareAtPrice && Number(form.compareAtPrice) <= Number(form.basePrice) && (
                <small className="form-hint warn">Must be higher than the price to show as a sale.</small>)}
            </div>
            <div className="form-group"><label>Category</label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select category</option>
                {flatCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select></div>
            <div className="form-group"><label>Department</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="MEN">Men</option><option value="WOMEN">Women</option><option value="UNISEX">Unisex</option>
              </select></div>
            <div className="form-group"><label>Brand</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
            <div className="form-group form-switches">
              <label className="checkbox-label"><Toggle checked={form.isActive} label="Active" onChange={v => setForm({ ...form, isActive: v })} /> Visible in shop</label>
              <label className="checkbox-label"><Toggle checked={form.isFeatured} label="Featured" onChange={v => setForm({ ...form, isFeatured: v })} /> Featured / best seller</label>
            </div>
            <div className="form-group full-width"><label>Description</label>
              <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>

          <div className="form-section">
            <div className="section-header"><h4><Image size={16} /> Images</h4><span className="panel-sub">First image is the main photo</span></div>
            <div className="image-grid">
              {form.images.map((img, i) => (
                <div key={i} className="image-card">
                  <img src={img.imageUrl} alt="" />
                  <button type="button" className="remove-btn" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))} aria-label="Remove image"><X size={14} /></button>
                  {i === 0 ? <span className="primary-badge">Main</span> : (
                    <button type="button" className="make-main" onClick={() => moveImage(i, -i)}>Make main</button>)}
                </div>
              ))}
              <label className="file-upload-area image-card">
                <input type="file" accept="image/*" multiple onChange={upload} hidden />
                <div className="upload-content"><Image size={22} /><p>{uploading ? 'Uploading…' : 'Upload'}</p></div>
              </label>
            </div>
            <div className="inline-field" style={{ marginTop: 10 }}>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="…or paste an image URL (https://)" />
              <button type="button" className="btn-outline" disabled={!/^https:\/\//.test(urlInput)}
                onClick={() => { setForm(f => ({ ...f, images: [...f.images, { imageUrl: urlInput.trim() }] })); setUrlInput(''); }}>Add</button>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header"><h4><Layers size={16} /> Variants</h4>
              <button type="button" className="btn-outline" onClick={() => setForm(f => ({ ...f, variants: [...f.variants, blankVariant()] }))}><Plus size={14} /> Add variant</button></div>
            <div className="variant-head"><span>Size</span><span>Colour</span><span /><span>SKU</span><span>Stock</span><span /></div>
            {form.variants.map((v, i) => (
              <div key={i} className="variant-row">
                <input placeholder="S, M, L, XL" value={v.size} onChange={e => setVariant(i, 'size', e.target.value)} />
                <input placeholder="Colour name" value={v.color} onChange={e => setVariant(i, 'color', e.target.value)} />
                <input type="color" value={v.colorHex} onChange={e => setVariant(i, 'colorHex', e.target.value)} className="color-input" aria-label="Colour swatch" />
                <input placeholder="SKU" value={v.sku} onChange={e => setVariant(i, 'sku', e.target.value)} />
                <input type="number" min="0" value={v.stockQuantity} onChange={e => setVariant(i, 'stockQuantity', Number(e.target.value))} className="stock-input" aria-label="Stock" />
                <button type="button" className="btn-icon btn-danger" disabled={form.variants.length === 1}
                  onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))} aria-label="Remove variant"><X size={14} /></button>
              </div>
            ))}
            <p className="panel-sub">Total stock: {form.variants.reduce((s, v) => s + (Number(v.stockQuantity) || 0), 0)}</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary"><Save size={16} /> {editing ? 'Save changes' : 'Create product'}</button>
          </div>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead><tr><th /><th>Product</th><th className="r">Price</th><th>Category</th><th>Stock</th><th>Visible</th><th>Featured</th><th /></tr></thead>
          <tbody>
            {data.content.map(p => {
              const stock = p.variants?.reduce((s, v) => s + v.stockQuantity, 0) ?? 0;
              const low = p.variants?.some(v => v.stockQuantity <= LOW);
              const isOpen = expanded === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className={!p.isActive ? 'row-muted' : ''}>
                    <td>{p.images?.[0] ? <img src={p.images[0].imageUrl} alt="" className="table-img" /> : <div className="table-img placeholder"><Package size={18} /></div>}</td>
                    <td><strong>{p.name}</strong><small className="cell-sub">{p.slug}</small></td>
                    <td className="r nowrap">{taka(p.basePrice)}{p.compareAtPrice > p.basePrice && <small className="cell-sub"><s>{taka(p.compareAtPrice)}</s> · −{Math.round((1 - p.basePrice / p.compareAtPrice) * 100)}%</small>}</td>
                    <td>{p.category?.name || <span className="muted">—</span>}</td>
                    <td>
                      <button className={`stock-pill ${stock === 0 ? 'out' : low ? 'low' : ''}`} onClick={() => setExpanded(isOpen ? null : p.id)} aria-expanded={isOpen}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {stock} in stock
                      </button>
                    </td>
                    <td><Toggle checked={!!p.isActive} label="Visible in shop" onChange={v => quickToggle(p, 'isActive', v)} /></td>
                    <td><Toggle checked={!!p.isFeatured} label="Featured" onChange={v => quickToggle(p, 'isFeatured', v)} /></td>
                    <td className="actions">
                      <a className="btn-icon" href={`/product/${p.slug}`} target="_blank" rel="noreferrer" aria-label="View in shop" title="View in shop"><ExternalLink size={16} /></a>
                      <button className="btn-icon" onClick={() => openEdit(p)} aria-label="Edit" title="Edit"><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => duplicate(p)} aria-label="Duplicate" title="Duplicate"><Copy size={16} /></button>
                      <button className="btn-icon btn-danger" onClick={() => remove(p)} aria-label="Delete" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="stock-detail-row">
                      <td />
                      <td colSpan={7}>
                        <div className="stock-grid">
                          {p.variants.map(v => (
                            <label key={v.id} className="stock-cell">
                              <span className="swatch" style={{ background: v.colorHex || '#ccc' }} />
                              <span>{v.size} / {v.color}{v.sku && <small>{v.sku}</small>}</span>
                              <StockInput variant={v} toast={toast} onSaved={stockSaved(p.id)} />
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && data.content.length === 0 && <EmptyRow cols={8}>No products match.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} label="products"
        onChange={p => setParams({ page: p || null })} />
      {toast.node}
    </div>
  );
}
