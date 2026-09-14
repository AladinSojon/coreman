import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

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
        <div className="hero-bg" />
        <div className="container hero-content">
          <span className="badge badge-accent">New Season 2026</span>
          <h1>Redefine Your<br /><span className="text-accent">Everyday Style</span></h1>
          <p>Premium clothing & lifestyle essentials crafted for the modern individual. Timeless design meets uncompromising quality.</p>
          <div className="hero-actions">
            <Link to="/shop" className="btn btn-primary btn-lg">Shop Collection <ArrowRight size={18} /></Link>
            <Link to="/shop?gender=MEN" className="btn btn-secondary btn-lg">Men's Essentials</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature"><Truck size={28} /><div><h4>Free Shipping</h4><p>On orders over $100</p></div></div>
            <div className="feature"><Shield size={28} /><div><h4>Secure Checkout</h4><p>256-bit SSL encryption</p></div></div>
            <div className="feature"><RotateCcw size={28} /><div><h4>Easy Returns</h4><p>30-day return policy</p></div></div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">Find exactly what you're looking for</p>
            <div className="category-grid">
              {categories.map(cat => (
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

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="section-title">Featured Products</h2>
                <p className="section-subtitle" style={{ marginBottom: 0 }}>Handpicked favorites this season</p>
              </div>
              <Link to="/shop" className="btn btn-secondary btn-sm">View All <ArrowRight size={16} /></Link>
            </div>
            <div className="product-grid" style={{ marginTop: 32 }}>
              {featured.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

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
