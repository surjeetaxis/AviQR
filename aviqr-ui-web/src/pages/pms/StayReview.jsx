import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { reviewApi } from '../../api/index.js';
import { CheckCircle2, Star, AlertTriangle, Loader2 } from 'lucide-react';

// Public, guest-facing — no AviQR login. Reached from the WhatsApp review-invite
// link pms-service sends the day after checkout (ReservationLifecycleScheduler.
// sendReviewInvites); identity is proven by knowing the reservationId, same trust
// level as the existing public contactless check-in flow.
export default function StayReview() {
  const { hotelId } = useParams();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservationId');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [guestName, setGuestName] = useState(searchParams.get('guestName') || '');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    if (!guestName.trim()) { setError('Please enter your name.'); return; }
    setLoading(true); setError(null);
    try {
      await reviewApi.submitHotelStay({
        hotelId, reservationId, customerName: guestName.trim(), rating, comment,
      });
      setDone(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not submit your review. Please try again.';
      if (msg.toLowerCase().includes('already been reviewed')) setAlreadyReviewed(true);
      else setError(msg);
    } finally { setLoading(false); }
  };

  if (!reservationId) {
    return (
      <div style={sx.page}>
        <div style={sx.center}>
          <AlertTriangle size={40} style={{ color: '#B91C1C' }} />
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '0 30px', marginTop: 12 }}>
            This review link is missing some information. Please use the link from your checkout message.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={sx.page}>
        <div style={sx.center}>
          <CheckCircle2 size={56} style={{ color: '#1D9E75' }} />
          <h2 style={{ margin: '16px 0 6px' }}>Thanks for your feedback!</h2>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '0 30px' }}>
            Your review has been submitted. We hope to host you again soon.
          </p>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div style={sx.page}>
        <div style={sx.center}>
          <CheckCircle2 size={48} style={{ color: '#1D9E75' }} />
          <h2 style={{ margin: '16px 0 6px' }}>Already reviewed</h2>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '0 30px' }}>
            You've already left a review for this stay. Thanks again for sharing your feedback!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <Star size={24} />
        <h1 style={{ fontSize: 20, margin: '10px 0 4px' }}>How was your stay?</h1>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>Your feedback helps the hotel improve.</p>
      </div>

      <div style={sx.body}>
        {error && (
          <div style={sx.errorBox}><AlertTriangle size={16} /> {error}</div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={sx.label}>Your rating</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                style={sx.starBtn}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={34}
                  fill={(hoverRating || rating) >= n ? '#F59E0B' : 'none'}
                  color={(hoverRating || rating) >= n ? '#F59E0B' : '#D1D5DB'}
                />
              </button>
            ))}
          </div>

          <label style={sx.label}>Your name</label>
          <input style={sx.input} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" />

          <label style={sx.label}>Tell us more (optional)</label>
          <textarea
            style={{ ...sx.input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What did you enjoy? What could we do better?"
          />

          <button style={sx.primaryBtn} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Submit review'}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
        </form>
      </div>
    </div>
  );
}

const sx = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui,-apple-system,sans-serif' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 20px' },
  header: { background: 'linear-gradient(135deg,#1D9E75,#178A65)', color: '#fff', padding: '28px 22px 20px' },
  body: { padding: '18px 16px 40px' },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280' },
  input: { width: '100%', padding: '11px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', background: '#fff' },
  primaryBtn: { width: '100%', padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  starBtn: { background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 },
};
