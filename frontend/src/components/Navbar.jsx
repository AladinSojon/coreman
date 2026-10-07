import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, LogOut, LayoutDashboard, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [megaMenu, setMegaMenu] = useState(null); // 'men' | 'women' | null
  const [categories, setCategories] = useState([]);
  const megaMenuRef = useRef(null);
  const megaMenuTimeout = useRef(null);

  // Mobile accordion state
  const [mobileExpanded, setMobileExpanded] = useState(null);

  useEffect(() => {
    api.get('/api/categories')
      .then(r => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) { navigate(`/shop?q=${searchQuery}`); setSearchOpen(false); setSearchQuery(''); }
  };

  const handleMegaMenuEnter = (gender) => {
    clearTimeout(megaMenuTimeout.current);
    setMegaMenu(gender);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimeout.current = setTimeout(() => setMegaMenu(null), 200);
  };

  const closeMegaMenu = () => {
    setMegaMenu(null);
  };

  // Get the "Menswear" top-level category and its children
  const menswearCategory = categories.find(c => c.slug === 'menswear');
  const menSubcategories = menswearCategory?.children || [];

  // Placeholder subcategories for Women (will use real data when category exists)
  const womenswearCategory = categories.find(c => c.slug === 'womenswear');
  const womenSubcategories = womenswearCategory?.children || [];

  // Standard clothing categories for the mega menu (shown even without backend data)
  const defaultMenCategories = [
    { name: 'T-Shirts', slug: 't-shirt', icon: '👕' },
    { name: 'Drop Shoulder Tees', slug: 'drop-shoulder-tshirts', icon: '👔' },
    { name: 'Shirts', slug: 'shirts', icon: '🧥' },
    { name: 'Hoodies & Sweatshirts', slug: 'hoodies-sweatshirts', icon: '🧤' },
    { name: 'Pants & Chinos', slug: 'pants-chinos', icon: '👖' },
    { name: 'Jeans', slug: 'jeans', icon: '👖' },
    { name: 'Jackets & Coats', slug: 'jackets-coats', icon: '🧥' },
    { name: 'Sweaters', slug: 'sweaters', icon: '🧶' },
  ];

  const defaultWomenCategories = [
    { name: 'Dresses', slug: 'dresses', icon: '👗' },
    { name: 'Tops & Blouses', slug: 'tops-blouses', icon: '👚' },
    { name: 'T-Shirts', slug: 'women-tshirts', icon: '👕' },
    { name: 'Pants & Trousers', slug: 'pants-trousers', icon: '👖' },
    { name: 'Jeans', slug: 'women-jeans', icon: '👖' },
    { name: 'Jackets & Coats', slug: 'jackets-coats-women', icon: '🧥' },
    { name: 'Skirts', slug: 'skirts', icon: '👗' },
    { name: 'Knitwear', slug: 'knitwear', icon: '🧶' },
  ];

  const getMenCategories = () => menSubcategories.length > 0 ? menSubcategories : defaultMenCategories;
  const getWomenCategories = () => womenSubcategories.length > 0 ? womenSubcategories : defaultWomenCategories;

  const quickLinks = {
    men: [
      { label: 'New Arrivals', to: '/shop?gender=MEN&sort=newest' },
      { label: 'Best Sellers', to: '/shop?gender=MEN&featured=true' },
      { label: 'Sale', to: '/shop?gender=MEN&sale=true' },
    ],
    women: [
      { label: 'New Arrivals', to: '/shop?gender=WOMEN&sort=newest' },
      { label: 'Best Sellers', to: '/shop?gender=WOMEN&featured=true' },
      { label: 'Sale', to: '/shop?gender=WOMEN&sale=true' },
    ],
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <button className="nav-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/" className="nav-logo">CORE<span>MAN</span></Link>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop All</Link>

          {/* Men - Desktop hover mega menu */}
          <div
            className="nav-link-wrapper"
            onMouseEnter={() => handleMegaMenuEnter('men')}
            onMouseLeave={handleMegaMenuLeave}
          >
            <button
              className={`nav-link-btn ${megaMenu === 'men' ? 'active' : ''}`}
              onClick={() => {
                // On mobile, toggle accordion; on desktop navigate
                if (window.innerWidth <= 768) {
                  setMobileExpanded(mobileExpanded === 'men' ? null : 'men');
                } else {
                  navigate('/shop?gender=MEN');
                  closeMegaMenu();
                }
              }}
            >
              Men <ChevronDown size={14} className={`chevron ${megaMenu === 'men' ? 'rotated' : ''}`} />
            </button>

            {/* Mobile accordion */}
            {mobileExpanded === 'men' && (
              <div className="mobile-submenu">
                <Link to="/shop?gender=MEN" className="mobile-submenu-link mobile-submenu-viewall" onClick={() => setMenuOpen(false)}>
                  View All Men <ArrowRight size={14} />
                </Link>
                {getMenCategories().map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/shop?category=${cat.slug}`}
                    className="mobile-submenu-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Women - Desktop hover mega menu */}
          <div
            className="nav-link-wrapper"
            onMouseEnter={() => handleMegaMenuEnter('women')}
            onMouseLeave={handleMegaMenuLeave}
          >
            <button
              className={`nav-link-btn ${megaMenu === 'women' ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileExpanded(mobileExpanded === 'women' ? null : 'women');
                } else {
                  navigate('/shop?gender=WOMEN');
                  closeMegaMenu();
                }
              }}
            >
              Women <ChevronDown size={14} className={`chevron ${megaMenu === 'women' ? 'rotated' : ''}`} />
            </button>

            {/* Mobile accordion */}
            {mobileExpanded === 'women' && (
              <div className="mobile-submenu">
                <Link to="/shop?gender=WOMEN" className="mobile-submenu-link mobile-submenu-viewall" onClick={() => setMenuOpen(false)}>
                  View All Women <ArrowRight size={14} />
                </Link>
                {getWomenCategories().map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/shop?category=${cat.slug}`}
                    className="mobile-submenu-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/shop?category=accessories" onClick={() => setMenuOpen(false)}>Accessories</Link>
        </div>

        <div className="nav-actions">
          <button className="nav-icon" onClick={() => setSearchOpen(!searchOpen)}><Search size={20} /></button>

          {user ? (
            <>
              <Link to="/wishlist" className="nav-icon"><Heart size={20} /></Link>
              <Link to="/cart" className="nav-icon cart-icon">
                <ShoppingBag size={20} />
                {cart.totalItems > 0 && <span className="cart-badge">{cart.totalItems}</span>}
              </Link>
              {isAdmin && <Link to="/admin" className="nav-icon"><LayoutDashboard size={20} /></Link>}
              <Link to="/orders" className="nav-icon"><User size={20} /></Link>
              <button className="nav-icon" onClick={logout}><LogOut size={20} /></button>
            </>
          ) : (
            <Link to="/login" className="btn btn-sm btn-primary">Sign In</Link>
          )}
        </div>
      </div>

      {/* Desktop Mega Menu */}
      {megaMenu && (
        <div
          className="mega-menu"
          ref={megaMenuRef}
          onMouseEnter={() => handleMegaMenuEnter(megaMenu)}
          onMouseLeave={handleMegaMenuLeave}
        >
          <div className="container mega-menu-inner">
            {/* Quick Links Column */}
            <div className="mega-menu-col mega-menu-quick">
              <h4 className="mega-menu-heading">Highlights</h4>
              {quickLinks[megaMenu].map(link => (
                <Link key={link.label} to={link.to} className="mega-menu-link mega-menu-highlight" onClick={closeMegaMenu}>
                  {link.label}
                </Link>
              ))}
              <Link
                to={`/shop?gender=${megaMenu === 'men' ? 'MEN' : 'WOMEN'}`}
                className="mega-menu-link mega-menu-viewall"
                onClick={closeMegaMenu}
              >
                View All {megaMenu === 'men' ? 'Men' : 'Women'} <ArrowRight size={14} />
              </Link>
            </div>

            {/* Categories Column */}
            <div className="mega-menu-col mega-menu-categories">
              <h4 className="mega-menu-heading">Shop by Category</h4>
              <div className="mega-menu-cat-grid">
                {(megaMenu === 'men' ? getMenCategories() : getWomenCategories()).map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/shop?category=${cat.slug}`}
                    className="mega-menu-cat-link"
                    onClick={closeMegaMenu}
                  >
                    {cat.imageUrl && (
                      <div className="mega-menu-cat-img">
                        <img src={cat.imageUrl} alt={cat.name} />
                      </div>
                    )}
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Featured Image Column */}
            <div className="mega-menu-col mega-menu-featured">
              <Link
                to={`/shop?gender=${megaMenu === 'men' ? 'MEN' : 'WOMEN'}`}
                className="mega-menu-promo-card"
                onClick={closeMegaMenu}
              >
                <img
                  src={megaMenu === 'men'
                    ? 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop'
                    : 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=500&fit=crop'
                  }
                  alt={`${megaMenu === 'men' ? "Men's" : "Women's"} Collection`}
                />
                <div className="mega-menu-promo-overlay">
                  <span className="badge badge-accent">New Season</span>
                  <h3>{megaMenu === 'men' ? "Men's" : "Women's"} Collection</h3>
                  <span className="mega-menu-promo-cta">Shop Now <ArrowRight size={14} /></span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="search-bar">
          <form className="container" onSubmit={handleSearch}>
            <Search size={20} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..." autoFocus />
            <button type="button" onClick={() => setSearchOpen(false)}><X size={20} /></button>
          </form>
        </div>
      )}
    </nav>
  );
}
