import { useNavigate } from 'react-router-dom';
import { Smartphone, IndianRupee, Globe, RefreshCw, ArrowRight, QrCode, PenLine, Printer } from 'lucide-react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import '../company/Company.css';

const BENEFITS = [
  { icon: IndianRupee, title: 'No reprinting costs', desc: 'Change a price or add a dish and it updates instantly — no reprinting stacks of paper menus every time something changes.' },
  { icon: Globe,       title: 'Reaches more customers', desc: 'A digital menu can offer multiple languages from the same QR code, useful anywhere your customers don\'t all read the same language.' },
  { icon: Smartphone,  title: 'No app required', desc: 'Any phone camera opens a QR menu directly in the browser — customers don\'t need to install anything.' },
  { icon: RefreshCw,   title: 'Always current', desc: 'Out-of-stock items, seasonal specials, and time-based pricing can be turned on or off without touching the printed table card.' },
];

const STEPS = [
  { icon: PenLine,  title: 'List your menu', desc: 'Type up your items and prices, or photograph your existing printed menu and let OCR extract it automatically.' },
  { icon: QrCode,   title: 'Generate a QR code', desc: 'Every menu link can be turned into a QR code — our free tool does this for any link in a few seconds.' },
  { icon: Printer,  title: 'Print and place it', desc: 'Put the QR on your table, counter, or storefront window. It doesn\'t need to change again unless you replace the underlying link.' },
];

export default function QrMenuGuidePage() {
  const navigate = useNavigate();
  return (
    <div className="company-page">
      <SEO
        title="QR Code Menus for Restaurants: A Practical Guide"
        description="What a QR code menu actually is, why small restaurants and cafes in India are switching to one, and how to set one up — free or paid."
        canonical="https://aviqr.com/guides/qr-code-menu-guide"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Guide</div>
        <h1 className="company-title">QR Code Menus for Restaurants: A Practical Guide</h1>
        <p className="company-sub">
          A QR code menu replaces (or supplements) your printed menu with a link a customer's phone camera can open directly.
          Here's what actually changes for a small restaurant, cafe, or stall when you switch to one.
        </p>
      </section>

      <section className="company-section">
        <div className="value-grid">
          {BENEFITS.map(b => (
            <div key={b.title} className="value-card">
              <div className="value-icon"><b.icon size={18} /></div>
              <div className="value-title">{b.title}</div>
              <div className="value-desc">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 24, textAlign: 'center' }}>
          Setting one up takes three steps
        </h2>
        <div className="value-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {STEPS.map((s, i) => (
            <div key={s.title} className="value-card">
              <div className="value-icon">{i + 1}</div>
              <div className="value-title">{s.title}</div>
              <div className="value-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <div className="trust-card">
          <div className="trust-icon"><QrCode size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="trust-title">A static QR vs. a live digital menu</div>
            <div className="trust-desc" style={{ marginTop: 4 }}>
              A QR code that just points at a PDF or photo works, but it can't update prices per item, translate itself,
              take orders, or tell you what customers actually looked at. If you outgrow a static link, a platform-backed
              menu (AviQR's free Starter plan included) covers all of that under the same one QR code.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="contact-submit"
                style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/register')}
              >
                Start free with AviQR <ArrowRight size={15} />
              </button>
              <button
                className="contact-submit"
                style={{ width: 'auto', padding: '10px 20px', background: 'var(--white)', color: 'var(--green-dark)', border: '1.5px solid var(--green)' }}
                onClick={() => navigate('/free-qr-menu-generator')}
              >
                Just generate a QR code
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 12 }}>Related guides</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="/guides/qr-ordering-system-restaurants-india" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>QR Code Ordering System for Restaurants in India: The Complete 2026 Guide</a>
          <a href="/guides/qr-menu-software-checklist" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>What to Look for in QR Menu Software: A 2026 Buyer's Checklist</a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
