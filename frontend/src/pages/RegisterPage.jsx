import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register(form); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join CoreMan</h1>
        <p className="text-muted">Create your account and start shopping</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="input-group">
              <label>First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required />
            </div>
          </div>
          <div className="input-group">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input className="input" type="password" minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
