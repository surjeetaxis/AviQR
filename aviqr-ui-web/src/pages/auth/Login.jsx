
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/index.js';
import OtpInput from '../../components/shared/OtpInput.jsx';
import OtpSuccessCheck from '../../components/shared/OtpSuccessCheck.jsx';
import './Auth.css';

const RESEND_COOLDOWN_SECONDS = 30;

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
  OWNER:'/dashboard', MANAGER:'/dashboard',
  CASHIER:'/billing',  KITCHEN:'/kot',
  MENU_EDITOR:'/menu', ORDER_VIEWER:'/orders',
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
  const [otpEmail, setOtpEmail] = useState('');
  const [otp,   setOtp]   = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
    if (!otpEmail) return setError('Enter your email address');
    setLoading(true); setError('');
    try {
      await authApi.sendOtp(otpEmail);
      setOtpSent(true);
    } catch {
      setError('Could not send OTP. Use 123456 for dev mode.');
      setOtpSent(true);
    } finally {
      setLoading(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
  };

  // Accepts the completed code directly (from OtpInput's onComplete) so it
  // doesn't race the setOtp state update when auto-verifying.
  const handleOtp = async (code) => {
    const value = code ?? otp;
    if (!value || value.length < 6) return;
    setLoading(true); setError('');
    try {
      const u = await loginWithOtp(otpEmail, value);
      setVerified(true);
      setTimeout(() => goHome(u.role), 1200);
    } catch {
      setError('Invalid OTP. Dev code: 123456');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-logo" style={{ textDecoration:'none' }}>
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
          </Link>
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
              📧 OTP
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
          ) : !otpSent ? (
            <div className="auth-form">
              <div className="field">
                <label className="field-label">Email address</label>
                <div className="field-phone-wrap">
                  <input className="field-input" type="email" placeholder="you@restaurant.in"
                    value={otpEmail} onChange={e => setOtpEmail(e.target.value)} autoComplete="email"/>
                  <button className="btn-send-otp" type="button" onClick={sendOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send OTP'}
                  </button>
                </div>
              </div>
            </div>
          ) : verified ? (
            <OtpSuccessCheck label="Verified successfully" sub="Signing you in…" />
          ) : (
            <div className="auth-form otp-verify-panel">
              <h3 className="otp-verify-title">Let's verify your email</h3>
              <p className="otp-verify-sub">
                We've sent a 6-digit code to {otpEmail}. It'll auto-verify once entered.
                <br /><span className="otp-hint">Dev mode: 123456</span>
              </p>
              <OtpInput length={6} value={otp} onChange={setOtp} onComplete={handleOtp} disabled={loading} />
              <button type="button" className="btn-auth-primary" style={{ marginTop: 20 }}
                onClick={() => handleOtp()} disabled={loading || otp.length < 6}>
                {loading ? 'Verifying…' : <><span>Verify &amp; sign in</span><ArrowRight size={15}/></>}
              </button>
              <button type="button" className="resend-btn" style={{ marginTop: 12 }}
                onClick={sendOtp} disabled={resendCooldown > 0}>
                Didn't receive the code? <strong>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}</strong>
              </button>
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
