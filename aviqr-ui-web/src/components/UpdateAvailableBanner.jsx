// UpdateAvailableBanner — shown when the Service Worker has finished
// installing a new version in the background (see src/pwa/registerServiceWorker.js).
// The new caches are already active by the time this appears; this banner
// only offers to reload the current tab so its in-memory JS/CSS catches up.
import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { SW_UPDATE_EVENT } from '../pwa/registerServiceWorker.js';

export default function UpdateAvailableBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener(SW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
      maxWidth: 420, margin: '0 auto',
      background: '#111111', color: '#fff',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,.25)',
      fontSize: 13.5,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>A new version is ready</div>
        <div style={{ color: '#9CA3AF', fontSize: 12.5 }}>Refresh to get the latest features and fixes.</div>
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          background: '#1D9E75', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 14px', fontSize: 12.5,
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        <RefreshCw size={13} /> Refresh
      </button>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          background: 'transparent', border: 'none', color: '#9CA3AF',
          cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
