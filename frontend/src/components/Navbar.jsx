import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) { navigate(`/shop?q=${searchQuery}`); setSearchOpen(false); setSearchQuery(''); }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <button className="nav-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/" className="nav-logo">CORE<span>MAN</span></Link>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link to="/shop?gender=MEN" onClick={() => setMenuOpen(false)}>Men</Link>
          <Link to="/shop?gender=WOMEN" onClick={() => setMenuOpen(false)}>Women</Link>
          <Link to="/shop?category=accessories" onClick={() => setMenuOpen(false)}>Accessories</Link>
          <Link to="/shop?category=lifestyle" onClick={() => setMenuOpen(false)}>Lifestyle</Link>
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
