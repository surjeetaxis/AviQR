import React from 'react';
import { Check } from 'lucide-react';
import '../../pages/QRCodes.css';

// ── Design system — shared across every QR generation surface (shop/owner,
// hotel room/outlet, mall food-court, supplier brand) so they all get the
// same template/theme picker and printable banner instead of one-off plain QRs.

export const THEMES = {
  green:  { name: 'Brand Green',   bg: '#1D9E75', fg: '#ffffff', accent: '#d1fae5', acFg: '#065f46', qrDark: '#0a5c3e' },
  dark:   { name: 'Dark Luxury',   bg: '#18181b', fg: '#ffffff', accent: '#fbbf24', acFg: '#18181b', qrDark: '#18181b' },
  warm:   { name: 'Warm Sunset',   bg: '#ea580c', fg: '#ffffff', accent: '#fff7ed', acFg: '#7c2d12', qrDark: '#7c2d12' },
  blue:   { name: 'Ocean Blue',    bg: '#1d4ed8', fg: '#ffffff', accent: '#dbeafe', acFg: '#1e3a8a', qrDark: '#1e3a8a' },
  cream:  { name: 'Elegant Cream', bg: '#fef9c3', fg: '#1c1917', accent: '#fbbf24', acFg: '#1c1917', qrDark: '#78350f' },
};

export const TEMPLATES = [
  { id: 'tent',    label: 'Table Tent',   desc: 'Fold-over card for tables',   icon: '🪑' },
  { id: 'poster',  label: 'Wall Poster',  desc: 'A4 portrait print poster',    icon: '🖼️' },
  { id: 'counter', label: 'Counter Card', desc: 'Landscape card for counters', icon: '🏪' },
];

export function TentTemplate({ d, qrImg, compact }) {
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
            {d.subLabel || 'Table'} {d.tableNum}
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
        {d.contactOn && (
          <div className="tpl-wifi-block">
            <span className="tpl-wifi-icon">📍</span>
            <div>
              {d.contactPhone && <div className="tpl-wifi-name">📞 {d.contactPhone}</div>}
              {d.contactAddress && <div className="tpl-wifi-pass">{d.contactAddress}</div>}
              {d.contactWebsite && <div className="tpl-wifi-pass">🔗 {d.contactWebsite}</div>}
            </div>
          </div>
        )}
        {d.footerOn && <div className="tpl-footer-msg">{d.footerText}</div>}
        <div className="tpl-brand-tag">Powered by AviQR · aviqr.in</div>
      </div>
    </div>
  );
}

export function PosterTemplate({ d, qrImg }) {
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
          {d.tableNum ? `📍 ${d.subLabel || 'Table'} ${d.tableNum}` : '📱 Scan to Get Started'}
        </div>
      </div>
      {(d.discountOn || d.newItemOn || d.wifiOn || d.contactOn) && (
        <div className="tpl-poster-strip" style={{ background: t.accent, color: t.acFg }}>
          {d.discountOn && <div className="tpl-poster-offer" style={{ background: t.bg, color: t.fg }}>🏷️ {d.discountText}</div>}
          {d.newItemOn  && <div className="tpl-poster-new">✨ {d.newItemText}</div>}
          {d.wifiOn     && <div className="tpl-poster-wifi">📶 {d.wifiName}{d.wifiPass ? ` · ${d.wifiPass}` : ''}</div>}
          {d.contactOn  && (
            <div className="tpl-poster-wifi">
              {[d.contactPhone && `📞 ${d.contactPhone}`, d.contactAddress, d.contactWebsite && `🔗 ${d.contactWebsite}`]
                .filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      )}
      <div className="tpl-poster-footer" style={{ background: t.bg, color: t.fg }}>
        {d.footerOn ? d.footerText + ' · ' : ''}aviqr.in
      </div>
    </div>
  );
}

export function CounterTemplate({ d, qrImg }) {
  const t = THEMES[d.theme];
  return (
    <div className="tpl tpl-counter">
      <div className="tpl-counter-left" style={{ background: t.bg, color: t.fg }}>
        <div className="tpl-counter-shop">{d.shopName}</div>
        {d.tableNum && (
          <div className="tpl-counter-table-chip" style={{ background: t.accent, color: t.acFg }}>
            {d.subLabel || 'Table'} {d.tableNum}
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
        {d.contactOn && (
          <div className="tpl-counter-wifi">
            {d.contactPhone && <div>📞 {d.contactPhone}</div>}
            {d.contactAddress && <div>{d.contactAddress}</div>}
            {d.contactWebsite && <div>🔗 {d.contactWebsite}</div>}
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

export function TemplateRenderer({ d, qrImg, compact }) {
  if (d.template === 'tent')    return <TentTemplate    d={d} qrImg={qrImg} compact={compact} />;
  if (d.template === 'poster')  return <PosterTemplate  d={d} qrImg={qrImg} />;
  if (d.template === 'counter') return <CounterTemplate d={d} qrImg={qrImg} />;
  return null;
}

// ── Small shared form pieces ──────────────────────────────────────────────────

export function Section({ title, children }) {
  return (
    <div className="qrd-section">
      <div className="qrd-section-head">{title}</div>
      {children}
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, type = 'text' }) {
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

export function Toggle({ value, onChange }) {
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

export function ThemeSwatches({ value, onChange }) {
  return (
    <>
      <div className="qrd-theme-swatches">
        {Object.entries(THEMES).map(([key, t]) => (
          <button
            key={key}
            className={`qrd-swatch${value === key ? ' active' : ''}`}
            style={{ background: t.bg }}
            title={t.name}
            onClick={() => onChange(key)}
          >
            {value === key && <Check size={11} style={{ color: t.fg }} />}
          </button>
        ))}
      </div>
      <div className="qrd-theme-name">{THEMES[value].name}</div>
    </>
  );
}

export function TemplatePicker({ value, onChange }) {
  return (
    <div className="qrd-template-row">
      {TEMPLATES.map(t => (
        <button
          key={t.id}
          className={`qrd-tpl-btn${value === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="qrd-tpl-icon">{t.icon}</span>
          <span className="qrd-tpl-name">{t.label}</span>
          <span className="qrd-tpl-desc">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}
