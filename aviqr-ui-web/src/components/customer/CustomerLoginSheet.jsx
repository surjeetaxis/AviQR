import { useState } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';
import { X } from 'lucide-react';

// Shared phone+OTP login prompt for the Customer Portal — shown whenever a
// customer taps something that needs identity (checkout, Orders, Rewards,
// Favorites, Profile). Browsing the menu itself never requires this.
export default function CustomerLoginSheet({ onClose, onLoggedIn }) {
  const { sendOtp, loginWithOtp } = useCustomerAuth();
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitPhone = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
    setError(''); setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      onLoggedIn?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="cm-backdrop" onClick={onClose}>
      <div className="cm-sheet" onClick={e => e.stopPropagation()}>
        <div className="cm-sheet-handle" />
        <div className="cm-sheet-header">
          <h2 className="cm-sheet-title">{step === 'phone' ? 'Log in to continue' : 'Enter OTP'}</h2>
          <button className="cm-sheet-close" onClick={onClose}><X size={18} /></button>
        </div>

        {step === 'phone' ? (
          <form className="cm-checkout-form" onSubmit={submitPhone}>
            <div className="cm-field">
              <label>Mobile number</label>
              <input type="tel" placeholder="98765 43210" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} autoFocus />
            </div>
            {error && <div style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{error}</div>}
            <button className="cm-proceed-btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
          </form>
        ) : (
          <form className="cm-checkout-form" onSubmit={submitOtp}>
            <p style={{fontSize:13,color:'#6B7280',marginBottom:10}}>OTP sent to {phone}</p>
            <div className="cm-field">
              <label>6-digit OTP</label>
              <input inputMode="numeric" placeholder="123456" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
            </div>
            {error && <div style={{color:'#DC2626',fontSize:12.5,marginBottom:8}}>{error}</div>}
            <button className="cm-proceed-btn" type="submit" disabled={loading || otp.length < 6}>{loading ? 'Verifying…' : 'Verify & Continue'}</button>
            <button type="button" className="cm-back-btn" style={{marginTop:8}} onClick={() => setStep('phone')}>← Change number</button>
          </form>
        )}
      </div>
    </div>
  );
}