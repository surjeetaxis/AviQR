import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { AuthBrand } from './Login.jsx';
import { authApi } from '../../api/index.js';
import './Auth.css';

// 'request' -> enter email, 'reset' -> enter code + new password, 'done' -> success
export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [newPw, setNewPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setStep('reset');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp || !newPw) return;
    if (newPw.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ email, otp, newPassword: newPw });
      setStep('done');
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-simple">
      <div className="auth-simple-card">
        <AuthBrand/>
        {step === 'request' ? (
          <>
            <div className="auth-form-header" style={{marginTop:24}}>
              <h1 className="auth-title">Reset your password</h1>
              <p className="auth-subtitle">Enter the email you registered with. We'll send you a 6-digit code.</p>
            </div>
            <div className="auth-form">
              <div className="field">
                <label className="field-label">Email address</label>
                <input className="field-input" type="email" placeholder="you@restaurant.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
              </div>
              {error && <p style={{color:'#DC2626',fontSize:13,marginBottom:4}}>{error}</p>}
              <button className="btn-auth-primary" onClick={handleSend} disabled={loading || !email}>
                {loading ? 'Sending…' : <>Send reset code <ArrowRight size={15}/></>}
              </button>
              <Link to="/login" className="auth-link" style={{textAlign:'center',display:'block',fontSize:13}}>← Back to sign in</Link>
            </div>
          </>
        ) : step === 'reset' ? (
          <>
            <div className="auth-form-header" style={{marginTop:24}}>
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-subtitle">If an account exists for <strong>{email}</strong>, we've sent a 6-digit code to it. Enter it below with your new password.</p>
            </div>
            <div className="auth-form">
              <div className="field">
                <label className="field-label">6-digit code</label>
                <input className="field-input" type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                  value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/>
              </div>
              <div className="field">
                <label className="field-label">New password</label>
                <div className="field-input-wrap">
                  <input className="field-input" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={newPw} onChange={e=>setNewPw(e.target.value)} autoComplete="new-password"/>
                  <button type="button" className="field-eye" onClick={() => setShowPw(s => !s)}>
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              {error && <p style={{color:'#DC2626',fontSize:13,marginBottom:4}}>{error}</p>}
              <button className="btn-auth-primary" onClick={handleReset} disabled={loading || otp.length < 6 || !newPw}>
                {loading ? 'Resetting…' : <>Reset password <ArrowRight size={15}/></>}
              </button>
              <button type="button" className="resend-btn" onClick={handleSend} disabled={loading}>
                Didn't receive it? <strong>Resend code</strong>
              </button>
              <Link to="/login" className="auth-link" style={{textAlign:'center',display:'block',fontSize:13}}>← Back to sign in</Link>
            </div>
          </>
        ) : (
          <div className="auth-success">
            <CheckCircle size={40} style={{color:'var(--green)'}}/>
            <h2>Password reset</h2>
            <p>Your password has been changed. Sign in with your new password.</p>
            <button className="btn-auth-primary" style={{display:'inline-flex',alignItems:'center',gap:8,justifyContent:'center'}} onClick={() => nav('/login')}>Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  );
}
