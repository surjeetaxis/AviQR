import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { AuthBrand } from './Login.jsx';
import { authApi } from '../../api/index.js';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-simple">
      <div className="auth-simple-card">
        <AuthBrand/>
        {!sent ? (
          <>
            <div className="auth-form-header" style={{marginTop:24}}>
              <h1 className="auth-title">Reset your password</h1>
              <p className="auth-subtitle">Enter the email you registered with. We'll send a reset link.</p>
            </div>
            <div className="auth-form">
              <div className="field">
                <label className="field-label">Email address</label>
                <input className="field-input" type="email" placeholder="you@restaurant.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              {error && <p style={{color:'#DC2626',fontSize:13,marginBottom:4}}>{error}</p>}
              <button className="btn-auth-primary" onClick={handleSend} disabled={loading || !email}>
                {loading ? 'Sending…' : <>Send reset link <ArrowRight size={15}/></>}
              </button>
              <Link to="/login" className="auth-link" style={{textAlign:'center',display:'block',fontSize:13}}>← Back to sign in</Link>
            </div>
          </>
        ) : (
          <div className="auth-success">
            <CheckCircle size={40} style={{color:'var(--green)'}}/>
            <h2>Check your email</h2>
            <p>We sent a reset link to <strong>{email}</strong>. Click the link in the email to set a new password.</p>
            <Link to="/login" className="btn-auth-primary" style={{display:'inline-flex',alignItems:'center',gap:8,justifyContent:'center'}}>Back to sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
