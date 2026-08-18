import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Download, Link2, Palette, ArrowRight, Sparkles } from 'lucide-react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import '../company/Company.css';
import './Tools.css';

// Free, no-signup QR generator — the honest version of this tool: it just
// encodes whatever link you give it (a PDF, Google Drive doc, Instagram
// page...) into a downloadable QR PNG. No account, no tracking of what you
// scan. The CTA below is for AviQR's actual product — a live, editable,
// multilingual digital menu — which this static QR can't offer on its own.
const COLORS = ['#1D9E75', '#111827', '#DC2626', '#2563EB', '#7C3AED'];

export default function QrMenuGeneratorPage() {
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [qrImg, setQrImg] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    const value = link.trim();
    if (!value) { setQrImg(''); return; }
    QRCode.toDataURL(value, { width: 640, margin: 2, color: { dark: color, light: '#ffffff' } })
      .then(setQrImg)
      .catch(() => setQrImg(''));
  }, [link, color]);

  const download = () => {
    if (!qrImg) return;
    const a = document.createElement('a');
    a.href = qrImg;
    a.download = `${(label || 'menu-qr').trim().replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="company-page">
      <SEO
        title="Free QR Code Generator for Your Menu"
        description="Turn any menu link — a PDF, Google Drive file, or website — into a free, downloadable QR code in seconds. No signup required."
        canonical="https://aviqr.com/free-qr-menu-generator"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Free tool · No signup</div>
        <h1 className="company-title">Free QR Code Generator for Your Menu</h1>
        <p className="company-sub">
          Paste a link to your existing menu — a PDF, Google Drive file, Instagram page, or website —
          and get a downloadable QR code instantly. Print it on your table, counter, or storefront.
        </p>
      </section>

      <section className="company-section" style={{ paddingTop: 0 }}>
        <div className="qr-tool-grid">
          <div className="qr-tool-form">
            <div className="contact-field">
              <label htmlFor="qr-link"><Link2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Menu link</label>
              <input
                id="qr-link"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://drive.google.com/... or your website"
              />
            </div>
            <div className="contact-field">
              <label htmlFor="qr-label">Label (for the downloaded file name)</label>
              <input id="qr-label" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Spice Garden Menu" />
            </div>
            <div className="contact-field">
              <label><Palette size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Color</label>
              <div className="qr-color-row">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`qr-color-swatch${color === c ? ' active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Use color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="qr-tool-preview">
            {qrImg ? (
              <>
                <img src={qrImg} alt="Generated QR code" className="qr-tool-image" />
                <button className="contact-submit" style={{ marginTop: 16 }} onClick={download}>
                  <Download size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Download PNG
                </button>
              </>
            ) : (
              <div className="qr-tool-empty">Paste a link on the left to generate your QR code</div>
            )}
          </div>
        </div>
      </section>

      <section className="company-section" style={{ paddingTop: 0 }}>
        <div className="trust-card">
          <div className="trust-icon"><Sparkles size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="trust-title">Want more than a static link?</div>
            <div className="trust-desc">
              A static QR just points at a file — it can't show live prices, translate into 9 Indian languages,
              take orders, or tell you how many people actually scanned it. AviQR gives you a real digital menu
              that does all of that, free to start.
            </div>
            <button
              className="contact-submit"
              style={{ marginTop: 14, width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate('/register')}
            >
              Get your free digital menu <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
