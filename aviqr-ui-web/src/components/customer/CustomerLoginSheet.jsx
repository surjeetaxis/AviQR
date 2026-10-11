import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { X } from 'lucide-react';
import OtpInput from '../shared/OtpInput.jsx';
import OtpSuccessCheck from '../shared/OtpSuccessCheck.jsx';

const RESEND_COOLDOWN_SECONDS = 30;

// Shared email+OTP login prompt for the Customer Portal — shown whenever a
// customer taps something that needs identity (checkout, Orders, Rewards,
// Favorites, Profile). Browsing the menu itself never requires this.
export default function CustomerLoginSheet({ onClose, onLoggedIn }) {
  const { sendOtp, loginWithOtp } = useCustomerAuth();
  const [step, setStep] = useState('email'); // email | otp | verified
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return; }
    setError(''); setLoading(true);
    try {
      await sendOtp(email);
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(''); setLoading(true);
    try {
      await sendOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  // Accepts the completed code directly (from OtpInput's onComplete) so it
  // doesn't race the setOtp state update when auto-verifying.
  const submitOtp = async (code) => {
    const value = code ?? otp;
    if (!value || value.length < 6) return;
    setError(''); setLoading(true);
    try {
      await loginWithOtp(email, value);
      setStep('verified');
      setTimeout(() => onLoggedIn?.(), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP');
      setLoading(false);
    }
  };

  return (
    <div className="cm-backdrop" onClick={onClose}>
      <div className="cm-sheet" onClick={e => e.stopPropagation()}>
        <div className="cm-sheet-handle" />
        <div className="cm-sheet-header">
          <h2 className="cm-sheet-title">
            {step === 'email' ? 'Log in to continue' : step === 'otp' ? "Let's verify your email" : 'Verified'}
          </h2>
          <button className="cm-sheet-close" onClick={onClose}><X size={18} /></button>
        </div>

        {step === 'email' ? (
          <form className="cm-checkout-form" onSubmit={submitEmail}>
            <div className="cm-field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value.trim())} autoFocus />
            </div>
            {error && <div style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{error}</div>}
            <button className="cm-proceed-btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
          </form>
        ) : step === 'verified' ? (
          <div className="cm-checkout-form">
            <OtpSuccessCheck label="Verified successfully" sub="Signing you in…" />
          </div>
        ) : (
          <div className="cm-checkout-form" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: "#65766c", marginBottom: 18 }}>
              We've sent a 6-digit code to {email}. It'll auto-verify once entered.
            </p>
            <OtpInput length={6} value={otp} onChange={setOtp} onComplete={submitOtp} disabled={loading} />
            {error && <div style={{color:'#DC2626',fontSize:12.5,marginTop:12}}>{error}</div>}
            <button className="cm-proceed-btn" type="button" style={{marginTop:18}}
              onClick={() => submitOtp()} disabled={loading || otp.length < 6}>
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button type="button" className="resend-btn" style={{marginTop:10, display:'block', width:'100%', textAlign:'center'}}
              onClick={resendOtp} disabled={resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
            <button type="button" className="cm-back-btn" style={{marginTop:8}} onClick={() => setStep('email')}>← Change email</button>
          </div>
        )}
      </div>
    </div>
  );
}