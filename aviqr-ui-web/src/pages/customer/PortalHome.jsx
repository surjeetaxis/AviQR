import { QrCode } from 'lucide-react';

// Shown only when the customer has no "current context" yet (hasn't scanned any
// QR this session) — the shell's Home tab otherwise redirects straight to the
// restaurant/hotel/mall they last scanned into. There's no cross-platform
// restaurant directory to browse instead (none exists yet — see Future Expansion).
export default function PortalHome() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'0 30px', textAlign:'center', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <div style={{ width:64, height:64, borderRadius:20, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <QrCode size={30} color="#1D9E75" />
      </div>
      <h1 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Scan a QR to get started</h1>
      <p style={{ fontSize:13.5, color:'#6B7280', margin:0 }}>
        Scan a table, room, or food-court QR code to see a menu, order, and track it here.
      </p>
    </div>
  );
}