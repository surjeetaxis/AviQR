// OfflineBanner — shown when the backend is confirmed unreachable
// Uses Vite proxy (/actuator/health) to avoid CORS issues in dev
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { checkBackend } from '../api/index.js';

export default function OfflineBanner() {
  const [status, setStatus]   = useState('checking'); // 'checking' | 'online' | 'offline'
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Small delay so page renders first
    const init = setTimeout(async () => {
      const online = await checkBackend();
      setStatus(online ? 'online' : 'offline');
    }, 1500);

    // Re-check every 30 seconds
    const interval = setInterval(async () => {
      const online = await checkBackend();
      setStatus(online ? 'online' : 'offline');
    }, 30000);

    return () => { clearTimeout(init); clearInterval(interval); };
  }, []);

  const retry = async () => {
    setChecking(true);
    const online = await checkBackend();
    setStatus(online ? 'online' : 'offline');
    setChecking(false);
    if (online) window.location.reload();
  };

  // Don't render anything until first check completes
  if (status === 'checking' || status === 'online') return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#FEF3C7', borderBottom: '2px solid #FCD34D',
      padding: '10px 20px', display: 'flex', alignItems: 'center',
      gap: 12, justifyContent: 'space-between', fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WifiOff size={15} color="#92400E" />
        <span style={{ color: '#92400E', fontWeight: 600 }}>
          Backend unreachable — showing demo data.{' '}
          <span style={{ fontWeight: 400 }}>Start the backend to use live features.</span>
        </span>
      </div>
      <button
        onClick={retry}
        disabled={checking}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#92400E', color: '#fff', border: 'none',
          borderRadius: 6, padding: '5px 14px', fontSize: 12,
          fontWeight: 600, cursor: checking ? 'not-allowed' : 'pointer',
          opacity: checking ? 0.7 : 1, flexShrink: 0,
        }}
      >
        <RefreshCw size={12} style={{ animation: checking ? 'spin 0.8s linear infinite' : 'none' }} />
        {checking ? 'Checking…' : 'Retry'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
