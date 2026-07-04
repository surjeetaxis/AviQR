import { useNavigate } from 'react-router-dom';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import {
  Globe2, IndianRupee, ShieldCheck, Users2, UtensilsCrossed, Coffee,
  Building2, Hotel, Store, ShoppingCart, ArrowRight,
} from 'lucide-react';
import '../landing/Landing.css';
import './Company.css';

const VALUES = [
  { icon: Globe2,      title: 'Built for India',      desc: '9 Indian languages, GST-ready billing and Razorpay payments — designed around how Indian food businesses actually run, not a US template.' },
  { icon: IndianRupee, title: 'Fair, transparent pricing', desc: 'A genuinely free Starter plan, flat monthly pricing with no hidden per-order commission, and no lock-in contracts.' },
  { icon: ShieldCheck, title: 'Privacy by default',    desc: 'We don\'t sell data. Card details never touch our servers. Every claim we make about security is written into our own Privacy Policy.' },
  { icon: Users2,      title: 'One platform, every scale', desc: 'The same product that runs a single tea stall also runs a multi-outlet hotel chain — no "enterprise-only" features held back.' },
];

const SERVES = [
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: Coffee,          label: 'Cafés & Bakeries' },
  { icon: Building2,       label: 'Food Courts' },
  { icon: Hotel,           label: 'Hotels & Resorts' },
  { icon: Store,           label: 'Malls' },
  { icon: ShoppingCart,    label: 'Cloud Kitchens' },
];

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="company-page">
      <SEO
        title="About AviQR — QR Menu & Restaurant OS for India"
        description="Why we built AviQR: one QR-powered platform for menus, orders, payments and operations across restaurants, hotels, malls and multi-outlet brands in India."
        canonical="https://aviqr.in/about"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">About AviQR</div>
        <h1 className="company-title">The restaurant OS we wished existed</h1>
        <p className="company-sub">
          AviQR started from a simple observation: most Indian food businesses were choosing between
          expensive, foreign-built POS systems and a printed menu taped to the table. We built the
          middle path — one QR code that runs the whole operation.
        </p>
      </section>

      <section className="company-section about-story">
        <p>
          A QR code on a table should do more than open a PDF. It should let a customer order in their
          own language, let the kitchen see the ticket the second it's placed, let the owner watch
          today's revenue update live, and let all of that keep working whether the business is a single
          tea stall in Indiranagar or a hotel chain with a dozen outlets.
        </p>
        <p>
          That's the platform we built: one permanent QR code per venue that never needs reprinting,
          an OCR pipeline that turns a photo of an existing printed menu into a digital one in minutes,
          and the operational tooling — kitchen display, inventory, staff roles, loyalty, analytics —
          that a business actually needs to run day to day, not just take orders.
        </p>
        <p>
          We also built dedicated modules for the businesses that don't fit the single-restaurant mould:
          hotels running room service, housekeeping and spa requests off one in-room QR; malls and food
          courts onboarding many vendors under one roof; and multi-outlet brands managing every
          location's menu and orders from a single login.
        </p>
      </section>

      <section className="company-section">
        <h2 className="section-title" style={{ fontSize: 26, marginBottom: 8 }}>What we believe</h2>
        <div className="value-grid">
          {VALUES.map(v => (
            <div key={v.title} className="value-card">
              <div className="value-icon"><v.icon size={20} /></div>
              <div className="value-title">{v.title}</div>
              <div className="value-desc">{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <h2 className="section-title" style={{ fontSize: 26, marginBottom: 24 }}>Who we build for</h2>
        <div className="verticals-grid" style={{ marginBottom: 0 }}>
          {SERVES.map(v => (
            <div key={v.label} className="vertical-chip vertical-green">
              <v.icon size={18} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-banner-inner">
          <h2 className="cta-title">Want to see it running your menu?</h2>
          <p className="cta-sub">Start free — no credit card, live in under 10 minutes.</p>
          <div className="cta-actions">
            <button className="btn-cta-primary" onClick={() => navigate('/register')}>
              Create your free account <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
