import { useEffect, useState, useCallback } from 'react';
import { Star, Trash2, ExternalLink } from 'lucide-react';
import api from '../../api/client';
import { Pagination, dateOnly, useToast } from './shared';

function Stars({ n }) {
  return <span className="stars" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill={i <= n ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" />)}</span>;
}

export default function ReviewsTab({ params, setParams }) {
  const toast = useToast();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const rating = params.rating || '';
  const page = Number(params.page || 0);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/reviews', { params: { rating: rating || undefined, page, size: 20 } })
      .then(r => setData(r.data)).catch(e => toast.error(e)).finally(() => setLoading(false));
  }, [rating, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const remove = async (r) => {
    if (!window.confirm(`Delete this ${r.rating}-star review by ${r.customerName}? They'll be able to write a new one.`)) return;
    try { await api.delete(`/api/admin/reviews/${r.id}`); toast.ok('Review deleted'); load(); }
    catch (e) { toast.error(e); }
  };

  return (
    <div className="admin-section">
      <div className="seg">
        {['', '5', '4', '3', '2', '1'].map(v => (
          <button key={v || 'all'} className={rating === v ? 'active' : ''} onClick={() => setParams({ rating: v || null, page: null })}>
            {v ? `${v} ★` : 'All ratings'}
          </button>
        ))}
      </div>
      <div className="review-admin-list">
        {data.content.map(r => (
          <article key={r.id} className="card review-admin">
            <div className="review-admin-head">
              <Stars n={r.rating} />
              <a href={`/product/${r.productSlug}#reviews`} target="_blank" rel="noreferrer" className="review-product">{r.productName} <ExternalLink size={12} /></a>
              <span className="muted">{dateOnly(r.createdAt)}</span>
            </div>
            {r.comment ? <p className="review-admin-text">{r.comment}</p> : <p className="muted"><em>No written comment</em></p>}
            <div className="review-admin-foot">
              <span>{r.customerName} <span className="muted">· {r.customerEmail}</span></span>
              <button className="btn-outline btn-danger-outline" onClick={() => remove(r)}><Trash2 size={14} /> Delete</button>
            </div>
          </article>
        ))}
        {!loading && data.content.length === 0 && <p className="admin-empty">No reviews{rating ? ` with ${rating} stars` : ''} yet.</p>}
      </div>
      <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} label="reviews"
        onChange={p => setParams({ page: p || null })} />
      {toast.node}
    </div>
  );
}
