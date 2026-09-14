import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, Package, ShoppingCart, FolderTree, Plus, Edit2, Trash2, X, Save, ChevronRight, Image, Layers } from 'lucide-react';
import api from '../api/client';
import './AdminPage.css';

function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', imageUrl: '', parentId: '', displayOrder: 0 });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = () => {
    api.get('/api/admin/categories').then(r => setCategories(r.data)).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, parentId: form.parentId ? Number(form.parentId) : null };
    try {
      if (editing) {
        await api.put(`/api/admin/categories/${editing}`, data);
      } else {
        await api.post('/api/admin/categories', data);
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', slug: '', description: '', imageUrl: '', parentId: '', displayOrder: 0 });
      loadCategories();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', imageUrl: cat.imageUrl || '', parentId: cat.parent?.id || '', displayOrder: cat.displayOrder || 0 });
    setEditing(cat.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/api/admin/categories/${id}`);
    loadCategories();
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const parentCategories = categories.filter(c => !c.parent);

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2><FolderTree size={20} /> Categories ({categories.length})</h2>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', slug: '', description: '', imageUrl: '', parentId: '', displayOrder: 0 }); }}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Category</>}
        </button>
      </div>

      {showForm && (
        <form className="admin-form card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) }); }} required />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Parent Category</label>
              <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (Top Level)</option>
                {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Display Order</label>
              <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
            <div className="form-group full-width">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="form-group full-width">
              <label>Image URL</label>
              <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <button type="submit" className="btn-primary"><Save size={16} /> {editing ? 'Update' : 'Create'} Category</button>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td><strong>{cat.name}</strong></td>
                <td className="text-muted">{cat.slug}</td>
                <td>{cat.parent?.name || '—'}</td>
                <td>{cat.displayOrder}</td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => handleEdit(cat)}><Edit2 size={16} /></button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(cat.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No categories yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', basePrice: '', brand: 'CoreMan',
    gender: 'MEN', categoryId: '', isActive: true, isFeatured: false,
    images: [{ imageUrl: '' }],
    variants: [{ size: '', color: '', colorHex: '#000000', sku: '', stockQuantity: 0 }]
  });

  useEffect(() => {
    loadProducts();
    api.get('/api/admin/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const loadProducts = () => {
    api.get('/api/admin/products?size=100').then(r => setProducts(r.data.content || [])).catch(() => {});
  };

  const resetForm = () => ({
    name: '', slug: '', description: '', basePrice: '', brand: 'CoreMan',
    gender: 'MEN', categoryId: '', isActive: true, isFeatured: false,
    images: [{ imageUrl: '' }],
    variants: [{ size: '', color: '', colorHex: '#000000', sku: '', stockQuantity: 0 }]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      basePrice: Number(form.basePrice),
      images: form.images.filter(i => i.imageUrl),
      variants: form.variants.filter(v => v.size && v.color)
    };
    try {
      if (editing) {
        await api.put(`/api/admin/products/${editing}`, data);
      } else {
        await api.post('/api/admin/products', data);
      }
      setShowForm(false); setEditing(null); setForm(resetForm());
      loadProducts();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name, slug: product.slug, description: product.description || '',
      basePrice: product.basePrice, brand: product.brand || 'CoreMan',
      gender: product.gender, categoryId: product.category?.id || '',
      isActive: product.isActive ?? true, isFeatured: product.isFeatured ?? false,
      images: product.images?.length ? product.images.map(i => ({ imageUrl: i.imageUrl })) : [{ imageUrl: '' }],
      variants: product.variants?.length ? product.variants.map(v => ({
        size: v.size, color: v.color, colorHex: v.colorHex || '#000000', sku: v.sku, stockQuantity: v.stockQuantity
      })) : [{ size: '', color: '', colorHex: '#000000', sku: '', stockQuantity: 0 }]
    });
    setEditing(product.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/api/admin/products/${id}`);
    loadProducts();
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const addImage = () => setForm({ ...form, images: [...form.images, { imageUrl: '' }] });
  const removeImage = (i) => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });
  const updateImage = (i, val) => { const imgs = [...form.images]; imgs[i].imageUrl = val; setForm({ ...form, images: imgs }); };

  const addVariant = () => setForm({ ...form, variants: [...form.variants, { size: '', color: '', colorHex: '#000000', sku: '', stockQuantity: 0 }] });
  const removeVariant = (i) => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) });
  const updateVariant = (i, key, val) => { const vars = [...form.variants]; vars[i][key] = val; setForm({ ...form, variants: vars }); };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2><Package size={20} /> Products ({products.length})</h2>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditing(null); setForm(resetForm()); }}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Product</>}
        </button>
      </div>

      {showForm && (
        <form className="admin-form card" onSubmit={handleSubmit}>
          <h3>{editing ? 'Edit Product' : 'New Product'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Product Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Price (USD) *</label>
              <input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Brand</label>
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} → ` : ''}{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} /> Featured
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h4><Image size={16} /> Images</h4>
              <button type="button" className="btn-sm btn-outline" onClick={addImage}><Plus size={14} /> Add Image</button>
            </div>
            {form.images.map((img, i) => (
              <div key={i} className="inline-field">
                <input placeholder="Image URL (https://...)" value={img.imageUrl} onChange={e => updateImage(i, e.target.value)} />
                {img.imageUrl && <img src={img.imageUrl} alt="" className="img-preview" />}
                {form.images.length > 1 && <button type="button" className="btn-icon btn-danger" onClick={() => removeImage(i)}><X size={14} /></button>}
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="section-header">
              <h4><Layers size={16} /> Variants (Size / Color / Stock)</h4>
              <button type="button" className="btn-sm btn-outline" onClick={addVariant}><Plus size={14} /> Add Variant</button>
            </div>
            {form.variants.map((v, i) => (
              <div key={i} className="variant-row">
                <input placeholder="Size (S/M/L/XL)" value={v.size} onChange={e => updateVariant(i, 'size', e.target.value)} />
                <input placeholder="Color name" value={v.color} onChange={e => updateVariant(i, 'color', e.target.value)} />
                <input type="color" value={v.colorHex} onChange={e => updateVariant(i, 'colorHex', e.target.value)} className="color-input" />
                <input placeholder="SKU" value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} />
                <input type="number" placeholder="Stock" value={v.stockQuantity} onChange={e => updateVariant(i, 'stockQuantity', Number(e.target.value))} className="stock-input" />
                {form.variants.length > 1 && <button type="button" className="btn-icon btn-danger" onClick={() => removeVariant(i)}><X size={14} /></button>}
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary"><Save size={16} /> {editing ? 'Update' : 'Create'} Product</button>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Category</th><th>Variants</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.images?.[0] ? <img src={p.images[0].imageUrl} alt="" className="table-img" /> : '—'}</td>
                <td><strong>{p.name}</strong>{p.isFeatured && <span className="badge">Featured</span>}</td>
                <td>${p.basePrice}</td>
                <td>{p.category?.name || '—'}</td>
                <td>{p.variants?.length || 0}</td>
                <td><span className={`status ${p.isActive ? 'active' : 'inactive'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => handleEdit(p)}><Edit2 size={16} /></button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={7} className="text-center text-muted">No products yet. Click "Add Product" to create one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    api.get('/api/admin/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="page container admin-page">
      <h1 className="page-title">Admin Panel</h1>

      <div className="admin-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          <BarChart3 size={16} /> Dashboard
        </button>
        <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
          <FolderTree size={16} /> Categories
        </button>
        <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
          <Package size={16} /> Products
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="admin-stats">
          <div className="stat-card card">
            <div className="stat-icon"><Users size={24} /></div>
            <div><p className="stat-value">{stats?.totalUsers || 0}</p><p className="text-muted">Total Users</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><Package size={24} /></div>
            <div><p className="stat-value">{stats?.totalProducts || 0}</p><p className="text-muted">Products</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon"><ShoppingCart size={24} /></div>
            <div><p className="stat-value">{stats?.totalOrders || 0}</p><p className="text-muted">Orders</p></div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && <CategoryManager />}
      {activeTab === 'products' && <ProductManager />}
    </div>
  );
}
