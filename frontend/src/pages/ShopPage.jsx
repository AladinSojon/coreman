import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, ArrowRight } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import './ShopPage.css';

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState(null);

  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const gender = searchParams.get('gender');

  // Fetch category info (with children) when browsing by category
  useEffect(() => {
    if (category) {
      api.get(`/api/categories/${category}`)
        .then(r => setCategoryInfo(r.data))
        .catch(() => setCategoryInfo(null));
    } else {
      setCategoryInfo(null);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
  }, [query, category, gender]);

  useEffect(() => {
    setLoading(true);
    let url = '/api/products';
    const params = { page, size: 12 };

    if (query) {
      url = '/api/products/search';
      params.q = query;
    } else if (category) {
      url = `/api/categories/${category}/products`;
    }

    api.get(url, { params })
      .then(r => {
        let content = r.data.content || r.data;
        if (gender && Array.isArray(content)) {
          content = content.filter(p => p.gender === gender);
        }
        setProducts(content);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query, category, gender, page]);

  const title = query
    ? `Search: "${query}"`
    : categoryInfo?.name
      ? categoryInfo.name
      : category
        ? category.replace(/-/g, ' ')
        : gender
          ? `${gender}'s Collection`
          : 'All Products';

  const subcategories = categoryInfo?.children || [];

  return (
    <div className="page container">
      <div className="shop-header">
        <div>
          <h1 className="page-title" style={{ textTransform: 'capitalize' }}>{title}</h1>
          {categoryInfo?.description && (
            <p className="category-description">{categoryInfo.description}</p>
          )}
          <p className="text-muted">{products.length} products</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Subcategory Cards */}
      {subcategories.length > 0 && (
        <div className="subcategory-section">
          <h3 className="subcategory-heading">Shop by Category</h3>
          <div className="subcategory-grid">
            {subcategories.map(sub => (
              <Link
                to={`/shop?category=${sub.slug}`}
                key={sub.id}
                className="subcategory-card"
              >
                {sub.imageUrl && (
                  <div className="subcategory-img">
                    <img src={sub.imageUrl} alt={sub.name} loading="lazy" />
                  </div>
                )}
                <div className="subcategory-info">
                  <h4>{sub.name}</h4>
                  <span className="subcategory-cta">
                    Shop Now <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="product-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '3/4' }} /><div style={{ padding: 16 }}><div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 20, width: '80%' }} /></div></div>
          ))}
        </div>
      ) : products.length === 0 && subcategories.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {products.length > 0 && (
            <div className="product-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <span className="text-muted">Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
