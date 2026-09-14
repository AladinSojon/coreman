import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
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

  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const gender = searchParams.get('gender');

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

  const title = query ? `Search: "${query}"` : category ? category.replace(/-/g, ' ') : gender ? `${gender}'s Collection` : 'All Products';

  return (
    <div className="page container">
      <div className="shop-header">
        <div>
          <h1 className="page-title" style={{ textTransform: 'capitalize' }}>{title}</h1>
          <p className="text-muted">{products.length} products</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {loading ? (
        <div className="product-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '3/4' }} /><div style={{ padding: 16 }}><div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 20, width: '80%' }} /></div></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
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
