import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Printer, Download, Check } from 'lucide-react';
import {
  THEMES, TEMPLATES, TemplateRenderer,
  Section, Field, Toggle,
} from './QrTemplates.jsx';

// Reusable "design & print a QR banner" modal — the same template/theme picker
// and shop-info/discount/wifi banner the Owner's Print Designer offers, wired
// up so Hotel (room/outlet), Mall (food court) and Supplier (brand) QR surfaces
// get it too, each pre-filled with their own entity's info instead of a plain,
// undecorated QR image.
export default function QrDesignerModal({
  open,
  onClose,
  targetUrl,
  title = 'Design & Print QR',
  nameLabel = 'Name',
  nameDefault = '',
  taglineDefault = 'Scan to get started',
  subLabel = null,        // e.g. "Room", "Table" — null hides the field entirely
  subDefault = '',
  discountDefault = '',
  footerDefault = '',
  contactDefault = null,  // { phone, address, website } — pre-fills & auto-enables Contact Info if given
  downloadFilename = 'qr-code',
}) {
  const [design, setDesign] = useState(() => ({
    template: 'poster',
    theme: 'green',
    shopName: nameDefault,
    tagline: taglineDefault,
    subLabel,
    tableNum: subDefault,
    discountOn: !!discountDefault,
    discountText: discountDefault || '10% OFF for early birds!',
    newItemOn: false,
    newItemText: '',
    wifiOn: false,
    wifiName: '',
    wifiPass: '',
    contactOn: !!(contactDefault?.phone || contactDefault?.address || contactDefault?.website),
    contactPhone: contactDefault?.phone || '',
    contactAddress: contactDefault?.address || '',
    contactWebsite: contactDefault?.website || '',
    footerOn: !!footerDefault,
    footerText: footerDefault || 'Thank you for scanning!',
  }));
  const [qrImg, setQrImg] = useState('');

  // Re-sync defaults whenever a different entity's modal is opened
  useEffect(() => {
    if (!open) return;
    setDesign(d => ({
      ...d,
      shopName: nameDefault,
      tagline: taglineDefault,
      subLabel,
      tableNum: subDefault,
      discountText: discountDefault || d.discountText,
      footerText: footerDefault || d.footerText,
      contactPhone: contactDefault?.phone || d.contactPhone,
      contactAddress: contactDefault?.address || d.contactAddress,
      contactWebsite: contactDefault?.website || d.contactWebsite,
    }));
  }, [open, nameDefault, taglineDefault, subLabel, subDefault, discountDefault, footerDefault, contactDefault]);

  const theme = THEMES[design.theme];

  useEffect(() => {
    if (!open || !targetUrl) return;
    QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: { dark: theme.qrDark, light: '#ffffff' },
    }).then(setQrImg).catch(() => {});
  }, [open, targetUrl, theme.qrDark]);

  if (!open) return null;

  const setD = (k, v) => setDesign(p => ({ ...p, [k]: v }));

  const handleDownload = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${downloadFilename}.png`;
    a.click();
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="qrd-overlay" onClick={onClose}>
        <div className="qrd-designer-modal" onClick={e => e.stopPropagation()}>
          <div className="qrd-designer-modal-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
                Pick a template, theme and banner details, then print or download.
              </p>
            </div>
            <button className="qrd-designer-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="qrd-designer">
            {/* ── Left: controls ── */}
            <div className="qrd-controls-col">
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
                  <Field label={nameLabel} value={design.shopName} onChange={v => setD('shopName', v)} />
                  {subLabel && (
                    <Field label={`${subLabel} (optional)`} value={design.tableNum} onChange={v => setD('tableNum', v)} />
                  )}
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
                        placeholder="e.g. 20% OFF this month!"
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
                        <span className="qrd-extra-label">📍 Contact Info</span>
                        <span className="qrd-extra-hint">Phone, address & website from your profile</span>
                      </div>
                      <Toggle value={design.contactOn} onChange={v => setD('contactOn', v)} />
                    </div>
                    {design.contactOn && (
                      <div className="qrd-fields-stack">
                        <Field label="Phone" value={design.contactPhone} onChange={v => setD('contactPhone', v)} placeholder="e.g. +91 98765 43210" />
                        <Field label="Address" value={design.contactAddress} onChange={v => setD('contactAddress', v)} placeholder="e.g. MG Road, Bengaluru" />
                        <Field label="Website" value={design.contactWebsite} onChange={v => setD('contactWebsite', v)} placeholder="e.g. yourbrand.com" />
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

            {/* ── Right: preview ── */}
            <div className="qrd-preview-col">
              <div className="qrd-preview-bar">
                <div>
                  <div className="qrd-preview-bar-title">Live Preview</div>
                  <div className="qrd-preview-bar-sub">
                    {TEMPLATES.find(t => t.id === design.template)?.label} · {THEMES[design.theme].name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary qrd-print-btn" onClick={handleDownload} disabled={!qrImg}>
                    <Download size={14}/> PNG
                  </button>
                  <button className="btn btn-primary qrd-print-btn" onClick={handlePrint} disabled={!qrImg}>
                    <Printer size={14}/> Print Now
                  </button>
                </div>
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
        </div>
      </div>

      {createPortal(
        <div id="qr-print-zone">
          {qrImg && (
            <div className="qr-print-single">
              <TemplateRenderer d={design} qrImg={qrImg} />
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
