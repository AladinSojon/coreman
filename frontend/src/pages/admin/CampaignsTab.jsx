import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Save, Search, Link2, Square, Trash2, Image as ImageIcon, Megaphone } from 'lucide-react';
import api from '../../api/client';
import { uploadImage } from '../../api/supabase';
import CampaignBanner from '../../components/CampaignBanner';
import { EmptyRow, Pill, taka, dateTime, useDebounced, useToast } from './shared';

const THEMES = [['dark', 'Black'], ['red', 'Red'], ['gold', 'Gold'], ['green', 'Green']];
const autoSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** ISO time ⇄ the value a <input type="datetime-local"> uses (this computer's time zone). */
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v) => new Date(v).toISOString();

function blank() {
  const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1);
  const end = new Date(start); end.setDate(end.getDate() + 3); end.setHours(23, 59, 0, 0);
  return {
    name: '', slug: '', discountPercent: 20, scope: 'ALL', categoryIds: [], productIds: [],
    startsAt: toLocalInput(start), endsAt: toLocalInput(end), enabled: true,
    headline: '', subheadline: '', announcement: '', bannerImageUrl: '', theme: 'dark', showCountdown: true,
  };
}

/** Category tree as indented rows. */
function treeRows(cats) {
  const byParent = new Map();
  cats.forEach(c => { const p = c.parent?.id ?? null; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(c); });
  byParent.forEach(l => l.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id));
  const rows = [];
  const walk = (p, depth) => (byParent.get(p) || []).forEach(c => { rows.push({ ...c, depth }); walk(c.id, depth + 1); });
  walk(null, 0);
  return rows;
}

function scopeText(c, catNames) {
  if (c.scope === 'ALL') return 'Whole shop';
  if (c.scope === 'CATEGORIES') {
    const names = c.categoryIds.map(id => catNames.get(id)).filter(Boolean);
    return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }
  return `${c.productIds.length} chosen ${c.productIds.length === 1 ? 'product' : 'products'}`;
}

function ProductPicker({ chosen, onChange }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [results, setResults] = useState([]);
  const [known, setKnown] = useState(new Map()); // id -> product, for chosen chips

  useEffect(() => {
    api.get('/api/admin/products', { params: { q: dq || undefined, size: 8 } })
      .then(r => { setResults(r.data.content || []); setKnown(m => { const n = new Map(m); (r.data.content || []).forEach(p => n.set(p.id, p)); return n; }); })
      .catch(() => {});
  }, [dq]);

  // Names for products chosen earlier that aren't in the current search.
  useEffect(() => {
    chosen.filter(id => !known.has(id)).forEach(id => api.get(`/api/admin/products/${id}`)
      .then(r => setKnown(m => new Map(m).set(id, r.data))).catch(() => {}));
  }, [chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => onChange(chosen.includes(id) ? chosen.filter(x => x !== id) : [...chosen, id]);
  return (
    <div className="campaign-picker">
      {chosen.length > 0 && (
        <div className="chip-row">
          {chosen.map(id => (
            <span key={id} className="chip">{known.get(id)?.name || `#${id}`}
              <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${known.get(id)?.name || id}`}><X size={12} /></button></span>
          ))}
        </div>
      )}
      <div className="search-box"><Search size={16} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products to add" aria-label="Search products" /></div>
      <div className="pick-list">
        {results.map(p => (
          <label key={p.id} className="pick-row">
            <input type="checkbox" checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} />
            {p.images?.[0]?.imageUrl ? <img src={p.images[0].imageUrl} alt="" /> : <span className="pick-noimg" />}
            <span className="grow">{p.name}<small>{taka(p.basePrice)}{p.isActive ? '' : ' · hidden'}</small></span>
          </label>
        ))}
        {results.length === 0 && <p className="muted" style={{ padding: 8 }}>No products match.</p>}
      </div>
    </div>
  );
}

export default function CampaignsTab() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null); // null = closed
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => api.get('/api/admin/campaigns').then(r => setList(r.data)).catch(e => { setList([]); toast.error(e); });
  useEffect(() => {
    load();
    api.get('/api/admin/categories').then(r => setCats(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => treeRows(cats), [cats]);
  const catNames = useMemo(() => new Map(cats.map(c => [c.id, c.name])), [cats]);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const startNew = () => { setEditing(null); setForm(blank()); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const startEdit = (c) => {
    setEditing(c.id);
    setForm({
      ...c, categoryIds: [...c.categoryIds], productIds: [...c.productIds],
      startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt),
      headline: c.headline || '', subheadline: c.subheadline || '', announcement: c.announcement || '', bannerImageUrl: c.bannerImageUrl || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.startsAt || !form.endsAt) return toast.error('Set a start and an end time.');
    const body = { ...form, discountPercent: Number(form.discountPercent), startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
    setSaving(true);
    try {
      if (editing) await api.put(`/api/admin/campaigns/${editing}`, body);
      else await api.post('/api/admin/campaigns', body);
      toast.ok(editing ? 'Campaign saved' : 'Campaign created');
      setForm(null); setEditing(null); load();
    } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const endNow = async (c) => {
    if (!window.confirm(`End "${c.name}" now? Prices go back to normal straight away.`)) return;
    try { await api.post(`/api/admin/campaigns/${c.id}/end`); toast.ok('Campaign ended'); load(); } catch (e) { toast.error(e); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? ${c.orders ? 'Its orders stay, but its results disappear from this list.' : ''}`)) return;
    try { await api.delete(`/api/admin/campaigns/${c.id}`); toast.ok('Campaign deleted'); if (editing === c.id) setForm(null); load(); } catch (e) { toast.error(e); }
  };
  const copyLink = async (c) => {
    const url = `${window.location.origin}/sale/${c.slug}`;
    try { await navigator.clipboard.writeText(url); toast.ok('Sale link copied'); } catch { window.prompt('Copy the sale link:', url); }
  };

  const example = 1500;
  const preview = form && {
    ...form, slug: form.slug || autoSlug(form.name) || 'sale', name: form.name || 'Sale name',
    discountPercent: Number(form.discountPercent) || 0, status: 'LIVE',
    startsAt: form.startsAt ? fromLocalInput(form.startsAt) : null, endsAt: form.endsAt ? fromLocalInput(form.endsAt) : null,
  };

  return (
    <div className="admin-section">
      <div className="toolbar">
        <p className="panel-sub" style={{ margin: 0, flex: 1, minWidth: 220 }}>Timed sales with automatic prices, a home-page banner, the top bar and a sale page to share.</p>
        <button className="btn-primary" onClick={() => (form ? setForm(null) : startNew())}>
          {form ? <><X size={16} /> Close form</> : <><Plus size={16} /> New campaign</>}
        </button>
      </div>

      {form && (
        <form className="admin-form card" onSubmit={submit}>
          <div className="panel-head"><h3>{editing ? 'Edit campaign' : 'New campaign'}</h3></div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="cp-name">Name *</label>
              <input id="cp-name" required value={form.name} placeholder="Black Friday Sale"
                onChange={e => set({ name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) })} /></div>
            <div className="form-group"><label htmlFor="cp-slug">Sale page address</label>
              <input id="cp-slug" value={form.slug} onChange={e => set({ slug: autoSlug(e.target.value) })} placeholder="black-friday-sale" />
              <small className="form-hint">{window.location.host}/sale/{form.slug || '…'}</small></div>

            <div className="form-group"><label htmlFor="cp-pct">Discount (% off) *</label>
              <input id="cp-pct" type="number" min={1} max={90} required value={form.discountPercent} onChange={e => set({ discountPercent: e.target.value })} />
              <small className="form-hint">e.g. {taka(example)} → {taka(Math.round(example * (100 - (Number(form.discountPercent) || 0)) / 100))}. Taken off the regular price; items already cheaper keep their price.</small></div>
            <div className="form-group form-switches">
              <label className="checkbox-label"><input type="checkbox" checked={form.enabled} onChange={e => set({ enabled: e.target.checked })} /> Campaign switched on</label>
              <label className="checkbox-label"><input type="checkbox" checked={form.showCountdown} onChange={e => set({ showCountdown: e.target.checked })} /> Show countdown timer</label>
            </div>

            <div className="form-group"><label htmlFor="cp-start">Starts *</label>
              <input id="cp-start" type="datetime-local" required value={form.startsAt} onChange={e => set({ startsAt: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="cp-end">Ends *</label>
              <input id="cp-end" type="datetime-local" required value={form.endsAt} min={form.startsAt} onChange={e => set({ endsAt: e.target.value })} /></div>

            <div className="form-group full-width"><label>Applies to *</label>
              <div className="seg">
                {[['ALL', 'Whole shop'], ['CATEGORIES', 'Categories'], ['PRODUCTS', 'Chosen products']].map(([v, l]) => (
                  <button key={v} type="button" className={form.scope === v ? 'active' : ''} aria-pressed={form.scope === v} onClick={() => set({ scope: v })}>{l}</button>
                ))}
              </div>
              {form.scope === 'CATEGORIES' && (
                <div className="pick-list tree">
                  {rows.map(c => (
                    <label key={c.id} className="pick-row" style={{ paddingLeft: 8 + c.depth * 20 }}>
                      <input type="checkbox" checked={form.categoryIds.includes(c.id)}
                        onChange={() => set({ categoryIds: form.categoryIds.includes(c.id) ? form.categoryIds.filter(x => x !== c.id) : [...form.categoryIds, c.id] })} />
                      <span className="grow">{c.name}</span>
                    </label>
                  ))}
                  <small className="form-hint" style={{ padding: 8 }}>Ticking a category includes everything inside it (e.g. Menswear covers all men's categories).</small>
                </div>
              )}
              {form.scope === 'PRODUCTS' && <ProductPicker chosen={form.productIds} onChange={ids => set({ productIds: ids })} />}
            </div>

            <div className="form-group full-width"><h4 className="form-subhead"><Megaphone size={16} /> What shoppers see</h4></div>
            <div className="form-group"><label htmlFor="cp-head">Banner headline</label>
              <input id="cp-head" value={form.headline} maxLength={120} onChange={e => set({ headline: e.target.value })} placeholder={form.name || 'Black Friday Sale'} /></div>
            <div className="form-group"><label htmlFor="cp-theme">Banner colour</label>
              <select id="cp-theme" value={form.theme} onChange={e => set({ theme: e.target.value })}>
                {THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="form-group full-width"><label htmlFor="cp-sub">Banner text</label>
              <input id="cp-sub" value={form.subheadline} maxLength={240} onChange={e => set({ subheadline: e.target.value })}
                placeholder={`Up to ${form.discountPercent || 0}% off — limited time only.`} /></div>
            <div className="form-group full-width"><label htmlFor="cp-ann">Top bar text</label>
              <input id="cp-ann" value={form.announcement} maxLength={140} onChange={e => set({ announcement: e.target.value })}
                placeholder={`${form.name || 'Black Friday Sale'}: up to ${form.discountPercent || 0}% off`} />
              <small className="form-hint">The strip at the very top of every page while the sale is live.</small></div>
            <div className="form-group full-width"><label>Banner photo (optional)</label>
              <div className="cat-image-row">
                {form.bannerImageUrl ? (
                  <div className="image-card"><img src={form.bannerImageUrl} alt="" />
                    <button type="button" className="remove-btn" onClick={() => set({ bannerImageUrl: '' })} aria-label="Remove photo"><X size={14} /></button></div>
                ) : (
                  <label className="file-upload-area image-card">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={async (e) => {
                      const f = e.target.files[0]; if (!f) return;
                      setUploading(true);
                      try { set({ bannerImageUrl: await uploadImage(f) }); } catch (err) { toast.error(err); }
                      setUploading(false); e.target.value = '';
                    }} />
                    <div className="upload-content"><ImageIcon size={22} /><p>{uploading ? 'Uploading…' : 'Upload'}</p></div>
                  </label>
                )}
                <input value={form.bannerImageUrl} onChange={e => set({ bannerImageUrl: e.target.value })} placeholder="…or paste an image URL" />
              </div>
              <small className="form-hint">A wide photo works best (e.g. 1600×600). Text stays readable on the left.</small></div>
          </div>

          <div className="campaign-preview">
            <span className="form-hint">Preview</span>
            <CampaignBanner campaign={preview} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}</button>
          </div>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead><tr><th>Campaign</th><th>Applies to</th><th>When</th><th>Status</th><th className="r">Orders</th><th className="r">Sales</th><th /></tr></thead>
          <tbody>
            {(list || []).map(c => (
              <tr key={c.id} className="clickable" onClick={() => startEdit(c)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && startEdit(c)}>
                <td><strong>{c.name}</strong><small className="cell-sub">{c.discountPercent}% off · /sale/{c.slug}</small></td>
                <td>{scopeText(c, catNames)}<small className="cell-sub">{c.productCount} {c.productCount === 1 ? 'product' : 'products'}</small></td>
                <td className="nowrap">{dateTime(c.startsAt)}<small className="cell-sub">to {dateTime(c.endsAt)}</small></td>
                <td><Pill value={c.status} /></td>
                <td className="r">{c.orders}<small className="cell-sub">{c.units} items</small></td>
                <td className="r"><strong>{taka(c.revenue)}</strong></td>
                <td className="r nowrap" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" title="Copy sale link" aria-label={`Copy link to ${c.name}`} onClick={() => copyLink(c)}><Link2 size={16} /></button>
                  {(c.status === 'LIVE' || c.status === 'SCHEDULED') && (
                    <button className="btn-icon" title="End now" aria-label={`End ${c.name} now`} onClick={() => endNow(c)}><Square size={16} /></button>
                  )}
                  <button className="btn-icon danger" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => remove(c)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {list && list.length === 0 && <EmptyRow cols={7}>No campaigns yet. Create one for Black Friday, Eid or a weekend flash sale.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <p className="panel-sub" style={{ marginTop: 12 }}>
        Sales and orders count items sold at the campaign price; cancelled orders aren't counted. When two sales overlap, each product gets the bigger discount.
      </p>
      {toast.node}
    </div>
  );
}
