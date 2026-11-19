import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, ArrowRight, X } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import './ShopPage.css';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

// URL params the API understands. Everything lives in the URL so filtered pages can be shared.
const FILTER_KEYS = ['q', 'category', 'gender', 'size', 'color', 'minPrice', 'maxPrice', 'featured', 'sale'];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [facets, setFacets] = useState({ sizes: [], colors: [], minPrice: null, maxPrice: null });

  const get = (k) => searchParams.get(k) || '';
  const query = get('q');
  const category = get('category');
  const gender = get('gender');
  const sort = get('sort') || 'newest';
  const page = Math.max(0, parseInt(get('page') || '0', 10) || 0);

  // Local copies so price inputs don't refetch on every keystroke.
  const [minPrice, setMinPrice] = useState(get('minPrice'));
  const [maxPrice, setMaxPrice] = useState(get('maxPrice'));
  useEffect(() => { setMinPrice(get('minPrice')); setMaxPrice(get('maxPrice')); }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/api/products/filters').then(r => setFacets(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!category) { setCategoryInfo(null); return; }
    api.get(`/api/categories/${category}`)
      .then(r => setCategoryInfo(r.data))
      .catch(() => setCategoryInfo(null));
  }, [category]);

  useEffect(() => {
    setLoading(true); setError('');
    const params = { sort, page, pageSize: 12 };
    FILTER_KEYS.forEach(k => { const v = searchParams.get(k); if (v) params[k] = v; });

    api.get('/api/products', { params })
      .then(r => {
        setProducts(r.data.content || []);
        setTotalElements(r.data.totalElements ?? 0);
        setTotalPages(r.data.totalPages ?? 0);
      })
      .catch(err => {
        setProducts([]); setTotalElements(0); setTotalPages(0);
        setError(err.response?.status === 404 ? 'This category does not exist yet.' : 'Could not load products.');
      })
      .finally(() => setLoading(false));
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Update one or more URL params; any filter change resets to page 0. */
  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (!keepPage) next.delete('page');
    setSearchParams(next);
  };

  const toggle = (key, value) => update({ [key]: get(key) === value ? null : value });

  const applyPrice = (e) => {
    e?.preventDefault();
    update({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  };

  const activeFilters = [
    gender && { key: 'gender', label: gender === 'MEN' ? 'Men' : gender === 'WOMEN' ? 'Women' : 'Unisex' },
    get('size') && { key: 'size', label: `Size ${get('size')}` },
    get('color') && { key: 'color', label: get('color') },
    (get('minPrice') || get('maxPrice')) && { key: 'price', label: `৳${get('minPrice') || '0'} – ${get('maxPrice') ? '৳' + get('maxPrice') : 'any'}` },
    get('sale') && { key: 'sale', label: 'On sale' },
    get('featured') && { key: 'featured', label: 'Best sellers' },
  ].filter(Boolean);

  const removeFilter = (key) => key === 'price' ? update({ minPrice: null, maxPrice: null }) : update({ [key]: null });
  const clearAll = () => update({ gender: null, size: null, color: null, minPrice: null, maxPrice: null, sale: null, featured: null });

  const title = query
    ? `Search: "${query}"`
    : categoryInfo?.name
      || (category ? category.replace(/-/g, ' ')
        : get('sale') ? 'Sale'
        : get('featured') ? 'Best Sellers'
        : gender === 'MEN' ? "Men's Collection"
        : gender === 'WOMEN' ? "Women's Collection"
        : 'All Products');

  const subcategories = categoryInfo?.children || [];

  return (
    <div className="page container">
      <div className="shop-header">
        <div>
          <h1 className="page-title" style={{ textTransform: 'capitalize', marginBottom: 8 }}>{title}</h1>
          {categoryInfo?.description && <p className="category-description">{categoryInfo.description}</p>}
          <p className="text-muted">{loading ? 'Loading…' : `${totalElements} ${totalElements === 1 ? 'product' : 'products'}`}</p>
        </div>
        <div className="shop-toolbar">
          <button className="btn btn-secondary btn-sm shop-filter-toggle" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={16} /> Filters{activeFilters.length > 0 && ` (${activeFilters.length})`}
          </button>
          <label className="sort-select">
            <span>Sort</span>
            <select value={sort} onChange={e => update({ sort: e.target.value === 'newest' ? null : e.target.value })}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {subcategories.length > 0 && (
        <div className="subcategory-section">
          <div className="subcategory-grid">
            {subcategories.map(sub => (
              <Link to={`/shop?category=${sub.slug}`} key={sub.id} className="subcategory-card">
                {sub.imageUrl && <div className="subcategory-img"><img src={sub.imageUrl} alt={sub.name} loading="lazy" /></div>}
                <div className="subcategory-info">
                  <h4>{sub.name}</h4>
                  <span className="subcategory-cta">Shop now <ArrowRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="shop-layout">
        {filtersOpen && <div className="filter-backdrop" onClick={() => setFiltersOpen(false)} />}
        <aside className={`filter-panel ${filtersOpen ? 'open' : ''}`} aria-label="Filters">
          <div className="filter-panel-head">
            <h2>Filters</h2>
            <button className="icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button>
          </div>

          <div className="filter-group">
            <h3>Department</h3>
            <div className="chip-row">
              {[['', 'All'], ['MEN', 'Men'], ['WOMEN', 'Women']].map(([v, label]) => (
                <button key={label} className={`chip ${gender === v ? 'active' : ''}`} onClick={() => update({ gender: v || null })}>{label}</button>
              ))}
            </div>
          </div>

          {facets.sizes.length > 0 && (
            <div className="filter-group">
              <h3>Size</h3>
              <div className="chip-row">
                {facets.sizes.map(s => (
                  <button key={s} className={`chip ${get('size') === s ? 'active' : ''}`} onClick={() => toggle('size', s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {facets.colors.length > 0 && (
            <div className="filter-group">
              <h3>Colour</h3>
              <div className="swatch-list">
                {facets.colors.map(c => (
                  <button key={c.name} className={`swatch-option ${get('color').toLowerCase() === c.name.toLowerCase() ? 'active' : ''}`}
                    onClick={() => toggle('color', c.name)} title={c.name}>
                    <span className="swatch-dot" style={{ background: c.hex || '#ccc' }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-group">
            <h3>Price (BDT)</h3>
            <form className="price-row" onSubmit={applyPrice}>
              <input className="input" type="number" min="0" inputMode="numeric" value={minPrice}
                placeholder={facets.minPrice != null ? String(Math.floor(facets.minPrice)) : 'Min'}
                onChange={e => setMinPrice(e.target.value)} onBlur={applyPrice} aria-label="Minimum price" />
              <span>–</span>
              <input className="input" type="number" min="0" inputMode="numeric" value={maxPrice}
                placeholder={facets.maxPrice != null ? String(Math.ceil(facets.maxPrice)) : 'Max'}
                onChange={e => setMaxPrice(e.target.value)} onBlur={applyPrice} aria-label="Maximum price" />
            </form>
          </div>

          <div className="filter-group">
            <h3>Collections</h3>
            <label className="check-row">
              <input type="checkbox" checked={!!get('sale')} onChange={e => update({ sale: e.target.checked || null })} /> On sale
            </label>
            <label className="check-row">
              <input type="checkbox" checked={!!get('featured')} onChange={e => update({ featured: e.target.checked || null })} /> Best sellers
            </label>
          </div>

          {activeFilters.length > 0 && (
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={clearAll}>Clear all filters</button>
          )}
          <button className="btn btn-primary filter-done" onClick={() => setFiltersOpen(false)}>
            Show {totalElements} {totalElements === 1 ? 'product' : 'products'}
          </button>
        </aside>

        <section>
          {activeFilters.length > 0 && (
            <div className="active-filters">
              {activeFilters.map(f => (
                <button key={f.key} className="active-chip" onClick={() => removeFilter(f.key)}>
                  {f.label} <X size={14} />
                </button>
              ))}
              <button className="link-btn" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {loading ? (
            <div className="product-grid shop-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '3/4' }} /><div style={{ padding: 16 }}><div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 20, width: '80%' }} /></div></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>{error || (activeFilters.length > 0 ? 'No products match these filters' : 'No products here yet')}</h3>
              <p>{activeFilters.length > 0 ? 'Try removing a filter or two.' : 'Check back soon — new drops are on the way.'}</p>
              {activeFilters.length > 0
                ? <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={clearAll}>Clear filters</button>
                : <Link to="/shop" className="btn btn-primary" style={{ marginTop: 20 }}>Browse all products</Link>}
            </div>
          ) : (
            <>
              <div className="product-grid shop-grid">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={page === 0} onClick={() => update({ page: page - 1 || null }, { keepPage: true })} className="btn btn-secondary btn-sm">Previous</button>
                  <span className="text-muted">Page {page + 1} of {totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => update({ page: page + 1 }, { keepPage: true })} className="btn btn-secondary btn-sm">Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
