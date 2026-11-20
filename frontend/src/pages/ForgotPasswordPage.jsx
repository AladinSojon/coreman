import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, MessageCircle } from 'lucide-react';
import api from '../api/client';
import { siteInfo } from '../siteInfo';
import './AuthPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // { emailEnabled }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { const r = await api.post('/api/auth/forgot-password', { email }); setSent(r.data); }
    catch (err) { setError(err.response?.data?.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const whatsapp = siteInfo.whatsapp
    ? `https://wa.me/${siteInfo.whatsapp}?text=${encodeURIComponent('Hi, I need help resetting my CoreMan password. My account email is: ')}`
    : null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        {sent ? (
          <div className="auth-done">
            {sent.emailEnabled ? (
              <>
                <MailCheck size={40} style={{ color: 'var(--success)', marginBottom: 16 }} />
                <h1>Check your email</h1>
                <p>If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It works for one hour. Check your spam folder too.</p>
              </>
            ) : (
              <>
                <MessageCircle size={40} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h1>Message us to reset</h1>
                <p>We can't send reset emails yet. Message us on WhatsApp with your account email and we'll send you a reset link.</p>
                {whatsapp && <a className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} href={whatsapp} target="_blank" rel="noreferrer">Message us on WhatsApp</a>}
              </>
            )}
            <Link to="/login" className="auth-forgot">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1>Forgot your password?</h1>
            <p className="text-muted">Enter the email you signed up with and we'll send you a link to choose a new password.</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="input-group">
                <label htmlFor="fp-email">Email</label>
                <input id="fp-email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="auth-switch">Remembered it? <Link to="/login">Sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
