// Builds print-ready HTML for the QR Poster/Print Studio. expo-print renders
// real HTML/CSS (via a native print engine), so these templates give the
// same visual fidelity as the web app's browser-print posters — just handed
// to Print.printAsync/printToFileAsync instead of window.print().

export const THEMES = {
  emerald:  { name: 'Emerald',  bg: '#0F6E56', text: '#FFFFFF', accent: '#5FE0B3', card: '#FFFFFF' },
  midnight: { name: 'Midnight', bg: '#131B2E', text: '#FFFFFF', accent: '#7C9CFF', card: '#FFFFFF' },
  sunset:   { name: 'Sunset',   bg: '#B4472A', text: '#FFFFFF', accent: '#FFD08A', card: '#FFFFFF' },
  ocean:    { name: 'Ocean',    bg: '#0B5E85', text: '#FFFFFF', accent: '#8FE3FF', card: '#FFFFFF' },
  cream:    { name: 'Cream',    bg: '#F3ECDD', text: '#3A2E20', accent: '#B4472A', card: '#FFFFFF' },
  charcoal: { name: 'Charcoal', bg: '#22262B', text: '#FFFFFF', accent: '#E0B34D', card: '#FFFFFF' },
};

export const TEMPLATES = [
  { key: 'tent',      label: 'Table Tent',   emoji: '⛺', desc: 'Fold-over card for tables', batchable: true },
  { key: 'poster',    label: 'Wall Poster',  emoji: '🖼️', desc: 'A4 poster for walls/windows', batchable: false },
  { key: 'counter',   label: 'Counter Card', emoji: '🏪', desc: 'Small card for the counter', batchable: false },
  { key: 'marketing', label: 'Marketing',    emoji: '✨', desc: 'Promo poster with a scan CTA', batchable: false },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const baseStyles = (theme) => `
  * { box-sizing: border-box; font-family: -apple-system, Helvetica, Arial, sans-serif; }
  body { margin: 0; padding: 0; background: #fff; }
  .card {
    background: ${theme.bg}; color: ${theme.text};
    border-radius: 18px; padding: 22px; position: relative; overflow: hidden;
  }
  .card::after {
    content: ''; position: absolute; right: -30px; bottom: -30px; width: 140px; height: 140px;
    border-radius: 999px; background: ${theme.accent}; opacity: 0.18;
  }
  .shop { font-size: 22px; font-weight: 800; margin: 0 0 2px; }
  .tagline { font-size: 12px; opacity: 0.85; margin: 0 0 14px; }
  .qr-wrap { background: #fff; border-radius: 12px; padding: 10px; display: inline-block; }
  .qr-wrap img { display: block; width: 128px; height: 128px; }
  .cta { font-size: 13px; font-weight: 700; margin-top: 10px; color: ${theme.accent}; }
  .badge {
    display: inline-block; background: ${theme.accent}; color: #1a1a1a; font-weight: 800;
    font-size: 11px; padding: 3px 9px; border-radius: 999px; margin: 6px 6px 0 0;
  }
  .meta { font-size: 11px; opacity: 0.8; margin-top: 10px; line-height: 1.6; }
  .table-num {
    position: absolute; top: 18px; right: 18px; font-size: 26px; font-weight: 900;
    background: rgba(255,255,255,0.15); border-radius: 10px; padding: 4px 12px;
  }
`;

function cardBody({ theme, qrDataUrl, form, tableNum }) {
  const badges = [];
  if (form.discountOn && form.discountText) badges.push(`<span class="badge">${esc(form.discountText)}</span>`);
  if (form.newItemOn && form.newItemText) badges.push(`<span class="badge">✨ ${esc(form.newItemText)}</span>`);

  const meta = [];
  if (form.wifiOn && form.wifiName) meta.push(`📶 WiFi: <b>${esc(form.wifiName)}</b>${form.wifiPass ? ` &middot; ${esc(form.wifiPass)}` : ''}`);
  if (form.contactOn) {
    if (form.contactPhone) meta.push(`📞 ${esc(form.contactPhone)}`);
    if (form.contactAddress) meta.push(`📍 ${esc(form.contactAddress)}`);
    if (form.contactWebsite) meta.push(`🌐 ${esc(form.contactWebsite)}`);
  }
  if (form.footerOn && form.footerText) meta.push(esc(form.footerText));

  return `
    <div class="card">
      ${tableNum ? `<div class="table-num">#${esc(tableNum)}</div>` : ''}
      <p class="shop">${esc(form.shopName)}</p>
      ${form.tagline ? `<p class="tagline">${esc(form.tagline)}</p>` : ''}
      <div class="qr-wrap"><img src="${qrDataUrl}" /></div>
      <p class="cta">${form.scanCta ? esc(form.scanCta) : 'Scan to view menu & order'}</p>
      <div>${badges.join('')}</div>
      ${meta.length ? `<div class="meta">${meta.join('<br/>')}</div>` : ''}
    </div>
  `;
}

// Single-card templates: tent / poster / counter / marketing all share the
// same card markup, just sized differently on the page.
const SIZES = {
  tent:      { width: '340px', pad: '24px' },
  poster:    { width: '480px', pad: '40px' },
  counter:   { width: '280px', pad: '20px' },
  marketing: { width: '420px', pad: '36px' },
};

export function buildSingleHtml({ template, themeKey, form, qrDataUrl }) {
  const theme = THEMES[themeKey] || THEMES.emerald;
  const size = SIZES[template] || SIZES.poster;
  return `<!doctype html><html><head><meta charset="utf-8" />
    <style>${baseStyles(theme)}
      body { display: flex; justify-content: center; padding: ${size.pad}; }
      .card { width: ${size.width}; }
    </style></head>
    <body>${cardBody({ theme, qrDataUrl, form })}</body></html>`;
}

export function buildBatchHtml({ themeKey, form, cards }) {
  // cards: [{ tableNum, qrDataUrl }]
  const theme = THEMES[themeKey] || THEMES.emerald;
  const items = cards.map(c => `<div class="grid-item">${cardBody({ theme, qrDataUrl: c.qrDataUrl, form, tableNum: c.tableNum })}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8" />
    <style>${baseStyles(theme)}
      body { padding: 16px; }
      .grid { display: flex; flex-wrap: wrap; gap: 16px; }
      .grid-item { width: 340px; }
      .grid-item .card { width: 100%; }
      @media print { .grid-item { page-break-inside: avoid; } }
    </style></head>
    <body><div class="grid">${items}</div></body></html>`;
}

export const BATCH_SIZES = [2, 4, 6, 8, 10, 12, 15, 20];

export const DEFAULT_FORM = {
  shopName: '', tagline: '', scanCta: '',
  discountOn: false, discountText: '10% off today',
  newItemOn: false, newItemText: '',
  wifiOn: false, wifiName: '', wifiPass: '',
  contactOn: false, contactPhone: '', contactAddress: '', contactWebsite: '',
  footerOn: false, footerText: 'Thank you for visiting!',
};
