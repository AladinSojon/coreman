import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Image, ExternalLink, FolderTree } from 'lucide-react';
import api from '../../api/client';
import { uploadImage } from '../../api/supabase';
import { EmptyRow, useToast } from './shared';

const blank = () => ({ name: '', slug: '', description: '', imageUrl: '', parentId: '', displayOrder: 0 });
const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Flat admin list → ordered tree rows with depth. */
function toRows(cats) {
  const byParent = new Map();
  cats.forEach(c => {
    const pid = c.parent?.id ?? null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(c);
  });
  byParent.forEach(list => list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id));
  const rows = [];
  const walk = (pid, depth) => (byParent.get(pid) || []).forEach(c => {
    rows.push({ ...c, depth, childCount: (byParent.get(c.id) || []).length });
    walk(c.id, depth + 1);
  });
  walk(null, 0);
  return rows;
}

/** Ids of a category and everything below it (can't be chosen as its parent). */
function descendants(rows, id) {
  const out = new Set([id]);
  let grew = true;
  while (grew) { grew = false; rows.forEach(r => { if (r.parent?.id && out.has(r.parent.id) && !out.has(r.id)) { out.add(r.id); grew = true; } }); }
  return out;
}

export default function CategoriesTab() {
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('');

  const load = () => api.get('/api/admin/categories').then(r => setCats(Array.isArray(r.data) ? r.data : [])).catch(e => toast.error(e));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = toRows(cats);
  const blocked = editing ? descendants(rows, editing) : new Set();
  const visible = filter ? rows.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()) || r.slug.includes(filter.toLowerCase())) : rows;

  const startNew = (parentId = '') => { setForm({ ...blank(), parentId }); setEditing(null); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const startEdit = (c) => {
    setForm({ name: c.name, slug: c.slug, description: c.description || '', imageUrl: c.imageUrl || '', parentId: c.parent?.id || '', displayOrder: c.displayOrder || 0 });
    setEditing(c.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, parentId: form.parentId ? Number(form.parentId) : null };
    try {
      if (editing) await api.put(`/api/admin/categories/${editing}`, body);
      else await api.post('/api/admin/categories', body);
      toast.ok(editing ? 'Category updated' : 'Category created');
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch (err) { toast.error(err); }
  };

  const remove = async (c) => {
    const msg = c.childCount
      ? `Delete "${c.name}"? Its ${c.childCount} subcategories move up one level, and its products become uncategorised.`
      : `Delete "${c.name}"? Its products become uncategorised.`;
    if (!window.confirm(msg)) return;
    try { await api.delete(`/api/admin/categories/${c.id}`); toast.ok('Category deleted'); load(); }
    catch (e) { toast.error(e); }
  };

  return (
    <div className="admin-section">
      <div className="toolbar">
        <div className="search-box"><FolderTree size={16} />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter categories" aria-label="Filter categories" /></div>
        <button className="btn-primary" onClick={() => (showForm ? setShowForm(false) : startNew())}>
          {showForm ? <><X size={16} /> Close form</> : <><Plus size={16} /> Add category</>}
        </button>
      </div>

      {showForm && (
        <form className="admin-form card" onSubmit={submit}>
          <div className="panel-head"><h3>{editing ? 'Edit category' : 'New category'}</h3></div>
          <div className="form-grid">
            <div className="form-group"><label>Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) })} /></div>
            <div className="form-group"><label>Slug (web address) *</label>
              <input required value={form.slug} onChange={e => setForm({ ...form, slug: autoSlug(e.target.value) })} />
              {editing && <small className="form-hint warn">Changing the slug breaks existing links to this category.</small>}</div>
            <div className="form-group"><label>Parent</label>
              <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (top level)</option>
                {rows.filter(r => !blocked.has(r.id)).map(r => <option key={r.id} value={r.id}>{'  '.repeat(r.depth)}{r.depth ? '└ ' : ''}{r.name}</option>)}
              </select></div>
            <div className="form-group"><label>Display order</label>
              <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
              <small className="form-hint">Lower numbers appear first in menus.</small></div>
            <div className="form-group full-width"><label>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-group full-width"><label>Image</label>
              <div className="cat-image-row">
                {form.imageUrl ? (
                  <div className="image-card"><img src={form.imageUrl} alt="" />
                    <button type="button" className="remove-btn" onClick={() => setForm({ ...form, imageUrl: '' })} aria-label="Remove image"><X size={14} /></button></div>
                ) : (
                  <label className="file-upload-area image-card">
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files[0]; if (!f) return;
                      setUploading(true);
                      try { const url = await uploadImage(f); setForm(prev => ({ ...prev, imageUrl: url })); } catch (err) { toast.error(err); }
                      setUploading(false); e.target.value = '';
                    }} />
                    <div className="upload-content"><Image size={22} /><p>{uploading ? 'Uploading…' : 'Upload'}</p></div>
                  </label>
                )}
                <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="…or paste an image URL" />
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary"><Save size={16} /> {editing ? 'Save changes' : 'Create category'}</button>
          </div>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead><tr><th>Category</th><th>Slug</th><th className="r">Order</th><th /></tr></thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="tree-cell" style={{ paddingLeft: filter ? 0 : c.depth * 24 }}>
                    {c.imageUrl ? <img src={c.imageUrl} alt="" className="tree-img" /> : <span className="tree-img placeholder">{c.name.charAt(0)}</span>}
                    <span><strong>{c.name}</strong>{c.childCount > 0 && <small className="cell-sub">{c.childCount} subcategories</small>}</span>
                  </div>
                </td>
                <td className="muted">{c.slug}</td>
                <td className="r">{c.displayOrder}</td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => startNew(c.id)} title="Add subcategory" aria-label={`Add subcategory to ${c.name}`}><Plus size={16} /></button>
                  <a className="btn-icon" href={`/shop?category=${c.slug}`} target="_blank" rel="noreferrer" title="View in shop" aria-label="View in shop"><ExternalLink size={16} /></a>
                  <button className="btn-icon" onClick={() => startEdit(c)} title="Edit" aria-label={`Edit ${c.name}`}><Edit2 size={16} /></button>
                  <button className="btn-icon btn-danger" onClick={() => remove(c)} title="Delete" aria-label={`Delete ${c.name}`}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <EmptyRow cols={4}>No categories.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <p className="pager-info">{cats.length} categories</p>
      {toast.node}
    </div>
  );
}
