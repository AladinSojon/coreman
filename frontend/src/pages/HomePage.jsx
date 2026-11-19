import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

const COLLECTIONS = [
  { id: 'featured', label: 'Featured', sub: 'Handpicked by our team', link: '/shop?featured=true' },
  { id: 'new', label: 'New Arrivals', sub: 'Just landed', link: '/shop?newArrivals=true', params: { newArrivals: true } },
  { id: 'best', label: 'Best Sellers', sub: 'What everyone is buying', link: '/shop?bestSellers=true', params: { bestSellers: true } },
  { id: 'sale', label: 'On Sale', sub: 'Limited-time prices', link: '/shop?sale=true', params: { sale: true } },
];

/** One section with a tab per collection; tabs with no products are hidden. */
function CollectionTabs({ featured }) {
  const [lists, setLists] = useState({ featured });
  const [active, setActive] = useState(null);

  useEffect(() => { setLists(l => ({ ...l, featured })); }, [featured]);
  useEffect(() => {
    COLLECTIONS.filter(c => c.params).forEach(c => {
      api.get('/api/products', { params: { ...c.params, pageSize: 8 } })
        .then(r => setLists(l => ({ ...l, [c.id]: r.data.content || [] })))
        .catch(() => setLists(l => ({ ...l, [c.id]: [] })));
    });
  }, []);

  const available = COLLECTIONS.filter(c => (lists[c.id] || []).length > 0);
  if (available.length === 0) return null;
  const current = available.find(c => c.id === active) || available[0];

  return (
    <section className="section">
      <div className="container">
        <div className="collection-head">
          <div>
            <h2 className="section-title">{current.label}</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>{current.sub}</p>
          </div>
          <Link to={current.link} className="btn btn-secondary btn-sm">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="collection-tabs" role="tablist" aria-label="Collections">
          {available.map(c => (
            <button key={c.id} role="tab" aria-selected={c.id === current.id} className={c.id === current.id ? 'active' : ''}
              onClick={() => setActive(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="product-grid">
          {lists[current.id].slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/api/products/featured').then(r => setFeatured(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/categories').then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">New Season 2026</p>
            <h1>Redefine your<br /><span className="text-accent">everyday style.</span></h1>
            <p className="hero-lead">Premium clothing & lifestyle essentials crafted for the modern individual. Timeless design meets uncompromising quality.</p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg">Shop Collection <ArrowRight size={18} /></Link>
              <Link to="/shop?gender=MEN" className="btn btn-secondary btn-lg">Men's Essentials</Link>
            </div>
          </div>
          <div className="hero-media">
            <img src="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200" alt="Model wearing a CoreMan oversized tee" />
            <Link to="/shop?category=drop-shoulder-tshirts" className="hero-tag">
              <span>Drop Shoulder Tees</span>
              <strong>Shop the edit <ArrowRight size={14} /></strong>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature"><Truck size={28} /><div><h4>Free Shipping</h4><p>On orders over ৳2,000</p></div></div>
            <div className="feature"><Shield size={28} /><div><h4>Secure Checkout</h4><p>256-bit SSL encryption</p></div></div>
            <div className="feature"><RotateCcw size={28} /><div><h4>Easy Returns</h4><p>30-day return policy</p></div></div>
          </div>
        </div>
      </section>

      {/* Shop by Gender */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">Find exactly what you're looking for</p>
            <div className="category-grid">
              {categories.filter(cat => !cat.parent).map(cat => (
                <Link to={`/shop?category=${cat.slug}`} key={cat.id} className="category-card">
                  <img src={cat.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'} alt={cat.name} />
                  <div className="category-overlay">
                    <h3>{cat.name}</h3>
                    <span>Shop Now <ArrowRight size={16} /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collections: Featured / New Arrivals / Best Sellers / Sale */}
      <CollectionTabs featured={featured} />

      {/* CTA */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="section-title">Join the CoreMan Community</h2>
          <p className="section-subtitle">Get 15% off your first order and exclusive early access to new drops.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Create Account</Link>
        </div>
      </section>
    </div>
  );
}
