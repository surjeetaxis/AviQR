import { useState, useRef, useEffect, forwardRef } from 'react';
import { useParams } from 'react-router-dom';
import { pmsApi } from '../../api/index.js';
import { CheckCircle2, ShieldCheck, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

// Public, guest-facing — no AviQR login. The guest authenticates with the phone
// number on file for the booking (matches ContactlessCheckinController on the backend).
export default function ContactlessCheckin() {
  const { reservationId } = useParams();

  const [phone, setPhone] = useState('');
  const [reservation, setReservation] = useState(null);
  const [form, setForm] = useState({ idProofType: 'AADHAAR', idProofNumber: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const signaturePad = useRef(null);

  const lookup = async (e) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true); setError(null);
    try {
      const res = await pmsApi.publicReservationSummary(reservationId, phone);
      setReservation(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not find this booking. Check the phone number and try again.');
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (signaturePad.current?.isEmpty()) {
      setError('Please sign the registration card before continuing.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const signatureData = signaturePad.current?.toDataURL();
      await pmsApi.publicContactlessCheckIn(reservationId, { phone, ...form, signatureData });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete pre-check-in. Please try again or see the front desk.');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div style={sx.page}>
        <div style={sx.center}>
          <CheckCircle2 size={56} style={{ color: '#1D9E75' }} />
          <h2 style={{ margin: '16px 0 6px' }}>You're all set!</h2>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '0 30px' }}>
            Your signed registration card is on file. Just collect your room key at the front desk on arrival.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <ShieldCheck size={24} />
        <h1 style={{ fontSize: 20, margin: '10px 0 4px' }}>Contactless Check-in</h1>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>Verify your booking to check in before you arrive.</p>
      </div>

      <div style={sx.body}>
        {error && (
          <div style={sx.errorBox}><AlertTriangle size={16} /> {error}</div>
        )}

        {!reservation ? (
          <form onSubmit={lookup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={sx.label}>Phone number used for this booking</label>
            <input style={sx.input} placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            <button style={sx.primaryBtn} disabled={loading}>{loading ? <Loader2 size={16} className="spin" /> : 'Find my booking'}</button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
          </form>
        ) : (
          <>
            <div style={sx.summaryCard}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{reservation.guestName}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                {reservation.checkInDate} → {reservation.checkOutDate}
              </div>
            </div>
            {reservation.preCheckedIn ? (
              <div style={sx.summaryCard}>
                <CheckCircle2 size={20} style={{ color: '#1D9E75' }} />
                <div style={{ marginTop: 8 }}>You've already completed pre-check-in for this stay.</div>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                <label style={sx.label}>ID proof type</label>
                <select style={sx.input} value={form.idProofType} onChange={e => setForm({ ...form, idProofType: e.target.value })}>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving licence</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
                <label style={sx.label}>ID proof number</label>
                <input style={sx.input} value={form.idProofNumber} onChange={e => setForm({ ...form, idProofNumber: e.target.value })} />
                <label style={sx.label}>Address</label>
                <input style={sx.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <label style={sx.label}>Sign below — this is your registration card</label>
                <SignaturePad ref={signaturePad} />
                <button style={sx.primaryBtn} disabled={loading}>{loading ? <Loader2 size={16} className="spin" /> : 'Complete pre-check-in'}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Canvas signature capture — mouse + touch, no external library needed for a
// simple freehand line drawing (the registration-card use case doesn't need
// pressure/stroke-smoothing beyond this).
const SignaturePad = forwardRef(function SignaturePad(_props, ref) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (ref) ref.current = {
      isEmpty: () => empty.current,
      toDataURL: () => canvas.toDataURL('image/png'),
      clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); empty.current = true; },
    };
  }, [ref]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    empty.current = false;
  };
  const end = () => { drawing.current = false; };
  const clear = () => ref?.current?.clear();

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 140, border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', touchAction: 'none' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <button type="button" onClick={clear} style={sx.clearBtn}><RotateCcw size={12} /> Clear signature</button>
    </div>
  );
});

const sx = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui,-apple-system,sans-serif' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 20px' },
  header: { background: 'linear-gradient(135deg,#1D9E75,#178A65)', color: '#fff', padding: '28px 22px 20px' },
  body: { padding: '18px 16px 40px' },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280' },
  input: { width: '100%', padding: '11px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', background: '#fff' },
  primaryBtn: { width: '100%', padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summaryCard: { background: '#fff', border: '1px solid #F0F0F0', borderRadius: 14, padding: 16 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 },
  clearBtn: { marginTop: 6, background: 'none', border: 'none', color: '#6B7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0 },
};
