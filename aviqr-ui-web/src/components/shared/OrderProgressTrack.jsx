// The Confirmed → Preparing → Ready → Served progress track — shown right
// after checkout (CustomerMenu's OrderConfirmed) and reused on the order
// history detail page (PortalOrderDetail) so both screens track the order
// the same way. Not shown for PENDING_PAYMENT (nothing to track until the
// counter confirms) or CANCELLED/REJECTED orders.
export const STATUSES = [
  { key:'PENDING_PAYMENT', en:'Awaiting confirmation', hi:'पुष्टि की प्रतीक्षा में', ta:'உறுதிப்படுத்த காத்திருக்கிறது', icon:'⏳' },
  { key:'NEW',       en:'Confirmed',  hi:'कन्फर्म हुआ',    ta:'உறுதி செய்யப்பட்டது',  icon:'✅' },
  { key:'ACCEPTED',  en:'Confirmed',  hi:'कन्फर्म हुआ',    ta:'உறுதி செய்யப்பட்டது',  icon:'✅' },
  { key:'PREPARING', en:'Preparing',  hi:'बन रहा है',       ta:'தயாரிக்கப்படுகிறது',   icon:'👨‍🍳' },
  { key:'READY',     en:'Ready',      hi:'तैयार है',        ta:'தயார்',                 icon:'🔔' },
  { key:'COMPLETED', en:'Served',     hi:'सर्व किया गया',  ta:'பரிமாறப்பட்டது',        icon:'🎉' },
];
export const TRACK_STEPS = STATUSES.slice(2); // ACCEPTED/PREPARING/READY/COMPLETED — NEW aliases to the ACCEPTED step

export default function OrderProgressTrack({ status, lang = 'en' }) {
  const cancelled = status === 'CANCELLED' || status === 'REJECTED';
  const pendingPayment = status === 'PENDING_PAYMENT';
  if (cancelled || pendingPayment) return null;

  const statusIdx = Math.max(0, TRACK_STEPS.findIndex(s => s.key === status));

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, width:'100%', justifyContent:'center' }}>
      {TRACK_STEPS.map((s, i) => {
        const isActive = i === statusIdx;
        const isDone = i < statusIdx;
        const dotStyle = isActive
          ? { background:'var(--green)', borderColor:'var(--green)', color:'#fff', boxShadow:'0 0 0 6px rgba(29,158,117,.15)' }
          : isDone
          ? { background:'var(--green-light)', borderColor:'var(--green)', color:'#9CA3AF' }
          : { background:'#F3F4F6', borderColor:'#E5E7EB', color:'#9CA3AF' };
        return (
          <div key={s.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1, position:'relative' }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
              border:'2px solid', transition:'all .3s', zIndex:1,
              ...dotStyle,
            }}>
              {isDone ? '✓' : s.icon}
            </div>
            <span style={{
              fontSize:10.5, textAlign:'center', fontFamily:'inherit',
              color: i <= statusIdx ? 'var(--green-darker)' : '#9CA3AF',
              fontWeight: i <= statusIdx ? 600 : 400,
            }}>
              {lang === 'hi' ? s.hi : lang === 'ta' ? s.ta : s.en}
            </span>
            {i < TRACK_STEPS.length - 1 && (
              <div style={{
                position:'absolute', top:17, left:'calc(50% + 18px)',
                width:'calc(100% - 36px)', height:2,
                background: i < statusIdx ? 'var(--green)' : '#E5E7EB', zIndex:0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
