import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Plus, Printer, Eye, Link, Check, Palette, LayoutGrid, Layout, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { qrApi } from '../api/index.js';
import './QRCodes.css';

// ── Design system ──────────────────────────────────────────────────────────────

const THEMES = {
  green:  { name: 'Brand Green',   bg: '#1D9E75', fg: '#ffffff', accent: '#d1fae5', acFg: '#065f46', qrDark: '#0a5c3e' },
  dark:   { name: 'Dark Luxury',   bg: '#18181b', fg: '#ffffff', accent: '#fbbf24', acFg: '#18181b', qrDark: '#18181b' },
  warm:   { name: 'Warm Sunset',   bg: '#ea580c', fg: '#ffffff', accent: '#fff7ed', acFg: '#7c2d12', qrDark: '#7c2d12' },
  blue:   { name: 'Ocean Blue',    bg: '#1d4ed8', fg: '#ffffff', accent: '#dbeafe', acFg: '#1e3a8a', qrDark: '#1e3a8a' },
  cream:  { name: 'Elegant Cream', bg: '#fef9c3', fg: '#1c1917', accent: '#fbbf24', acFg: '#1c1917', qrDark: '#78350f' },
};

const QR_TYPES = [
  { value: 'TABLE', label: 'Table QR',  badge: 'blue'   },
  { value: 'SHOP',  label: 'Shop QR',   badge: 'green'  },
  { value: 'PROMO', label: 'Promo QR',  badge: 'amber'  },
];

const TEMPLATES = [
  { id: 'tent',    label: 'Table Tent',   desc: 'Fold-over card for tables',   icon: '🪑' },
  { id: 'poster',  label: 'Wall Poster',  desc: 'A4 portrait print poster',    icon: '🖼️' },
  { id: 'counter', label: 'Counter Card', desc: 'Landscape card for counters', icon: '🏪' },
];

const ADVERT_TARGETS = [
  { id: 'website',    label: 'AviQR Website',       url: 'https://aviqr.in',                                   icon: '🌐' },
  { id: 'playstore',  label: 'Google Play Store',    url: 'https://play.google.com/store/apps/details?id=in.aviqr', icon: '🤖' },
  { id: 'appstore',   label: 'Apple App Store',      url: 'https://apps.apple.com/app/aviqr',                   icon: '' },
  { id: 'custom',     label: 'Custom URL',           url: '',                                                   icon: '✏️' },
];

const ADVERT_DEFAULTS = {
  template:     'poster',
  theme:        'green',
  shopName:     'AviQR',
  tableNum:     '',
  tagline:      'Manage Your Menu with QR Codes',
  discountOn:   false,
  discountText: 'Free to Get Started!',
  newItemOn:    false,
  newItemText:  'Scan to Download the App',
  wifiOn:       false,
  wifiName:     '',
  wifiPass:     '',
  footerOn:     true,
  footerText:   'aviqr.in — Smart QR for every business',
};

const DEFAULTS = {
  template:     'tent',
  theme:        'green',
  shopName:     'My Restaurant',
  tableNum:     '',
  tagline:      'Scan to Order',
  discountOn:   false,
  discountText: '20% OFF on Your First Order!',
  newItemOn:    false,
  newItemText:  'New: Summer Special Menu 🌿',
  wifiOn:       false,
  wifiName:     'Restaurant_WiFi',
  wifiPass:     '',
  footerOn:     true,
  footerText:   'Thank you for dining with us!',
};

// ── Template Components ────────────────────────────────────────────────────────

function TentTemplate({ d, qrImg, compact }) {
  const t = THEMES[d.theme];
  const scale = compact ? 0.65 : 1;
  return (
    <div className="tpl tpl-tent" style={compact ? { transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: -100 * (1 - scale) } : {}}>
      {/* FRONT — shown to customer after folding */}
      <div className="tpl-tent-front" style={{ background: t.bg, color: t.fg }}>
        <div className="tpl-shop-name">{d.shopName}</div>
        {qrImg && (
          <div className="tpl-qr-wrap">
            <img src={qrImg} alt="QR Code" className="tpl-qr-img" />
          </div>
        )}
        <div className="tpl-tagline">{d.tagline}</div>
        {d.tableNum && (
          <div className="tpl-table-chip" style={{ background: t.accent, color: t.acFg }}>
            Table {d.tableNum}
          </div>
        )}
      </div>
      {/* FOLD LINE */}
      <div className="tpl-fold-line">
        <span>✂ fold here</span>
      </div>
      {/* BACK — faces away after folding */}
      <div className="tpl-tent-back" style={{ background: t.accent, color: t.acFg }}>
        {d.discountOn && (
          <div className="tpl-discount-pill" style={{ background: t.bg, color: t.fg }}>
            🏷️ {d.discountText}
          </div>
        )}
        {d.newItemOn && (
          <div className="tpl-new-item-row">✨ {d.newItemText}</div>
        )}
        {d.wifiOn && (
          <div className="tpl-wifi-block">
            <span className="tpl-wifi-icon">📶</span>
            <div>
              <div className="tpl-wifi-name">{d.wifiName}</div>
              {d.wifiPass && <div className="tpl-wifi-pass">🔑 {d.wifiPass}</div>}
            </div>
          </div>
        )}
        {d.footerOn && <div className="tpl-footer-msg">{d.footerText}</div>}
        <div className="tpl-brand-tag">Powered by AviQR · aviqr.in</div>
      </div>
    </div>
  );
}

function PosterTemplate({ d, qrImg }) {
  const t = THEMES[d.theme];
  return (
    <div className="tpl tpl-poster">
      <div className="tpl-poster-header" style={{ background: t.bg, color: t.fg }}>
        <div className="tpl-poster-shop">{d.shopName}</div>
        <div className="tpl-poster-sub">{d.tagline}</div>
      </div>
      <div className="tpl-poster-body">
        <div className="tpl-poster-qr-frame" style={{ borderColor: t.bg }}>
          {qrImg && <img src={qrImg} alt="QR Code" className="tpl-poster-qr" />}
        </div>
        <div className="tpl-poster-cta" style={{ color: t.bg }}>
          {d.tableNum ? `📍 Table ${d.tableNum}` : '📱 Scan & Order Instantly'}
        </div>
      </div>
      {(d.discountOn || d.newItemOn || d.wifiOn) && (
        <div className="tpl-poster-strip" style={{ background: t.accent, color: t.acFg }}>
          {d.discountOn && <div className="tpl-poster-offer" style={{ background: t.bg, color: t.fg }}>🏷️ {d.discountText}</div>}
          {d.newItemOn  && <div className="tpl-poster-new">✨ {d.newItemText}</div>}
          {d.wifiOn     && <div className="tpl-poster-wifi">📶 {d.wifiName}{d.wifiPass ? ` · ${d.wifiPass}` : ''}</div>}
        </div>
      )}
      <div className="tpl-poster-footer" style={{ background: t.bg, color: t.fg }}>
        {d.footerOn ? d.footerText + ' · ' : ''}aviqr.in
      </div>
    </div>
  );
}

function CounterTemplate({ d, qrImg }) {
  const t = THEMES[d.theme];
  return (
    <div className="tpl tpl-counter">
      <div className="tpl-counter-left" style={{ background: t.bg, color: t.fg }}>
        <div className="tpl-counter-shop">{d.shopName}</div>
        {d.tableNum && (
          <div className="tpl-counter-table-chip" style={{ background: t.accent, color: t.acFg }}>
            Table {d.tableNum}
          </div>
        )}
        {d.discountOn && <div className="tpl-counter-offer">🏷️ {d.discountText}</div>}
        {d.newItemOn  && <div className="tpl-counter-new">✨ {d.newItemText}</div>}
        {d.wifiOn && (
          <div className="tpl-counter-wifi">
            📶 <strong>{d.wifiName}</strong>
            {d.wifiPass && <span> · {d.wifiPass}</span>}
          </div>
        )}
        <div className="tpl-counter-brand">aviqr.in</div>
      </div>
      <div className="tpl-counter-right">
        {qrImg && <img src={qrImg} alt="QR Code" className="tpl-counter-qr" />}
        <div className="tpl-counter-cta" style={{ color: t.bg }}>{d.tagline}</div>
        {d.footerOn && <div className="tpl-counter-footer">{d.footerText}</div>}
      </div>
    </div>
  );
}

function TemplateRenderer({ d, qrImg, compact }) {
  if (d.template === 'tent')    return <TentTemplate    d={d} qrImg={qrImg} compact={compact} />;
  if (d.template === 'poster')  return <PosterTemplate  d={d} qrImg={qrImg} />;
  if (d.template === 'counter') return <CounterTemplate d={d} qrImg={qrImg} />;
  return null;
}

// ── Small shared components ────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="qrd-section">
      <div className="qrd-section-head">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="qrd-field">
      {label && <label className="qrd-label">{label}</label>}
      <input
        className="qrd-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
      />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`qrd-toggle${value ? ' on' : ''}`}
      onClick={() => onChange(!value)}
      aria-label="toggle"
      style={{ background: value ? THEMES.green.bg : 'var(--gray-200)' }}
    >
      <div className="qrd-toggle-knob" style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );
}

function QrThumb({ code, size = 80 }) {
  const [err, setErr] = React.useState(false);
  const src = qrApi.imageUrl(code?.qrCode || code?.id || 'x');
  return (
    <div style={{
      width: size, height: size,
      background: '#fff', borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', border: '1px solid var(--gray-200)', flexShrink: 0
    }}>
      {!err
        ? <img src={src} alt="QR" width={size} height={size} style={{ objectFit: 'contain' }} onError={() => setErr(true)} />
        : <span style={{ fontSize: size * 0.35 }}>🔲</span>
      }
    </div>
  );
}

function TypeChip({ type }) {
  const map = {
    TABLE: { bg: '#dbeafe', color: '#1e40af' },
    SHOP:  { bg: '#d1fae5', color: '#065f46' },
    PROMO: { bg: '#fef3c7', color: '#92400e' },
    WIFI:  { bg: '#ede9fe', color: '#5b21b6' },
  };
  const s = map[type] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px',
      borderRadius: 999, ...s,
    }}>{type}</span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function QRCodes() {
  const { user, isAdmin, isSupport } = useAuth();
  const nav = useNavigate();
  const shopId = user?.shopId;
  const canAdvertise = isAdmin || isSupport;

  if (!shopId) return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'#6B7280' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📱</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#111827', marginBottom:8 }}>No restaurant yet</h2>
      <p style={{ fontSize:14, marginBottom:24 }}>Complete the setup to generate your QR codes.</p>
      <button onClick={() => nav('/')} style={{ padding:'10px 24px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
        Complete setup →
      </button>
    </div>
  );

  const [tab, setTab]             = useState('list');
  const [codes, setCodes]         = useState([]);
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState(null);
  const [error, setError]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [selCode, setSelCode]     = useState(null);
  const [design, setDesign]       = useState(DEFAULTS);
  const [qrImg, setQrImg]         = useState('');
  const [batchCount, setBatchCount] = useState(6);
  const [batchImgs, setBatchImgs] = useState([]);
  const [batchReady, setBatchReady] = useState(false);

  // Advertise QR state
  const [advertTarget, setAdvertTarget] = useState(ADVERT_TARGETS[0].id);
  const [advertCustomUrl, setAdvertCustomUrl]   = useState('');
  const [advertDesign, setAdvertDesign] = useState(ADVERT_DEFAULTS);
  const [advertQrImg, setAdvertQrImg]   = useState('');

  // Load QR codes
  useEffect(() => {
    qrApi.getByShop(shopId)
      .then(res => {
        const d = res.data.data || [];
        setCodes(d);
        if (d.length) {
          setSelCode(d[0]);
          setDesign(p => ({ ...p, shopName: user?.businessName || p.shopName }));
        }
      })
      .catch(e => setError(e.response?.data?.message || 'Could not load QR codes'));
  }, [shopId, user?.businessName]);

  const qrUrl  = selCode?.targetUrl || `https://aviqr.in/menu/${shopId}`;
  const theme  = THEMES[design.theme];

  // Regenerate QR data-URL when URL or theme color changes
  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 2,
      color: { dark: theme.qrDark, light: '#ffffff' },
    }).then(setQrImg).catch(() => {});
  }, [qrUrl, theme.qrDark]);

  // Batch QR generation
  useEffect(() => {
    setBatchReady(false);
    const base = selCode?.targetUrl || `https://aviqr.in/menu/${shopId}`;
    Promise.all(
      Array.from({ length: batchCount }, (_, i) =>
        QRCode.toDataURL(`${base}?t=${i + 1}`, {
          width: 300, margin: 2,
          color: { dark: theme.qrDark, light: '#ffffff' },
        })
      )
    ).then(imgs => { setBatchImgs(imgs); setBatchReady(true); });
  }, [batchCount, selCode, theme.qrDark, shopId]);

  const setD = (k, v) => setDesign(p => ({ ...p, [k]: v }));
  const setAD = (k, v) => setAdvertDesign(p => ({ ...p, [k]: v }));

  const advertUrl = (() => {
    const t = ADVERT_TARGETS.find(t => t.id === advertTarget);
    return advertTarget === 'custom' ? (advertCustomUrl || 'https://aviqr.in') : (t?.url || 'https://aviqr.in');
  })();

  // Regenerate advertise QR when URL or theme changes
  useEffect(() => {
    if (!canAdvertise) return;
    const advertTheme = THEMES[advertDesign.theme];
    QRCode.toDataURL(advertUrl, {
      width: 512,
      margin: 2,
      color: { dark: advertTheme.qrDark, light: '#ffffff' },
    }).then(setAdvertQrImg).catch(() => {});
  }, [advertUrl, advertDesign.theme, canAdvertise]);

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const create = async (type, label) => {
    setCreating(true);
    try {
      await qrApi.create(shopId, { type, label });
      const res = await qrApi.getByShop(shopId);
      const d = res.data.data || [];
      setCodes(d);
      if (d.length) setSelCode(d[d.length - 1]);
    } catch {
      const c = {
        id: `local_${Date.now()}`,
        qrCode: `${type}_${Date.now()}`,
        targetUrl: `https://aviqr.in/menu/${shopId}`,
        label, type, scanCount: 0, active: true,
      };
      setCodes(p => [...p, c]);
      setSelCode(c);
    }
    setCreating(false);
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const openDesigner = (code) => {
    setSelCode(code);
    setPreview(null);
    setTab('designer');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-content qrd-page">
      {error && (
        <div className="demo-notice" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="qrd-tabbar">
        {[
          { id: 'list',      icon: <LayoutGrid size={14}/>,  label: 'My QR Codes' },
          { id: 'designer',  icon: <Palette size={14}/>,     label: 'Print Designer' },
          { id: 'batch',     icon: <Layout size={14}/>,      label: 'Batch Print' },
          ...(canAdvertise ? [{ id: 'advertise', icon: <Megaphone size={14}/>, label: 'Advertise QR' }] : []),
        ].map(t => (
          <button
            key={t.id}
            className={`qrd-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: My QR Codes                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'list' && (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">QR Codes</h1>
              <p className="page-subtitle">
                {codes.length} codes · {codes.reduce((n, c) => n + (c.scanCount || 0), 0).toLocaleString('en-IN')} total scans
              </p>
            </div>
            <div className="page-header-actions">
              {QR_TYPES.map(t => (
                <button
                  key={t.value}
                  className="btn btn-secondary"
                  disabled={creating}
                  onClick={() => create(t.value, `${t.label} ${codes.filter(c => c.type === t.value).length + 1}`)}
                >
                  <Plus size={13} />
                  {creating ? '…' : t.label}
                </button>
              ))}
            </div>
          </div>

          {codes.length === 0 ? (
            <div className="qrd-empty-state">
              <div className="qrd-empty-icon">📱</div>
              <div className="qrd-empty-title">No QR codes yet</div>
              <div className="qrd-empty-sub">Create your first QR code above to get started</div>
            </div>
          ) : (
            <div className="qrd-list-grid">
              {codes.map(code => (
                <div key={code.id} className="card qrd-card">
                  <div className="qrd-card-top">
                    <div className="qrd-card-thumb" onClick={() => setPreview(code)}>
                      <QrThumb code={code} size={72} />
                    </div>
                    <div className="qrd-card-info">
                      <div className="qrd-card-name">{code.label || 'QR Code'}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <TypeChip type={code.type} />
                        {!code.active && (
                          <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        👁 {(code.scanCount || 0).toLocaleString('en-IN')} scans
                      </div>
                      <div className="qrd-card-url">{code.targetUrl}</div>
                    </div>
                  </div>
                  <div className="qrd-card-actions">
                    <button className="btn btn-secondary" style={{ flex: 1, height: 32, fontSize: 12 }} onClick={() => setPreview(code)}>
                      <Eye size={12}/> Preview
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, height: 32, fontSize: 12 }} onClick={() => openDesigner(code)}>
                      <Printer size={12}/> Design
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, height: 32, fontSize: 12 }} onClick={() => copyUrl(code.targetUrl, code.id)}>
                      {copied === code.id ? <Check size={12}/> : <Link size={12}/>}
                      {copied === code.id ? ' Copied' : ' URL'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Print Designer                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'designer' && (
        <div className="qrd-designer">
          {/* ── Left: Controls ── */}
          <div className="qrd-controls-col">

            <Section title="QR Code Source">
              <div className="qrd-field">
                <label className="qrd-label">Select QR Code</label>
                <select
                  className="qrd-select"
                  value={selCode?.id || ''}
                  onChange={e => setSelCode(codes.find(c => c.id === e.target.value) || null)}
                >
                  {codes.length === 0 && <option value="">No QR codes — create one first</option>}
                  {codes.map(c => (
                    <option key={c.id} value={c.id}>{c.label} ({c.type})</option>
                  ))}
                </select>
              </div>
              {selCode && (
                <div className="qrd-url-hint">{selCode.targetUrl}</div>
              )}
            </Section>

            <Section title="Template Style">
              <div className="qrd-template-row">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    className={`qrd-tpl-btn${design.template === t.id ? ' active' : ''}`}
                    onClick={() => setD('template', t.id)}
                  >
                    <span className="qrd-tpl-icon">{t.icon}</span>
                    <span className="qrd-tpl-name">{t.label}</span>
                    <span className="qrd-tpl-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Color Theme">
              <div className="qrd-theme-swatches">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    className={`qrd-swatch${design.theme === key ? ' active' : ''}`}
                    style={{ background: t.bg }}
                    title={t.name}
                    onClick={() => setD('theme', key)}
                  >
                    {design.theme === key && <Check size={11} style={{ color: t.fg }} />}
                  </button>
                ))}
              </div>
              <div className="qrd-theme-name">{THEMES[design.theme].name}</div>
            </Section>

            <Section title="Text Content">
              <div className="qrd-fields-stack">
                <Field label="Shop / Venue Name" value={design.shopName} onChange={v => setD('shopName', v)} />
                <Field label="Table Number (optional)" value={design.tableNum} onChange={v => setD('tableNum', v)} placeholder="e.g. 1, A3, VIP" />
                <Field label="Tagline" value={design.tagline} onChange={v => setD('tagline', v)} />
              </div>
            </Section>

            <Section title="Extras & Promotions">
              <div className="qrd-extras-list">

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">🏷️ Discount Badge</span>
                      <span className="qrd-extra-hint">Highlight a special offer</span>
                    </div>
                    <Toggle value={design.discountOn} onChange={v => setD('discountOn', v)} />
                  </div>
                  {design.discountOn && (
                    <Field
                      value={design.discountText}
                      onChange={v => setD('discountText', v)}
                      placeholder="e.g. 20% OFF on First Order!"
                    />
                  )}
                </div>

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">✨ New Item Highlight</span>
                      <span className="qrd-extra-hint">Promote a new menu item</span>
                    </div>
                    <Toggle value={design.newItemOn} onChange={v => setD('newItemOn', v)} />
                  </div>
                  {design.newItemOn && (
                    <Field
                      value={design.newItemText}
                      onChange={v => setD('newItemText', v)}
                      placeholder="e.g. Try our new Mango Lassi!"
                    />
                  )}
                </div>

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">📶 WiFi Details</span>
                      <span className="qrd-extra-hint">Show network name & password</span>
                    </div>
                    <Toggle value={design.wifiOn} onChange={v => setD('wifiOn', v)} />
                  </div>
                  {design.wifiOn && (
                    <div className="qrd-fields-stack">
                      <Field value={design.wifiName} onChange={v => setD('wifiName', v)} placeholder="Network name (SSID)" />
                      <Field value={design.wifiPass} onChange={v => setD('wifiPass', v)} placeholder="Password (leave blank if open)" />
                    </div>
                  )}
                </div>

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">📝 Footer Message</span>
                      <span className="qrd-extra-hint">Thank-you or closing note</span>
                    </div>
                    <Toggle value={design.footerOn} onChange={v => setD('footerOn', v)} />
                  </div>
                  {design.footerOn && (
                    <Field value={design.footerText} onChange={v => setD('footerText', v)} />
                  )}
                </div>

              </div>
            </Section>
          </div>

          {/* ── Right: Preview ── */}
          <div className="qrd-preview-col">
            <div className="qrd-preview-bar">
              <div>
                <div className="qrd-preview-bar-title">Live Preview</div>
                <div className="qrd-preview-bar-sub">
                  {TEMPLATES.find(t => t.id === design.template)?.label} · {THEMES[design.theme].name}
                </div>
              </div>
              <button className="btn btn-primary qrd-print-btn" onClick={handlePrint}>
                <Printer size={14}/> Print Now
              </button>
            </div>

            <div className="qrd-preview-canvas">
              {qrImg
                ? <TemplateRenderer d={design} qrImg={qrImg} />
                : <div className="qrd-preview-loading">Generating QR…</div>
              }
            </div>

            <div className="qrd-print-tip">
              <span>💡</span>
              <span>Click <strong>Print Now</strong>, then choose <em>Save as PDF</em> for a printable file. Use A4 paper for best results.</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Batch Print                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'batch' && (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Batch Table Tents</h1>
              <p className="page-subtitle">Generate & print all table cards at once</p>
            </div>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!batchReady}>
              <Printer size={14}/> Print All {batchCount} Cards
            </button>
          </div>

          <div className="card qrd-batch-config">
            <div className="qrd-field" style={{ width: 160 }}>
              <label className="qrd-label">Number of Tables</label>
              <select className="qrd-select" value={batchCount} onChange={e => setBatchCount(Number(e.target.value))}>
                {[2, 4, 6, 8, 10, 12, 15, 20].map(n => (
                  <option key={n} value={n}>{n} tables</option>
                ))}
              </select>
            </div>
            <div>
              <div className="qrd-label" style={{ marginBottom: 6 }}>Color Theme</div>
              <div className="qrd-theme-swatches">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    className={`qrd-swatch${design.theme === key ? ' active' : ''}`}
                    style={{ background: t.bg }}
                    title={t.name}
                    onClick={() => setD('theme', key)}
                  >
                    {design.theme === key && <Check size={11} style={{ color: t.fg }} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="qrd-field" style={{ flex: 1, minWidth: 200 }}>
              <label className="qrd-label">Shop Name</label>
              <input className="qrd-input" value={design.shopName} onChange={e => setD('shopName', e.target.value)} />
            </div>
            <div className="qrd-field" style={{ flex: 1, minWidth: 200 }}>
              <label className="qrd-label">Tagline</label>
              <input className="qrd-input" value={design.tagline} onChange={e => setD('tagline', e.target.value)} />
            </div>
          </div>

          {/* Batch extras quick toggles */}
          <div className="qrd-batch-extras">
            <div className="qrd-batch-extra-item">
              <Toggle value={design.discountOn} onChange={v => setD('discountOn', v)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🏷️ Discount Badge</div>
                {design.discountOn && (
                  <input className="qrd-input" style={{ marginTop: 4 }} value={design.discountText} onChange={e => setD('discountText', e.target.value)} />
                )}
              </div>
            </div>
            <div className="qrd-batch-extra-item">
              <Toggle value={design.newItemOn} onChange={v => setD('newItemOn', v)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>✨ New Item Highlight</div>
                {design.newItemOn && (
                  <input className="qrd-input" style={{ marginTop: 4 }} value={design.newItemText} onChange={e => setD('newItemText', e.target.value)} />
                )}
              </div>
            </div>
            <div className="qrd-batch-extra-item">
              <Toggle value={design.wifiOn} onChange={v => setD('wifiOn', v)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>📶 WiFi Info</div>
                {design.wifiOn && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input className="qrd-input" placeholder="Network name" value={design.wifiName} onChange={e => setD('wifiName', e.target.value)} />
                    <input className="qrd-input" placeholder="Password" value={design.wifiPass} onChange={e => setD('wifiPass', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Batch preview grid */}
          {!batchReady ? (
            <div className="qrd-preview-loading" style={{ height: 200 }}>Generating {batchCount} QR codes…</div>
          ) : (
            <div className="qrd-batch-preview-grid">
              {batchImgs.map((img, i) => (
                <div key={i} className="qrd-batch-card-wrap">
                  <TentTemplate d={{ ...design, tableNum: String(i + 1) }} qrImg={img} compact />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Advertise QR  (admin + support only)                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'advertise' && canAdvertise && (
        <div className="qrd-designer">
          {/* ── Left: Controls ── */}
          <div className="qrd-controls-col">

            <Section title="Promote Target">
              <div className="qrd-advert-targets">
                {ADVERT_TARGETS.map(t => (
                  <button
                    key={t.id}
                    className={`qrd-advert-target-btn${advertTarget === t.id ? ' active' : ''}`}
                    onClick={() => setAdvertTarget(t.id)}
                  >
                    <span className="qrd-advert-target-icon">{t.icon}</span>
                    <span className="qrd-advert-target-label">{t.label}</span>
                    {t.id !== 'custom' && (
                      <span className="qrd-advert-target-url">{t.url}</span>
                    )}
                  </button>
                ))}
              </div>
              {advertTarget === 'custom' && (
                <Field
                  label="Custom URL"
                  value={advertCustomUrl}
                  onChange={setAdvertCustomUrl}
                  placeholder="https://your-promo-link.com"
                />
              )}
              {advertTarget !== 'custom' && (
                <div className="qrd-url-hint">
                  QR will point to: {advertUrl}
                </div>
              )}
            </Section>

            <Section title="Template Style">
              <div className="qrd-template-row">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    className={`qrd-tpl-btn${advertDesign.template === t.id ? ' active' : ''}`}
                    onClick={() => setAD('template', t.id)}
                  >
                    <span className="qrd-tpl-icon">{t.icon}</span>
                    <span className="qrd-tpl-name">{t.label}</span>
                    <span className="qrd-tpl-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Color Theme">
              <div className="qrd-theme-swatches">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    className={`qrd-swatch${advertDesign.theme === key ? ' active' : ''}`}
                    style={{ background: t.bg }}
                    title={t.name}
                    onClick={() => setAD('theme', key)}
                  >
                    {advertDesign.theme === key && <Check size={11} style={{ color: t.fg }} />}
                  </button>
                ))}
              </div>
              <div className="qrd-theme-name">{THEMES[advertDesign.theme].name}</div>
            </Section>

            <Section title="Text Content">
              <div className="qrd-fields-stack">
                <Field label="Brand Name" value={advertDesign.shopName} onChange={v => setAD('shopName', v)} />
                <Field label="Headline / Tagline" value={advertDesign.tagline} onChange={v => setAD('tagline', v)} />
              </div>
            </Section>

            <Section title="Extras">
              <div className="qrd-extras-list">

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">🏷️ Offer Badge</span>
                      <span className="qrd-extra-hint">Highlight a promotion or feature</span>
                    </div>
                    <Toggle value={advertDesign.discountOn} onChange={v => setAD('discountOn', v)} />
                  </div>
                  {advertDesign.discountOn && (
                    <Field
                      value={advertDesign.discountText}
                      onChange={v => setAD('discountText', v)}
                      placeholder="e.g. Free to Get Started!"
                    />
                  )}
                </div>

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">✨ Feature Highlight</span>
                      <span className="qrd-extra-hint">Call out a key app feature</span>
                    </div>
                    <Toggle value={advertDesign.newItemOn} onChange={v => setAD('newItemOn', v)} />
                  </div>
                  {advertDesign.newItemOn && (
                    <Field
                      value={advertDesign.newItemText}
                      onChange={v => setAD('newItemText', v)}
                      placeholder="e.g. Scan to Download the App"
                    />
                  )}
                </div>

                <div className="qrd-extra-block">
                  <div className="qrd-extra-row">
                    <div className="qrd-extra-meta">
                      <span className="qrd-extra-label">📝 Footer Message</span>
                      <span className="qrd-extra-hint">Closing note or website</span>
                    </div>
                    <Toggle value={advertDesign.footerOn} onChange={v => setAD('footerOn', v)} />
                  </div>
                  {advertDesign.footerOn && (
                    <Field value={advertDesign.footerText} onChange={v => setAD('footerText', v)} />
                  )}
                </div>

              </div>
            </Section>

          </div>

          {/* ── Right: Preview ── */}
          <div className="qrd-preview-col">
            <div className="qrd-preview-bar">
              <div>
                <div className="qrd-preview-bar-title">Advertise QR Preview</div>
                <div className="qrd-preview-bar-sub">
                  {TEMPLATES.find(t => t.id === advertDesign.template)?.label} · {THEMES[advertDesign.theme].name}
                </div>
              </div>
              <button className="btn btn-primary qrd-print-btn" onClick={handlePrint}>
                <Printer size={14}/> Print Now
              </button>
            </div>

            <div className="qrd-advert-badge">
              <Megaphone size={13}/>
              Promotional QR — links to <strong>{ADVERT_TARGETS.find(t => t.id === advertTarget)?.label}</strong>
            </div>

            <div className="qrd-preview-canvas">
              {advertQrImg
                ? <TemplateRenderer d={advertDesign} qrImg={advertQrImg} />
                : <div className="qrd-preview-loading">Generating QR…</div>
              }
            </div>

            <div className="qrd-print-tip">
              <span>💡</span>
              <span>Print and place this QR at your venue to let customers discover the AviQR app. Click <strong>Print Now</strong> → <em>Save as PDF</em>.</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Simple QR preview modal                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {preview && (
        <div className="qrd-overlay" onClick={() => setPreview(null)}>
          <div className="qrd-modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{preview.label}</h2>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
              <TypeChip type={preview.type} />
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: 'var(--gray-50)', borderRadius: 12, marginBottom: 16 }}>
              <QrThumb code={preview} size={200} />
            </div>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-400)', marginBottom: 20, wordBreak: 'break-all', textAlign: 'center' }}>
              {preview.targetUrl}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => copyUrl(preview.targetUrl, 'modal')}>
                {copied === 'modal' ? '✓ Copied!' : 'Copy URL'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openDesigner(preview)}>
                <Printer size={13}/> Open Designer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Print Portal — renders directly in <body>, isolated from layout       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {createPortal(
        <div id="qr-print-zone">
          {tab === 'designer' && qrImg && (
            <div className="qr-print-single">
              <TemplateRenderer d={design} qrImg={qrImg} />
            </div>
          )}
          {tab === 'batch' && batchReady && (
            <div className="qr-print-batch-grid">
              {batchImgs.map((img, i) => (
                <TentTemplate
                  key={i}
                  d={{ ...design, tableNum: String(i + 1) }}
                  qrImg={img}
                />
              ))}
            </div>
          )}
          {tab === 'advertise' && advertQrImg && (
            <div className="qr-print-single">
              <TemplateRenderer d={advertDesign} qrImg={advertQrImg} />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}