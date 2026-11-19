import { Link } from 'react-router-dom';
import { siteInfo } from '../siteInfo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="nav-logo">CORE<span>MAN</span></h3>
            <p>Premium clothing & lifestyle essentials crafted for the modern individual.</p>
            {(siteInfo.facebook || siteInfo.instagram) && (
              <p className="footer-social">
                {siteInfo.facebook && <a href={siteInfo.facebook} target="_blank" rel="noreferrer">Facebook</a>}
                {siteInfo.instagram && <a href={siteInfo.instagram} target="_blank" rel="noreferrer">Instagram</a>}
              </p>
            )}
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/shop?gender=MEN">Men</Link>
            <Link to="/shop?gender=WOMEN">Women</Link>
            <Link to="/shop?newArrivals=true">New arrivals</Link>
            <Link to="/shop?bestSellers=true">Best sellers</Link>
            <Link to="/shop?sale=true">Sale</Link>
            <Link to="/shop">All products</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/pages/contact">Contact us</Link>
            <Link to="/pages/shipping">Shipping & delivery</Link>
            <Link to="/pages/returns">Returns & exchanges</Link>
            <Link to="/orders">Track my order</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/pages/about">About</Link>
            <Link to="/pages/privacy">Privacy policy</Link>
            <Link to="/pages/terms">Terms of service</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} CoreMan. All rights reserved.</p>
          <p>Cash on Delivery across Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
