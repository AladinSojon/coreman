import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import './ProductReviews.css';

function Stars({ value, size = 16 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(value) ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" />
      ))}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button type="button" key={i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)} onClick={() => onChange(i)}>
          <Star size={26} fill={i <= (hover || value) ? 'var(--accent)' : 'transparent'} stroke="var(--accent)" />
        </button>
      ))}
      <span className="star-input-label">{labels[hover || value] || 'Select a rating'}</span>
    </div>
  );
}

const PAGE_SIZE = 5;

export default function ProductReviews({ slug, onReviewAdded }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(() =>
    api.get(`/api/products/${slug}/reviews/summary`).then(r => setSummary(r.data)).catch(() => {}), [slug]);

  const loadPage = useCallback((p) =>
    api.get(`/api/products/${slug}/reviews`, { params: { page: p, size: PAGE_SIZE } })
      .then(r => {
        setReviews(prev => p === 0 ? r.data.content : [...prev, ...r.data.content]);
        setHasMore(!r.data.last);
        setPage(p);
      }).catch(() => {}), [slug]);

  useEffect(() => { setReviews([]); loadSummary(); loadPage(0); }, [loadSummary, loadPage]);

  useEffect(() => {
    if (!user) { setEligibility({ canReview: false, reason: null }); return; }
    api.get(`/api/products/${slug}/reviews/eligibility`).then(r => setEligibility(r.data)).catch(() => setEligibility(null));
  }, [slug, user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post(`/api/products/${slug}/reviews`, { rating, comment });
      setFormOpen(false); setRating(0); setComment('');
      setEligibility({ canReview: false, reason: "Thanks — your review is live." });
      await Promise.all([loadSummary(), loadPage(0)]);
      onReviewAdded?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your review.');
    } finally { setSubmitting(false); }
  };

  const total = summary?.total ?? 0;

  return (
    <section className="reviews" id="reviews">
      <div className="reviews-head">
        <h2 className="section-title">Customer reviews</h2>
      </div>

      <div className="reviews-layout">
        <aside className="reviews-summary">
          {total > 0 ? (
            <>
              <div className="reviews-average">
                <strong>{summary.average?.toFixed(1)}</strong>
                <div><Stars value={summary.average} /><p>Based on {total} {total === 1 ? 'review' : 'reviews'}</p></div>
              </div>
              <div className="reviews-bars">
                {[5, 4, 3, 2, 1].map(star => {
                  const n = summary.counts?.[star] ?? 0;
                  return (
                    <div key={star} className="reviews-bar-row">
                      <span>{star}★</span>
                      <div className="reviews-bar"><div style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
                      <span className="reviews-bar-count">{n}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="reviews-empty">No reviews yet.</p>
          )}

          <div className="reviews-cta">
            {!user ? (
              <p><Link to="/login">Sign in</Link> to review a product you've bought.</p>
            ) : eligibility?.canReview ? (
              !formOpen && <button className="btn btn-primary" onClick={() => setFormOpen(true)}>Write a review</button>
            ) : eligibility?.reason ? (
              <p>{eligibility.reason}</p>
            ) : null}
          </div>
        </aside>

        <div className="reviews-list">
          {formOpen && (
            <form className="review-form card" onSubmit={submit}>
              <h3>Your review</h3>
              <StarInput value={rating} onChange={setRating} />
              <textarea className="input" rows={4} maxLength={2000} placeholder="How was the fit, fabric and quality? (optional)"
                value={comment} onChange={e => setComment(e.target.value)} />
              {error && <p className="review-error">{error}</p>}
              <div className="review-form-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFormOpen(false); setError(''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Posting…' : 'Post review'}</button>
              </div>
            </form>
          )}

          {reviews.map(r => (
            <article key={r.id} className="review">
              <div className="review-top">
                <Stars value={r.rating} size={14} />
                <span className="review-date">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
              <p className="review-author">{r.userName} <span className="review-verified">Verified buyer</span></p>
            </article>
          ))}

          {hasMore && (
            <button className="btn btn-secondary btn-sm" onClick={() => loadPage(page + 1)}>Show more reviews</button>
          )}
        </div>
      </div>
    </section>
  );
}
