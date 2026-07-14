import { useState, useEffect } from 'react';
import { orderQrApi } from '../../api/index.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

// The customer's order code + QR — shown right after checkout (CustomerMenu's
// OrderConfirmed) and again later from order history (PortalOrderDetail), so
// a customer who navigates away and comes back can still pull up the same
// code to pay at the counter or collect their order. Self-contained: fetches
// its own code image (authenticated blob — see api/index.js orderQrApi) and
// renders nothing once the order no longer needs it (paid & collected).
export default function OrderCodePanel({ order, lang = 'en' }) {
  const [codeImageSrc, setCodeImageSrc] = useState(null);
  const { authHeader } = useCustomerAuth();

  useEffect(() => {
    if (!order?.confirmationCode) return;
    let objectUrl;
    orderQrApi.getCodeImage(order.id, authHeader)
      .then(res => {
        objectUrl = URL.createObjectURL(res.data);
        setCodeImageSrc(objectUrl);
      })
      .catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [order?.id, order?.confirmationCode]);

  const cancelled = order?.status === 'CANCELLED' || order?.status === 'REJECTED';
  const showCode = order?.confirmationCode && !cancelled && order?.status !== 'COMPLETED';
  if (!showCode) return null;

  const pendingPayment = order.status === 'PENDING_PAYMENT';
  const codeInstruction = pendingPayment
    ? (lang === 'hi' ? 'भुगतान करने के लिए काउंटर पर यह कोड दिखाएँ' : lang === 'ta' ? 'கட்டணம் செலுத்த இந்த குறியீட்டை கவுன்டரில் காட்டவும்' : 'Show this code at the counter to pay and start your order')
    : order.status === 'READY'
    ? (lang === 'hi' ? 'ऑर्डर लेने के लिए यह कोड दिखाएँ' : lang === 'ta' ? 'ஆர்டரைப் பெற இந்த குறியீட்டைக் காட்டவும்' : 'Show this code at the counter to collect your order')
    : (lang === 'hi' ? 'यह कोड रखें — ऑर्डर लेने के लिए ज़रूरी होगा' : lang === 'ta' ? 'இந்த குறியீட்டை வைத்திருங்கள் — ஆர்டரைப் பெற தேவைப்படும்' : "Keep this code — you'll need it to collect your order");

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      background:'#FFFBEB', border:'1px dashed #D97706', borderRadius:16,
      padding:18, width:'100%', boxSizing:'border-box',
    }}>
      {codeImageSrc && (
        <img
          style={{ borderRadius:8, background:'#fff', padding:6 }}
          src={codeImageSrc}
          alt="order code QR"
          width={140}
          height={140}
        />
      )}
      <div style={{ fontSize:28, fontWeight:900, letterSpacing:6, color:'#92400E', fontFamily:"'Courier New', monospace" }}>
        {order.confirmationCode}
      </div>
      <p style={{ fontSize:13, color:'#92400E', lineHeight:1.5, margin:0, textAlign:'center' }}>{codeInstruction}</p>
    </div>
  );
}
