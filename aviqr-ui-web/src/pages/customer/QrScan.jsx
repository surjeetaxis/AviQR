import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

// Mirrors QrService.buildUrl on the backend (order-qr-service/QrService.java)
// — the path shapes a shop/table/mall/brand/hotel QR code encodes. This app's
// own routes are already registered at those exact paths (App.jsx), so a
// recognized scan just navigates there directly — no translation needed,
// unlike the mobile app which maps them onto different screen names.
const KNOWN_PREFIXES = ['/menu/', '/food-court/', '/brand/', '/hotel-services/'];

function extractPath(raw) {
  const s = (raw || '').trim();
  const httpMatch = /^https?:\/\/[^/]+(\/[^\s]*)$/.exec(s);
  const path = httpMatch ? httpMatch[1] : (s.startsWith('/') ? s : null);
  if (!path) return null;
  return KNOWN_PREFIXES.some(p => path.startsWith(p)) ? path : null;
}

// Uses html5-qrcode (already a dependency — see ConfirmCodeModal.jsx for the
// cashier-side equivalent) to scan via the browser camera, so customers never
// have to leave the app to reach the menu a code points to.
export default function QrScan() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const lockRef = useRef(false);

  const stop = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode('portal-qr-scanner');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 240 },
          async (decoded) => {
            if (lockRef.current) return;
            const path = extractPath(decoded);
            if (!path) { setError("That QR code isn't an AviQR restaurant code."); return; }
            lockRef.current = true;
            await stop();
            navigate(path);
          },
          () => {}
        );
      } catch {
        if (!cancelled) setError('Could not start camera — check permissions.');
      }
    })();
    return () => { cancelled = true; stop(); };
  }, []);

  return (
    <div style={sx.page}>
      <div style={sx.header}>
        <button style={sx.closeBtn} onClick={async () => { await stop(); navigate('/portal/home'); }}>
          <X size={18} color="#fff" />
        </button>
        <h1 style={sx.title}>Scan a QR code</h1>
        <div style={{ width: 34 }} />
      </div>
      <div id="portal-qr-scanner" style={sx.scannerBox} />
      <p style={sx.hint}>Point your camera at a table or menu code</p>
      {error && <div style={sx.error}>{error}</div>}
    </div>
  );
}

const sx = {
  page: { minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' },
  closeBtn: { width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 },
  scannerBox: { width: '100%', maxWidth: 420, margin: '20px auto 0', borderRadius: 16, overflow: 'hidden' },
  hint: { color: '#fff', textAlign: 'center', fontSize: 13.5, marginTop: 20 },
  error: { color: '#FCA5A5', textAlign: 'center', fontSize: 13, margin: '12px 24px 0' },
};
