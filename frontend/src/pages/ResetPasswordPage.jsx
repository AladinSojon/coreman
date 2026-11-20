import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import './AuthPage.css';

const MIN = 8;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [account, setAccount] = useState(undefined); // undefined = checking, null = bad link
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setAccount(null); return; }
    api.post('/api/auth/reset-password/check', { token })
      .then(r => setAccount(r.data.email))
      .catch(err => { setAccount(null); setError(err.response?.data?.message || ''); });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (form.password !== form.confirm) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password: form.password });
      navigate('/login', { replace: true, state: { notice: 'Password changed. Sign in with your new password.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {account === undefined ? (
          <p className="text-muted">Checking your link…</p>
        ) : account === null ? (
          <div className="auth-done">
            <h1>Link not valid</h1>
            <p>{error || 'This reset link has expired or was already used.'} Reset links work once, for a limited time.</p>
            <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%' }}>Get a new link</Link>
          </div>
        ) : (
          <>
            <h1>Choose a new password</h1>
            <p className="text-muted">For {account}. You'll be signed out on other devices.</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="input-group">
                <label htmlFor="rp-new">New password</label>
                <input id="rp-new" className="input" type="password" autoComplete="new-password" minLength={MIN} maxLength={72}
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <p className="auth-hint">At least {MIN} characters.</p>
              </div>
              <div className="input-group">
                <label htmlFor="rp-confirm">Repeat new password</label>
                <input id="rp-confirm" className="input" type="password" autoComplete="new-password"
                  value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
