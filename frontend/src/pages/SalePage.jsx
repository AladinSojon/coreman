import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tag } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import CampaignBanner from '../components/CampaignBanner';
import { useCountdown } from '../utils/campaigns';

const SORTS = [
  ['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['popular', 'Most popular'],
];

/** /sale/:slug — one campaign's landing page, to share on Facebook or WhatsApp. */
export default function SalePage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(undefined); // undefined = loading, null = not found
  const [products, setProducts] = useState(null);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setCampaign(undefined);
    api.get(`/api/campaigns/${slug}`).then(r => setCampaign(r.data)).catch(() => setCampaign(null));
  }, [slug]);

  // Re-load when the sale starts or ends while the page is open.
  const boundary = campaign?.status === 'SCHEDULED' ? campaign.startsAt : campaign?.endsAt;
  const flip = useCountdown(campaign && campaign.status !== 'ENDED' ? boundary : null);
  const live = campaign?.status === 'LIVE' && !flip.done;
  useEffect(() => {
    if (campaign && campaign.status !== 'ENDED' && flip.done) {
      api.get(`/api/campaigns/${slug}`).then(r => setCampaign(r.data)).catch(() => {});
    }
  }, [flip.done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!live) { setProducts([]); return; }
    if (page === 0) setProducts(null);
    api.get('/api/products', { params: { campaign: slug, sort, page, pageSize: 24 } })
      .then(r => {
        const items = r.data.content || [];
        setProducts(prev => (page === 0 || !prev ? items : [...prev, ...items]));
        setTotal(r.data.totalElements || 0);
      })
      .catch(() => { if (page === 0) setProducts([]); });
  }, [slug, sort, page, live]);

  if (campaign === undefined) return <div className="page container"><div className="skeleton" style={{ height: 260 }} /></div>;
  if (campaign === null) {
    return (
      <div className="page container" style={{ textAlign: 'center', padding: '96px 0' }}>
        <Tag size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h1 className="page-title">Sale not found</h1>
        <p className="text-muted" style={{ margin: '8px 0 24px' }}>This sale doesn't exist or has been taken down.</p>
        <Link to="/shop" className="btn btn-primary">Browse the shop</Link>
      </div>
    );
  }

  return (
    <div className="sale-page">
      <CampaignBanner campaign={campaign} asPageHeader />
      <div className="page container">
        {campaign.status === 'ENDED' || (campaign.status === 'LIVE' && flip.done) ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 8 }}>This sale has ended</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Thanks for shopping with us. See what else is on offer.</p>
            <Link to="/shop?sale=true" className="btn btn-primary">See current offers</Link>
          </div>
        ) : campaign.status === 'SCHEDULED' ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Starting soon</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              The sale starts {new Date(campaign.startsAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
            </p>
            <Link to="/shop" className="btn btn-primary">Browse the shop</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <p className="text-muted">{products === null ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'} on sale`}</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                Sort
                <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}>
                  {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
            {products !== null && products.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '64px 0' }}>No products in this sale right now.</p>
            ) : (
              <div className="product-grid">
                {(products || []).map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            {products && products.length < total && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>Show more</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
