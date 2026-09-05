import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pmsApi } from '../../api/index.js';
import { BedDouble, CheckCircle2, Loader2, AlertTriangle, Users } from 'lucide-react';

function today() { return new Date().toISOString().slice(0, 10); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }

// Public, guest-facing direct booking engine — a hotel's own "book now" page,
// no AviQR login. Reachable at /book/:hotelId (see App.jsx).
export default function BookingEngine() {
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [dates, setDates] = useState({ checkIn: today(), checkOut: tomorrow() });
  const [selected, setSelected] = useState(null); // { roomTypeId, ratePlanId, rate, roomTypeName, planName }
  const [availableRooms, setAvailableRooms] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', adults: 1, children: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    pmsApi.publicHotelInfo(hotelId).then(res => setHotel(res.data.data)).catch(() => {});
    pmsApi.publicRoomTypes(hotelId).then(res => setRoomTypes(res.data.data || [])).catch(() => {});
  }, [hotelId]);

  const pickPlan = (rt, plan) => {
    setSelected({ roomTypeId: rt.roomTypeId, ratePlanId: plan.ratePlanId, rate: plan.baseRate, roomTypeName: rt.name, planName: plan.name, mealPlan: plan.mealPlan });
    setAvailableRooms(null);
  };

  const checkAvailability = async () => {
    if (!selected) return;
    setCheckingAvailability(true); setError(null);
    try {
      const res = await pmsApi.publicAvailability(hotelId, selected.roomTypeId, dates.checkIn, dates.checkOut);
      setAvailableRooms(res.data.data.availableRooms);
    } catch { setError('Could not check availability. Please try again.'); }
    finally { setCheckingAvailability(false); }
  };

  const nights = Math.max(1, Math.round((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000));
  const total = selected ? Number(selected.rate) * nights : 0;

  const book = async (e) => {
    e.preventDefault();
    if (!guest.guestName.trim() || !guest.guestPhone.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await pmsApi.publicBook(hotelId, {
        guestName: guest.guestName, guestPhone: guest.guestPhone,
        checkInDate: dates.checkIn, checkOutDate: dates.checkOut,
        adults: Number(guest.adults) || 1, children: Number(guest.children) || 0,
        roomTypeId: selected.roomTypeId, ratePlanId: selected.ratePlanId,
      });
      setConfirmation(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete your booking. Please try again.');
    } finally { setLoading(false); }
  };

  if (confirmation) {
    return (
      <div style={sx.page}>
        <div style={sx.center}>
          <CheckCircle2 size={56} style={{ color: '#1D9E75' }} />
          <h2 style={{ margin: '16px 0 6px' }}>Booking confirmed!</h2>
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '0 30px' }}>
            {confirmation.guestName} · {confirmation.checkInDate} → {confirmation.checkOutDate}
          </p>
          <Link to={`/pms/contactless-checkin/${confirmation.id}`} style={sx.primaryBtnLink}>
            Complete contactless check-in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <BedDouble size={24} />
        <h1 style={{ fontSize: 20, margin: '10px 0 4px' }}>{hotel?.name || 'Book your stay'}</h1>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>{hotel?.city ? `${hotel.city} · ` : ''}Book directly, no OTA fees.</p>
      </div>

      <div style={sx.body}>
        {error && <div style={sx.errorBox}><AlertTriangle size={16} /> {error}</div>}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={sx.label}>Check-in</label>
            <input type="date" style={sx.input} value={dates.checkIn} min={today()}
              onChange={e => { setDates({ ...dates, checkIn: e.target.value }); setAvailableRooms(null); }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sx.label}>Check-out</label>
            <input type="date" style={sx.input} value={dates.checkOut} min={dates.checkIn}
              onChange={e => { setDates({ ...dates, checkOut: e.target.value }); setAvailableRooms(null); }} />
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Choose a room</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roomTypes.map(rt => (
            <div key={rt.roomTypeId} style={sx.summaryCard}>
              <div style={{ fontWeight: 700 }}>{rt.name}</div>
              {rt.description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{rt.description}</div>}
              <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Users size={12} /> Up to {rt.maxOccupancy} guests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {rt.ratePlans.map(plan => (
                  <button key={plan.ratePlanId} type="button"
                    onClick={() => pickPlan(rt, plan)}
                    style={{ ...sx.planRow, ...(selected?.ratePlanId === plan.ratePlanId ? sx.planRowActive : {}) }}>
                    <span>{plan.name} <span style={{ color: '#9CA3AF', fontSize: 11 }}>({plan.mealPlan.replace('_', ' ')})</span></span>
                    <span style={{ fontWeight: 700 }}>₹{Number(plan.baseRate).toLocaleString('en-IN')}/night</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {roomTypes.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 20 }}>No rooms available to book online right now.</div>}
        </div>

        {selected && (
          <div style={{ marginTop: 16 }}>
            <button type="button" style={sx.secondaryBtn} onClick={checkAvailability} disabled={checkingAvailability}>
              {checkingAvailability ? <Loader2 size={16} className="spin" /> : 'Check availability'}
            </button>
            {availableRooms !== null && (
              availableRooms > 0 ? (
                <form onSubmit={book} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  <div style={sx.summaryCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{selected.roomTypeName} · {selected.planName}</span><span>{nights} night{nights > 1 ? 's' : ''}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6 }}><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                  </div>
                  <label style={sx.label}>Full name</label>
                  <input style={sx.input} value={guest.guestName} onChange={e => setGuest({ ...guest, guestName: e.target.value })} />
                  <label style={sx.label}>Phone number</label>
                  <input style={sx.input} value={guest.guestPhone} onChange={e => setGuest({ ...guest, guestPhone: e.target.value })} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={sx.label}>Adults</label>
                      <input type="number" min="1" style={sx.input} value={guest.adults} onChange={e => setGuest({ ...guest, adults: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={sx.label}>Children</label>
                      <input type="number" min="0" style={sx.input} value={guest.children} onChange={e => setGuest({ ...guest, children: e.target.value })} />
                    </div>
                  </div>
                  <button style={sx.primaryBtn} disabled={loading}>{loading ? <Loader2 size={16} className="spin" /> : `Book now — ₹${total.toLocaleString('en-IN')}`}</button>
                </form>
              ) : (
                <div style={{ ...sx.errorBox, marginTop: 10 }}><AlertTriangle size={16} /> No rooms available for these dates.</div>
              )
            )}
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
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
  primaryBtnLink: { display: 'inline-block', marginTop: 20, padding: '14px 22px', background: '#1D9E75', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' },
  secondaryBtn: { width: '100%', padding: 12, background: '#fff', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summaryCard: { background: '#fff', border: '1px solid #F0F0F0', borderRadius: 14, padding: 14, fontSize: 13 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 },
  planRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, background: '#fff', fontSize: 13, cursor: 'pointer', textAlign: 'left' },
  planRowActive: { borderColor: '#1D9E75', background: '#E1F5EE' },
};
