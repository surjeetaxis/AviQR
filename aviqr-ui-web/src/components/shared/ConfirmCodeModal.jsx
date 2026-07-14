import { useState, useEffect, useRef } from 'react';
import { QrCode as QrCodeIcon } from 'lucide-react';
import { orderQrApi } from '../../api/index.js';

// Cashier/owner types or scans the customer's order code: PENDING_PAYMENT orders
// get released to the kitchen (payment collected, or just acknowledged if already
// paid online); READY orders get closed out on pickup/delivery handover. Shared
// between the Orders live-queue screen and the POS/Billing dashboard.
const PAYMENT_CONFIRM_ROLES = ['CASHIER', 'MANAGER', 'OWNER'];
const PICKUP_CONFIRM_ROLES  = ['CASHIER', 'MANAGER', 'OWNER', 'KITCHEN'];
const STATUS_LABEL = { PENDING_PAYMENT:'Awaiting confirmation', NEW:'New', ACCEPTED:'Accepted', PREPARING:'Preparing', READY:'Ready!', COMPLETED:'Done', CANCELLED:'Cancelled', REJECTED:'Rejected' };

export default function ConfirmCodeModal({ shopId, role, onClose, onActed }) {
  const [code, setCode]       = useState('');
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  const lookup = async (raw) => {
    const value = (raw ?? code).trim();
    if (!value) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await orderQrApi.lookupCode(shopId, value);
      setResult(res.data.data);
      setCode(value);
    } catch (e) {
      setError(e.response?.data?.message || 'No order found for this code');
    } finally { setBusy(false); }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScan = async () => {
    setError('');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('confirm-code-scanner');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async (decoded) => { await stopScan(); lookup(decoded); },
        () => {}
      );
    } catch {
      setError('Could not start camera — check permissions');
      setScanning(false);
    }
  };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const act = async (action) => {
    setBusy(true); setError('');
    try {
      const res = action === 'payment'
        ? await orderQrApi.confirmPayment(shopId, code)
        : await orderQrApi.confirmPickup(shopId, code);
      setResult(res.data.data);
      onActed?.(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not confirm');
    } finally { setBusy(false); }
  };

  const canConfirmPayment = PAYMENT_CONFIRM_ROLES.includes(role);
  const canConfirmPickup  = PICKUP_CONFIRM_ROLES.includes(role);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:420, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--gray-100)' }}>
          <h3 style={{ fontSize:16, fontWeight:700 }}>Confirm order code</h3>
          <button onClick={async () => { await stopScan(); onClose(); }} style={{ background:'var(--gray-100)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input
              className="field-input"
              style={{ flex:1, height:40, fontSize:18, letterSpacing:3, textAlign:'center', fontFamily:"'Courier New', monospace" }}
              placeholder="000000" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') lookup(); }}
            />
            <button className="btn btn-primary" style={{ height:40 }} disabled={busy || !code} onClick={() => lookup()}>Look up</button>
          </div>

          {!scanning ? (
            <button className="btn btn-secondary" onClick={startScan}><QrCodeIcon size={14} /> Scan QR</button>
          ) : (
            <div>
              <div id="confirm-code-scanner" style={{ width:'100%', borderRadius:12, overflow:'hidden' }} />
              <button className="btn btn-secondary" style={{ marginTop:8, width:'100%' }} onClick={stopScan}>Stop scanning</button>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ fontSize:13 }}>{error}</div>}

          {result && (
            <div style={{ border:'1px solid var(--gray-200)', borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:14 }}>
                <span>#{result.orderNumber}</span>
                <span>₹{result.totalAmount}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--gray-500)', marginTop:4 }}>
                {result.customerName} · {STATUS_LABEL[result.status] || result.status} · Payment: {result.paymentStatus}
              </div>

              {result.status === 'PENDING_PAYMENT' && (
                canConfirmPayment ? (
                  <button className="btn btn-primary" style={{ width:'100%', marginTop:10 }} disabled={busy} onClick={() => act('payment')}>
                    {result.paymentStatus === 'PENDING' ? 'Confirm payment & send to kitchen' : 'Already paid — confirm & send to kitchen'}
                  </button>
                ) : (
                  <div style={{ marginTop:10, fontSize:13, color:'var(--gray-500)' }}>Only cashier/manager/owner can confirm payment.</div>
                )
              )}

              {result.status === 'READY' && (
                canConfirmPickup ? (
                  <button className="btn btn-primary" style={{ width:'100%', marginTop:10 }} disabled={busy} onClick={() => act('pickup')}>
                    Confirm pickup
                  </button>
                ) : (
                  <div style={{ marginTop:10, fontSize:13, color:'var(--gray-500)' }}>You're not allowed to confirm pickup.</div>
                )
              )}

              {!['PENDING_PAYMENT', 'READY'].includes(result.status) && (
                <div style={{ marginTop:10, fontSize:13, color:'var(--gray-500)' }}>Not awaiting action (status: {result.status}).</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
