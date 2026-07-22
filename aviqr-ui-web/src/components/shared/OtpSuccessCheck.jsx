import { Check } from 'lucide-react';

// Glowing checkmark shown briefly after OTP verification succeeds, before
// the caller navigates away / closes the sheet.
export default function OtpSuccessCheck({ label = 'Verified successfully', sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div className="otp-success-check">
        <Check size={28} strokeWidth={3} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginTop: 14 }}>{label}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
