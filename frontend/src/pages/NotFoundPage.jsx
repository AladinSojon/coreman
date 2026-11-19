import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page container" style={{ textAlign: 'center', padding: '120px 0' }}>
      <p className="text-accent" style={{ fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.8rem' }}>404</p>
      <h1 className="page-title" style={{ margin: '12px 0' }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>The page you're looking for doesn't exist or has moved.</p>
      <Link to="/shop" className="btn btn-primary">Continue shopping</Link>
    </div>
  );
}
