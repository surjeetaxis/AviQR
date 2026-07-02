import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { setCustomerContext } from '../../context/customerContext.js';
import { guestServiceApi } from '../../api/index.js';
import {
  UtensilsCrossed, Wine, Waves, Sparkles, ShoppingBag, Dumbbell,
  Building2, Baby, Shirt, Bell, BellRing, MapPin, Receipt,
  CheckCircle2, X, ChevronRight, Clock, CreditCard, BedDouble, Loader2
} from 'lucide-react';

// Map outlet type → icon + label
const OUTLET_ICON = {
  RESTAURANT: UtensilsCrossed, BAR: Wine, POOL: Waves, SPA: Sparkles,
  SHOP: ShoppingBag, GYM: Dumbbell, BANQUET: Building2, KIDS_CLUB: Baby,
  LAUNDRY: Shirt, CONCIERGE: Bell, BUSINESS_CENTER: Building2, ACTIVITY: MapPin, OTHER: ChevronRight,
};

const REQUEST_TYPES = [
  { key:'HOUSEKEEPING', label:'Housekeeping', icon:Sparkles, hint:'Clean room, make bed' },
  { key:'AMENITIES',    label:'Amenities',    icon:Bell,     hint:'Towels, toiletries, pillows' },
  { key:'MAINTENANCE',  label:'Maintenance',  icon:Building2,hint:'AC, plumbing, electrical' },
  { key:'CONCIERGE',    label:'Concierge',    icon:BellRing, hint:'Recommendations, taxi, bookings' },
  { key:'LAUNDRY',      label:'Laundry',      icon:Shirt,    hint:'Laundry pickup' },
  { key:'LATE_CHECKOUT',label:'Late Checkout',icon:Clock,    hint:'Request a later checkout' },
];

export default function GuestServices() {
  const { hotelId } = useParams();
  const [sp] = useSearchParams();
  const room = sp.get('room');
  const area = sp.get('area');

  const [hub, setHub]       = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [view, setView]     = useState('hub');   // hub | request | booking | folio
  const [toast, setToast]   = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await guestServiceApi.hub(hotelId, room, area);
      setHub(res.data.data);
      setCustomerContext('hotel', hotelId, res.data.data?.hotelName);
    } catch (e) {
      setError('Could not load hotel services. Please contact the front desk.');
    } finally { setLoad(false); }
  }, [hotelId, room, area]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  if (loading) return (
    <div style={sx.center}>
      <Loader2 size={30} className="spin" style={{ color:'#1D9E75' }} />
      <p style={{ color:'#6B7280', fontSize:14, marginTop:12 }}>Loading services…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );

  if (error) return (
    <div style={sx.center}>
      <div style={{ fontSize:40 }}>🏨</div>
      <p style={{ color:'#DC2626', fontSize:14, marginTop:12, textAlign:'center', padding:'0 30px' }}>{error}</p>
    </div>
  );

  return (
    <div style={sx.page}>
      {/* Header */}
      <div style={sx.header}>
        <div style={{ fontSize:12, opacity:0.85, letterSpacing:0.5 }}>WELCOME TO</div>
        <div style={{ fontSize:22, fontWeight:800, marginTop:2 }}>{hub.hotelName}</div>
        {hub.room?.roomNumber && (
          <div style={sx.roomChip}>
            <BedDouble size={13} /> Room {hub.room.roomNumber}
            {hub.room.guestName ? ` · ${hub.room.guestName}` : ''}
            {hub.canChargeToRoom && <span style={sx.checkedIn}>✓ Checked in</span>}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={sx.tabs}>
        {[['hub','Services'],['request','Requests'],['folio','My Bill']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ ...sx.tab, ...(view===k ? sx.tabActive : {}) }}>{l}</button>
        ))}
      </div>

      <div style={sx.body}>
        {view === 'hub'     && <HubView hub={hub} room={room} hotelId={hotelId}
                                        onBooked={() => { flash('Booking requested — front desk will confirm shortly'); }} />}
        {view === 'request' && <RequestView hotelId={hotelId} room={room} guestName={hub.room?.guestName}
                                        onDone={() => { flash('Request sent to hotel staff'); setView('hub'); }} />}
        {view === 'folio'   && <FolioView hotelId={hotelId} room={room} canCharge={hub.canChargeToRoom} />}
      </div>

      {toast && <div style={sx.toast}><CheckCircle2 size={16} /> {toast}</div>}
    </div>
  );
}

// ── Service hub: grid of outlets ──────────────────────────────────────────────
function HubView({ hub, room, hotelId, onBooked }) {
  const [booking, setBooking] = useState(null); // outlet being booked
  const navigate = useNavigate();

  return (
    <>
      {hub.scannedArea && (
        <div style={sx.areaBanner}>📍 You scanned the <b>{hub.scannedArea}</b> QR code</div>
      )}
      <div style={sx.grid}>
        {hub.outlets.map(o => {
          const Icon = OUTLET_ICON[o.type] || ChevronRight;
          return (
            <button key={o.id} style={sx.outletCard}
              onClick={() => {
                if (o.bookable) setBooking(o);
                // navigate() keeps the Customer Portal shell mounted across this
                // transition instead of a full page reload (was window.location.href).
                else if (o.shopId) navigate(`/menu/${o.shopId}?room=${room||''}&outlet=${o.id}&hotel=${hotelId}`);
              }}>
              <div style={sx.outletIcon}><Icon size={22} color="#1D9E75" /></div>
              <div style={{ fontWeight:700, fontSize:14, color:'#111' }}>{o.name}</div>
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{o.location || o.type}</div>
              {o.bookable
                ? <div style={sx.bookTag}>Book a slot</div>
                : o.shopId ? <div style={sx.orderTag}>Order now →</div> : null}
            </button>
          );
        })}
      </div>
      {hub.outlets.length === 0 && (
        <p style={{ textAlign:'center', color:'#9CA3AF', fontSize:14, marginTop:40 }}>
          No services are available right now.
        </p>
      )}
      {booking && <BookingModal outlet={booking} hotelId={hotelId} room={room}
                                canCharge={hub.canChargeToRoom}
                                onClose={() => setBooking(null)}
                                onDone={() => { setBooking(null); onBooked(); }} />}
    </>
  );
}

// ── Booking modal (spa / activity / table) ────────────────────────────────────
function BookingModal({ outlet, hotelId, room, canCharge, onClose, onDone }) {
  const [f, setF] = useState({
    serviceName:'', price:'', bookingDate:new Date().toISOString().slice(0,10),
    bookingTime:'', partySize:1, guestName:'', guestPhone:'', notes:'',
    paymentChoice: canCharge ? 'CHARGE_TO_ROOM' : 'PAY_DIRECT',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.serviceName || !f.bookingTime) return;
    setSaving(true);
    try {
      await guestServiceApi.book(hotelId, { ...f, outletId: outlet.id, roomNumber: room, price: f.price || 0 });
      onDone();
    } catch (e) { alert(e.response?.data?.message || 'Booking failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={sx.modalWrap} onClick={onClose}>
      <div style={sx.modal} onClick={e => e.stopPropagation()}>
        <div style={sx.modalHead}>
          <div style={{ fontWeight:800, fontSize:16 }}>{outlet.name}</div>
          <button onClick={onClose} style={sx.xBtn}><X size={18} /></button>
        </div>
        <Field label="What would you like to book?">
          <input style={sx.input} placeholder="e.g. Swedish Massage 60min / Table for 4"
                 value={f.serviceName} onChange={e => setF({...f, serviceName:e.target.value})} />
        </Field>
        <div style={{ display:'flex', gap:10 }}>
          <Field label="Date" flex>
            <input type="date" style={sx.input} value={f.bookingDate}
                   onChange={e => setF({...f, bookingDate:e.target.value})} />
          </Field>
          <Field label="Time" flex>
            <input type="time" style={sx.input} value={f.bookingTime}
                   onChange={e => setF({...f, bookingTime:e.target.value})} />
          </Field>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Field label="Guests" flex>
            <input type="number" min="1" style={sx.input} value={f.partySize}
                   onChange={e => setF({...f, partySize:e.target.value})} />
          </Field>
          <Field label="Price (₹, if known)" flex>
            <input type="number" min="0" style={sx.input} placeholder="0" value={f.price}
                   onChange={e => setF({...f, price:e.target.value})} />
          </Field>
        </div>
        <Field label="Your name">
          <input style={sx.input} value={f.guestName} onChange={e => setF({...f, guestName:e.target.value})} />
        </Field>

        {/* Payment choice */}
        <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', margin:'6px 0' }}>PAYMENT</div>
        <div style={{ display:'flex', gap:8 }}>
          <PayOption active={f.paymentChoice==='CHARGE_TO_ROOM'} disabled={!canCharge}
            onClick={() => canCharge && setF({...f, paymentChoice:'CHARGE_TO_ROOM'})}
            icon={<BedDouble size={16} />} title="Charge to room"
            sub={canCharge ? 'Settle at checkout' : 'Not checked in'} />
          <PayOption active={f.paymentChoice==='PAY_DIRECT'}
            onClick={() => setF({...f, paymentChoice:'PAY_DIRECT'})}
            icon={<CreditCard size={16} />} title="Pay direct" sub="Card / UPI now" />
        </div>

        <button style={{ ...sx.primaryBtn, marginTop:16, opacity:saving?0.6:1 }}
                onClick={submit} disabled={saving}>
          {saving ? 'Sending…' : 'Request booking'}
        </button>
      </div>
    </div>
  );
}

// ── Request view (housekeeping / amenities / concierge) ───────────────────────
function RequestView({ hotelId, room, guestName, onDone }) {
  const [type, setType]     = useState('HOUSEKEEPING');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await guestServiceApi.request(hotelId, { roomNumber: room, guestName, type, details });
      onDone();
    } catch (e) { alert('Could not send request'); }
    finally { setSaving(false); }
  };

  if (!room) return <p style={{ textAlign:'center', color:'#9CA3AF', fontSize:14, marginTop:30 }}>
    Requests need a room. Please scan the QR in your room.</p>;

  return (
    <div>
      <div style={{ fontSize:13, color:'#6B7280', marginBottom:12 }}>What do you need for Room {room}?</div>
      <div style={sx.reqGrid}>
        {REQUEST_TYPES.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.key} onClick={() => setType(r.key)}
              style={{ ...sx.reqCard, ...(type===r.key ? sx.reqCardActive : {}) }}>
              <Icon size={20} color={type===r.key ? '#1D9E75' : '#6B7280'} />
              <div style={{ fontWeight:600, fontSize:13, marginTop:6 }}>{r.label}</div>
              <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2 }}>{r.hint}</div>
            </button>
          );
        })}
      </div>
      <Field label="Any details? (optional)">
        <textarea style={{ ...sx.input, minHeight:70, resize:'vertical' }}
          placeholder="e.g. 2 extra towels and a toothbrush"
          value={details} onChange={e => setDetails(e.target.value)} />
      </Field>
      <button style={{ ...sx.primaryBtn, opacity:saving?0.6:1 }} onClick={submit} disabled={saving}>
        {saving ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}

// ── Folio view (running bill) ─────────────────────────────────────────────────
function FolioView({ hotelId, room }) {
  const [folio, setFolio] = useState(null);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    if (!room) { setLoad(false); return; }
    guestServiceApi.folio(hotelId, room)
      .then(r => setFolio(r.data.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [hotelId, room]);

  if (!room) return <p style={{ textAlign:'center', color:'#9CA3AF', fontSize:14, marginTop:30 }}>
    Scan your room QR to view your bill.</p>;
  if (loading) return <p style={{ textAlign:'center', color:'#9CA3AF', marginTop:30 }}>Loading bill…</p>;
  if (!folio || folio.charges.length === 0) return (
    <div style={{ textAlign:'center', marginTop:40 }}>
      <Receipt size={36} color="#D1D5DB" />
      <p style={{ color:'#9CA3AF', fontSize:14, marginTop:12 }}>No charges yet</p>
    </div>
  );

  return (
    <div>
      <div style={sx.folioTotal}>
        <div>
          <div style={{ fontSize:12, opacity:0.85 }}>PENDING (to settle at checkout)</div>
          <div style={{ fontSize:28, fontWeight:800 }}>₹{Number(folio.pendingTotal).toLocaleString('en-IN')}</div>
        </div>
        <Receipt size={30} style={{ opacity:0.5 }} />
      </div>
      <div style={{ marginTop:16 }}>
        {folio.charges.map(c => (
          <div key={c.id} style={sx.chargeRow}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{c.description}</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>
                {new Date(c.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                {' · '}{c.paymentChoice === 'PAY_DIRECT' ? 'Paid' : c.status === 'SETTLED' ? 'Settled' : 'Pending'}
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:14,
                          color: c.status==='SETTLED' ? '#9CA3AF' : '#111' }}>
              ₹{Number(c.amount).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:'#9CA3AF', textAlign:'center', marginTop:16, lineHeight:1.5 }}>
        Charges to your room are settled at checkout.<br/>Questions? Contact the front desk.
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, flex }) {
  return (
    <div style={{ marginBottom:12, ...(flex ? { flex:1 } : {}) }}>
      <div style={{ fontSize:12, fontWeight:600, color:'#6B7280', marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}
function PayOption({ active, disabled, onClick, icon, title, sub }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex:1, padding:'12px 10px', borderRadius:12,
               border:`1.5px solid ${active ? '#1D9E75' : '#E5E7EB'}`,
               background: active ? '#E1F5EE' : disabled ? '#F9FAFB' : '#fff',
               opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer', textAlign:'left' }}>
      <div style={{ color: active ? '#1D9E75' : '#6B7280' }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:13, marginTop:4 }}>{title}</div>
      <div style={{ fontSize:10, color:'#9CA3AF' }}>{sub}</div>
    </button>
  );
}

const sx = {
  page:{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#F9FAFB', fontFamily:'system-ui,-apple-system,sans-serif' },
  center:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh' },
  header:{ background:'linear-gradient(135deg,#1D9E75,#178A65)', color:'#fff', padding:'28px 22px 20px' },
  roomChip:{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, background:'rgba(255,255,255,0.18)', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600 },
  checkedIn:{ marginLeft:8, background:'rgba(255,255,255,0.25)', padding:'2px 8px', borderRadius:10, fontSize:11 },
  tabs:{ display:'flex', background:'#fff', borderBottom:'1px solid #F0F0F0', position:'sticky', top:0, zIndex:10 },
  tab:{ flex:1, padding:'14px 0', border:'none', background:'none', fontSize:14, fontWeight:600, color:'#9CA3AF', cursor:'pointer', borderBottom:'2px solid transparent' },
  tabActive:{ color:'#1D9E75', borderBottom:'2px solid #1D9E75' },
  body:{ padding:'18px 16px 40px' },
  areaBanner:{ background:'#EEF7F3', border:'1px solid #C7E9DA', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#178A65', marginBottom:14 },
  grid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  outletCard:{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:16, padding:'16px 14px', textAlign:'left', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  outletIcon:{ width:44, height:44, borderRadius:12, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 },
  orderTag:{ fontSize:12, color:'#1D9E75', fontWeight:700, marginTop:8 },
  bookTag:{ fontSize:12, color:'#7C3AED', fontWeight:700, marginTop:8 },
  reqGrid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 },
  reqCard:{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:12, padding:'14px 10px', textAlign:'center', cursor:'pointer' },
  reqCardActive:{ borderColor:'#1D9E75', background:'#E1F5EE' },
  input:{ width:'100%', padding:'11px 12px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:14, boxSizing:'border-box', background:'#fff' },
  primaryBtn:{ width:'100%', padding:'14px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer' },
  modalWrap:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 },
  modal:{ background:'#fff', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' },
  modalHead:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  xBtn:{ background:'#F3F4F6', border:'none', borderRadius:8, padding:6, cursor:'pointer' },
  folioTotal:{ background:'linear-gradient(135deg,#1D9E75,#178A65)', color:'#fff', borderRadius:16, padding:'18px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  chargeRow:{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #F0F0F0' },
  toast:{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#fff', padding:'12px 18px', borderRadius:12, fontSize:13, display:'flex', alignItems:'center', gap:8, zIndex:200, maxWidth:'90%' },
};
