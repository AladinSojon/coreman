import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="nav-logo">CORE<span>MAN</span></h3>
            <p>Premium clothing & lifestyle essentials crafted for the modern individual.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/shop?gender=MEN">Men</Link>
            <Link to="/shop?gender=WOMEN">Women</Link>
            <Link to="/shop?category=accessories">Accessories</Link>
            <Link to="/shop?category=lifestyle">Lifestyle</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="#">About</Link>
            <Link to="#">Careers</Link>
            <Link to="#">Sustainability</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="#">Contact</Link>
            <Link to="#">Shipping</Link>
            <Link to="#">Returns</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 CoreMan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
