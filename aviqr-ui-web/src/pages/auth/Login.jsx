
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/index.js';
import './Auth.css';

// Named export used by Register.jsx and ForgotPassword.jsx
export function AuthBrand() {
  return (
    <div className="auth-brand-logo" style={{ flexDirection:'column', alignItems:'flex-start', gap:4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div className="sidebar-logo-mark" aria-hidden="true" style={{ width:32, height:32 }}>
          <svg viewBox="0 0 28 28" fill="none">
            <rect x="3" y="3" width="9" height="9" rx="2" fill="#1D9E75"/>
            <rect x="16" y="3" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
            <rect x="3" y="16" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
            <rect x="5.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
            <rect x="18.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
            <rect x="5.5" y="18.5" width="4" height="4" rx="1" fill="#111"/>
            <rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
            <rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
            <rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75"/>
            <rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5"/>
          </svg>
        </div>
        <span style={{ fontSize:22, fontWeight:800, color:'var(--gray-900)', letterSpacing:'-.02em' }}>
          Avi<em style={{ fontStyle:'normal', color:'var(--green)' }}>QR</em>
        </span>
      </div>
      <p style={{ fontSize:13, color:'var(--gray-500)', marginTop:0 }}>Restaurant &amp; Hotel OS</p>
    </div>
  );
}

const ROLE_HOME = {
  OWNER:'/dashboard', MANAGER:'/dashboard', CASHIER:'/dashboard', KITCHEN:'/dashboard',
  ADMIN:'/admin', SUPPORT:'/support', HOTEL:'/hotel', MALL:'/mall',
  SUPPLIER:'/supplier', CUSTOMER:'/customer',
};

export default function Login() {
  const nav = useNavigate();
  const { login, loginWithOtp } = useAuth();

  const [tab,   setTab]   = useState('password');
  const [email, setEmail] = useState('');
  const [pw,    setPw]    = useState('');
  const [showPw,setShowPw]= useState(false);
  const [phone, setPhone] = useState('');
  const [otp,   setOtp]   = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goHome = (role) => nav(ROLE_HOME[(role||'').toUpperCase()] || '/dashboard');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !pw) return setError('Enter your email and password');
    setLoading(true); setError('');
    try {
      const u = await login(email, pw);
      goHome(u.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    if (!phone) return setError('Enter your mobile number');
    setLoading(true); setError('');
    try {
      await authApi.sendOtp(phone);
      setOtpSent(true);
    } catch {
      setError('Could not send OTP. Use 123456 for dev mode.');
      setOtpSent(true);
    } finally { setLoading(false); }
  };

  const handleOtp = async () => {
    if (!otp) return;
    setLoading(true); setError('');
    try {
      const u = await loginWithOtp(phone, otp);
      goHome(u.role);
    } catch { setError('Invalid OTP. Dev code: 123456'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">

      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <div style={{ width:36, height:36 }}>
              <svg viewBox="0 0 28 28" fill="none">
                <rect x="3" y="3" width="9" height="9" rx="2" fill="#1D9E75"/>
                <rect x="16" y="3" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
                <rect x="3" y="16" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
                <rect x="5.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
                <rect x="18.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
                <rect x="5.5" y="18.5" width="4" height="4" rx="1" fill="#111"/>
                <rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
                <rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
                <rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75"/>
                <rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5"/>
              </svg>
            </div>
            <span className="auth-brand-name">Avi<em>QR</em></span>
          </div>
        </div>

        <div className="auth-left-body">
          <h2 className="auth-left-title">Run your restaurant from a single QR.</h2>
          <p className="auth-left-sub">Orders, menus, payments, staff and reports — one platform for restaurants, hotels and malls across India.</p>
          <div className="auth-left-badges">
            {['🍽️ Live order tracking', '🌐 9 Indian languages', '⚡ Dynamic pricing', '📊 Revenue analytics', '🏨 Hotel room service', '🏬 Mall food courts'].map(b => (
              <span key={b} className="auth-badge">{b}</span>
            ))}
          </div>
        </div>

        <p style={{ fontSize:12, color:'var(--gray-600)', marginTop:'auto' }}>
          New here? <Link to="/register" style={{ color:'var(--gray-400)', fontWeight:600 }}>Create an account →</Link>
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your AviQR dashboard</p>
          </div>

          {/* Mode toggle */}
          <div className="auth-mode-toggle">
            <button className={`mode-btn${tab==='password'?' active':''}`} onClick={() => { setTab('password'); setError(''); }}>
              🔑 Password
            </button>
            <button className={`mode-btn${tab==='otp'?' active':''}`} onClick={() => { setTab('otp'); setError(''); }}>
              📱 OTP
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {tab === 'password' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="field">
                <label className="field-label">Email address</label>
                <input className="field-input" type="email" placeholder="you@restaurant.in"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required/>
              </div>
              <div className="field">
                <label className="field-label" style={{ justifyContent:'space-between' }}>
                  Password
                  <Link to="/forgot-password" style={{ fontSize:12, color:'var(--green-dark)', fontWeight:500 }}>Forgot?</Link>
                </label>
                <div className="field-input-wrap">
                  <input className="field-input" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" required/>
                  <button type="button" className="field-eye" onClick={() => setShowPw(s => !s)}>
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-auth-primary" disabled={loading}>
                {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={15}/></>}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <div className="field">
                <label className="field-label">Mobile number</label>
                <div className="field-phone-wrap">
                  <span className="field-dial">🇮🇳 +91</span>
                  <input className="field-input field-input-phone" type="tel" placeholder="9845012345"
                    value={phone} onChange={e => setPhone(e.target.value)}/>
                  {!otpSent && (
                    <button className="btn-send-otp" type="button" onClick={sendOtp} disabled={loading}>
                      {loading ? 'Sending…' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>
              {otpSent && (
                <div className="field">
                  <label className="field-label">One-time password <span className="otp-hint">Dev mode: 123456</span></label>
                  <input className="field-input otp-input" type="text" placeholder="------"
                    value={otp} onChange={e => setOtp(e.target.value)} maxLength={6}/>
                  <button type="button" className="resend-btn" onClick={sendOtp}>Resend OTP</button>
                </div>
              )}
              {otpSent && (
                <button type="button" className="btn-auth-primary" onClick={handleOtp} disabled={loading}>
                  {loading ? 'Verifying…' : <><span>Verify &amp; sign in</span><ArrowRight size={15}/></>}
                </button>
              )}
            </div>
          )}

          <p style={{ textAlign:'center', fontSize:13, color:'var(--gray-500)' }}>
            New to AviQR? <Link to="/register" className="auth-link">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
