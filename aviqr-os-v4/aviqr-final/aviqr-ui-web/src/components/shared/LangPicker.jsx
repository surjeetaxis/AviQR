import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LANGUAGES } from '../../i18n/translations.js';
import './LangPicker.css';

// Named export for Topbar compatibility
export function useLang() {
  const { lang } = useAuth();
  return { lang: lang || 'en' };
}

export function LangPicker() {
  const { lang, changeLang } = useAuth();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="lang-picker" style={{ position: 'relative' }}>
      <button className="topbar-icon-btn" onClick={() => setOpen(o => !o)} title="Change language">
        <Globe size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div className="lang-dropdown" style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 50,
            background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', minWidth: 160, padding: 4, marginTop: 6,
          }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { changeLang(l.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 12px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  background: lang === l.code ? 'var(--green-light)' : 'transparent',
                  fontSize: 13, fontWeight: lang === l.code ? 600 : 400,
                  color: lang === l.code ? 'var(--green-darker)' : 'var(--gray-700)',
                }}>
                <span style={{ fontSize: 16 }}>{l.flag}</span>
                <span>{l.native}</span>
                {lang === l.code && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LangPicker;
