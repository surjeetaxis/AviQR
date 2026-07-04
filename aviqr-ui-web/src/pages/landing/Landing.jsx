import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/shared/SEO.jsx';
import { planApi, offerApi } from '../../api/index.js';
import {
  QrCode, Zap, BarChart2, Users, ShoppingBag, Star,
  ChevronRight, Globe, Shield, Clock, Smartphone,
  ArrowRight, CheckCircle, Building2, Hotel, Store,
  Coffee, UtensilsCrossed, ShoppingCart, Wifi, ScanLine,
  UploadCloud, PackageCheck
} from 'lucide-react';
import './Landing.css';

const STATS = [
  { value: 'Free',    label: 'Starter plan — no credit card' },
  { value: '9',      label: 'Indian languages supported' },
  { value: '< 10m',  label: 'Setup time from QR to first order' },
  { value: '99.9%',  label: 'Uptime SLA' },
];

const FEATURES = [
  { icon: QrCode,        title: 'Permanent QR Code',      desc: 'One QR. Print once. Update menu forever — no reprinting needed when prices change.' },
  { icon: Zap,           title: 'Dynamic Pricing',         desc: 'Weekend, festival, happy hour pricing that switches automatically by time and date.' },
  { icon: Globe,         title: 'OCR Menu Upload',         desc: 'Photograph your printed menu. AI reads it, builds your digital menu in under 5 minutes.' },
  { icon: Star,          title: 'Loyalty & Wallet',        desc: 'Silver → Diamond tiers. Cashback wallet. Reward regulars, retain customers.' },
  { icon: BarChart2,     title: 'Analytics & CRM',         desc: 'Revenue trends, peak hours, top items, customer spend analysis in real time.' },
  { icon: Smartphone,    title: 'No App for Customers',    desc: 'Customers scan with phone camera. Menu opens instantly in browser. No download required.' },
];

const HOW_IT_WORKS = [
  { icon: UploadCloud, title: 'Add your menu',           desc: 'Manually or upload a photo — our OCR reads your printed menu in minutes.' },
  { icon: QrCode,      title: 'Get your QR',              desc: 'One permanent QR code for your shop. Print it on tables, boards, or receipts.' },
  { icon: ScanLine,    title: 'Customers scan & order',   desc: 'Menu opens in their browser. They order and pay in 30 seconds.' },
  { icon: PackageCheck,title: 'You receive & manage',     desc: 'Orders appear instantly on your dashboard. Track, prepare, complete.' },
];

// Real product screenshots, captured live from the running app (not mockups) —
// see aviqr-ui-web/public/demo/.
const SHOWCASE = [
  { src: '/demo/owner-dashboard.png', alt: 'AviQR owner dashboard showing live orders, revenue and top-selling items', title: 'Owner dashboard', desc: 'Live orders, revenue and top items — updated in real time.', wide: true },
  { src: '/demo/customer-menu.png',   alt: 'Customer-facing QR menu with real dish photos and a 3D preview badge', title: 'Customer menu', desc: 'Real dish photos, videos and 3D previews your customers actually see.' },
  { src: '/demo/qr-designer.png',     alt: 'Print-ready QR code poster designer with live preview', title: 'QR poster designer', desc: 'Table tents, wall posters, counter cards — designed and printed in one click.' },
];

const VERTICALS = [
  { icon: UtensilsCrossed, label: 'Restaurants',    color: 'green' },
  { icon: Coffee,           label: 'Cafés & Bakeries', color: 'amber' },
  { icon: Building2,        label: 'Food Courts',   color: 'blue' },
  { icon: Hotel,            label: 'Hotels & Resorts', color: 'purple' },
  { icon: Store,            label: 'Malls',         color: 'red' },
  { icon: ShoppingCart,     label: 'Cloud Kitchens', color: 'green' },
];

// Static fallback — used until the live plan list loads (or if the API is unreachable)
// so the pricing section never looks broken. Admin edits in Subscription Management
// (Manage Plans / Discount Offers) override this via planApi/offerApi below.
const FALLBACK_PLANS = [
  {
    planKey: 'STARTER', name: 'Starter', price: 0, tag: null,
    desc: 'Perfect for food stalls and small shops.',
    features: ['Up to 20 menu items', '50 orders/day', '1 QR code', 'Basic analytics'],
    cta: 'Start free', primary: false,
  },
  {
    planKey: 'GROWTH', name: 'Growth', price: 999, tag: 'Most popular',
    desc: 'For growing restaurants that need more.',
    features: ['Unlimited items & orders', 'Dynamic pricing', 'OCR menu upload', 'Staff roles (10)', 'Loyalty & wallet', 'WhatsApp campaigns'],
    cta: 'Start 14-day trial', primary: true,
  },
  {
    planKey: 'BUSINESS', name: 'Business', price: 2499, tag: null,
    desc: 'Multi-outlet brands and cloud kitchens.',
    features: ['Everything in Growth', 'Multi-outlet dashboard', 'CRM & retention', 'AI recommendations', 'API access', 'Priority support'],
    cta: 'Contact sales', primary: false,
  },
];

// Editorial copy that isn't part of the Plan record admin edits — keyed by planKey
const PLAN_META = {
  STARTER:    { desc: 'Perfect for food stalls and small shops.',           cta: 'Start free',         tag: null,           primary: false },
  GROWTH:     { desc: 'For growing restaurants that need more.',           cta: 'Start 14-day trial', tag: 'Most popular', primary: true  },
  BUSINESS:   { desc: 'Multi-outlet brands and cloud kitchens.',           cta: 'Contact sales',      tag: null,           primary: false },
  ENTERPRISE: { desc: 'Custom contracts for large chains & franchises.',   cta: 'Contact sales',      tag: null,           primary: false },
};

const TESTIMONIALS = [
  { name: 'Ankit Joshi', shop: 'Chai & Chaat, Pune', avatar: 'AJ', text: 'Our weekend orders jumped 40% after switching to dynamic pricing. Customers love the instant menu — no waiting for a waiter.' },
  { name: 'Meena Pillai', shop: 'The Coconut Grove, Kochi', avatar: 'MP', text: 'Uploaded a photo of our old printed menu and got a fully digital version in 8 minutes. Absolutely magic.' },
  { name: 'Suresh Nadar', shop: 'Grand Palace Hotel, Chennai', avatar: 'SN', text: 'The hotel module handles room service, laundry and spa requests from one QR in each room. Staff productivity up 60%.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [plans, setPlans]   = useState(FALLBACK_PLANS);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [planRes, offerRes] = await Promise.all([
          planApi.listPublic('SHOP'),
          offerApi.listActive(),
        ]);
        // Enterprise is a "talk to sales" tier with a custom quote, not a self-serve
        // ₹ price — showing it in this grid renders price=0 as "Free", which reads as
        // a data bug next to the real Starter/Growth/Business tiers. Keep it out of the
        // public pricing grid; it still exists for admin plan management elsewhere.
        const live = (planRes.data?.data || []).filter(p => p.planKey !== 'ENTERPRISE');
        if (live.length > 0) {
          setPlans([...live].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => {
            const meta = PLAN_META[p.planKey] || {};
            return {
              planKey: p.planKey,
              name: p.label,
              price: p.price,
              features: (p.features || '').split('\n').map(f => f.trim()).filter(Boolean),
              desc: meta.desc || `${p.label} plan`,
              cta: meta.cta || (p.price === 0 ? 'Start free' : 'Contact sales'),
              tag: meta.tag || null,
              primary: meta.primary || false,
            };
          }));
        }
        setOffers(offerRes.data?.data || []);
      } catch { /* keep the static fallback — pricing must never look broken */ }
    })();
  }, []);

  return (
    <div className="landing">
      <SEO
        title="AviQR — QR Menu & Restaurant OS for India"
        description="Scan to order. Pay online. 9 Indian languages. Manage restaurants, hotels and malls with AviQR's QR-powered platform."
        canonical="https://aviqr.in/"
      />
      {/* ── Nav ── */}
      <nav className="land-nav">
        <div className="land-nav-inner">
          <div className="land-logo">
            <LogoMark />
            <span className="land-wordmark">Avi<em>QR</em></span>
          </div>
          <div className="land-nav-links">
            <a href="#features">Features</a>
            <a href="#showcase">See it in action</a>
            <a href="#verticals">Who it's for</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="land-nav-cta">
            <button className="btn-ghost-nav" onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn-primary-nav" onClick={() => navigate('/register')}>Get started free →</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            <span>India's multilingual QR menu & order platform</span>
          </div>
          <h1 className="hero-headline">
            One QR code.<br />
            Your entire<br />
            <span className="hero-accent">restaurant OS.</span>
          </h1>
          <p className="hero-sub">
            Menu. Orders. Payments. Loyalty. CRM. Staff. Reports.
            All running through a single permanent QR code your customers scan with any phone camera.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate('/register')}>
              Start free — no credit card
              <ArrowRight size={16} />
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('/menu/demo')}>
              <QrCode size={15} />
              See live demo menu
            </button>
          </div>
          <div className="hero-proof">
            {['No app download for customers', 'Live in under 10 minutes', 'Cancel anytime'].map(t => (
              <span key={t} className="hero-proof-item">
                <CheckCircle size={13} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero visual — animated QR dashboard mockup */}
        <div className="hero-visual">
          <HeroDashboard />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-band">
        {STATS.map(s => (
          <div key={s.label} className="stat-item">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-header">
          <div className="section-eyebrow">Platform</div>
          <h2 className="section-title">Everything a restaurant needs</h2>
          <p className="section-sub">AviQR isn't a menu app. It's the operating system for your kitchen, counter, and customers.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">
                <f.icon size={20} />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Verticals ── */}
      <section className="verticals-section" id="verticals">
        <div className="section-header">
          <div className="section-eyebrow">Who it's for</div>
          <h2 className="section-title">Built for every food business</h2>
        </div>
        <div className="verticals-grid">
          {VERTICALS.map(v => (
            <div key={v.label} className={`vertical-chip vertical-${v.color}`}>
              <v.icon size={18} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="how-it-works">
          <div className="hiw-track" aria-hidden="true" />
          {HOW_IT_WORKS.map((s, i) => (
            <div className="hiw-step" key={s.title}>
              <div className="hiw-card">
                <div className="hiw-icon"><s.icon size={22} /></div>
                <div className="hiw-num">{i + 1}</div>
                <div className="hiw-text">
                  <strong>{s.title}</strong>
                  {s.desc}
                </div>
              </div>
              {i < HOW_IT_WORKS.length - 1 && <div className="hiw-arrow"><ChevronRight size={20} /></div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Product Showcase — real screenshots, not mockups ── */}
      <section className="showcase-section" id="showcase">
        <div className="section-header">
          <div className="section-eyebrow">See it in action</div>
          <h2 className="section-title">Real screens. Real product.</h2>
          <p className="section-sub">No mockups here — these are live screenshots of exactly what you and your customers see.</p>
        </div>
        <div className="showcase-grid">
          {SHOWCASE.map(s => (
            <figure key={s.src} className={`showcase-card ${s.wide ? 'showcase-wide' : ''}`}>
              <img src={s.src} alt={s.alt} loading="lazy" />
              <figcaption>
                <div className="showcase-title">{s.title}</div>
                <div className="showcase-desc">{s.desc}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-sub">Start free. Scale as you grow. No hidden charges.</p>
        </div>
        <div className="pricing-grid">
          {plans.map(plan => {
            const offer = offers.find(o => o.applicablePlans === 'ALL'
              || (o.applicablePlans || '').split(',').map(s => s.trim()).includes(plan.planKey));
            const discounted = offer ? Math.round(plan.price * (1 - offer.discountPercent / 100)) : null;
            return (
              <div key={plan.planKey || plan.name} className={`pricing-card ${plan.primary ? 'pricing-primary' : ''}`}>
                {offer
                  ? <div className="pricing-tag" style={{ background: '#DC2626' }}>{offer.discountPercent}% OFF</div>
                  : (plan.tag && <div className="pricing-tag">{plan.tag}</div>)}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  {plan.price === 0 ? 'Free' : (
                    offer ? (
                      <>
                        <span style={{ textDecoration: 'line-through', opacity: .5, fontSize: '0.55em', marginRight: 6 }}>
                          ₹{plan.price.toLocaleString('en-IN')}
                        </span>
                        ₹{discounted.toLocaleString('en-IN')}
                      </>
                    ) : `₹${plan.price.toLocaleString('en-IN')}`
                  )}
                  {plan.price > 0 && <span className="pricing-period">/month</span>}
                </div>
                {offer && <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, margin: '-8px 0 8px' }}>🎉 {offer.title}</div>}
                <div className="pricing-desc">{plan.desc}</div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}>
                      <CheckCircle size={13} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={plan.primary ? 'btn-pricing-primary' : 'btn-pricing-secondary'}
                  onClick={() => navigate('/register')}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials-section">
        <div className="section-header">
          <div className="section-eyebrow">Stories</div>
          <h2 className="section-title">What our customers say</h2>
        </div>
        <div className="testimonials-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">{'★'.repeat(5)}</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-shop">{t.shop}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <div className="cta-banner-inner">
          <QrCode size={40} className="cta-qr-icon" />
          <h2 className="cta-title">Ready to go digital?</h2>
          <p className="cta-sub">Set up your digital menu in under 10 minutes. No hardware. No app download. Just scan & order.</p>
          <div className="cta-actions">
            <button className="btn-cta-primary" onClick={() => navigate('/register')}>
              Create your free account →
            </button>
            <button className="btn-cta-ghost" onClick={() => navigate('/login')}>
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="land-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="land-logo" style={{ marginBottom: 10 }}>
              <LogoMark />
              <span className="land-wordmark">Avi<em>QR</em></span>
            </div>
            <p className="footer-tagline">Scan. Order. Engage. Grow.</p>
            <p className="footer-copy">© 2025 AviQR Technologies Pvt Ltd</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#verticals">Verticals</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Accounts</div>
              <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
              <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>Register</a>
              <a href="#" onClick={e => { e.preventDefault(); navigate('/login?role=admin'); }}>Admin login</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <a href="/privacy">Privacy policy</a>
              <a href="/terms">Terms of service</a>
              <a href="/refund">Refund policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="land-logo-mark">
      <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
        <rect x="3" y="3" width="9" height="9" rx="2" fill="#1D9E75"/>
        <rect x="16" y="3" width="9" height="9" rx="2" fill="#0A0A0A" opacity=".9"/>
        <rect x="3" y="16" width="9" height="9" rx="2" fill="#0A0A0A" opacity=".9"/>
        <rect x="5.5" y="5.5" width="4" height="4" rx="1" fill="#fff"/>
        <rect x="18.5" y="5.5" width="4" height="4" rx="1" fill="#fff"/>
        <rect x="5.5" y="18.5" width="4" height="4" rx="1" fill="#fff"/>
        <rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
        <rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
        <rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75"/>
        <rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5"/>
      </svg>
    </div>
  );
}

function HeroDashboard() {
  return (
    <div className="hero-dash">
      <div className="hero-dash-card">
        <div className="hero-dash-header">
          <span className="hero-dash-title">Live orders</span>
          <span className="hero-live-dot" />
        </div>
        <div className="hero-order-row hero-order-new">
          <span className="hero-order-id">#2847</span>
          <span className="hero-order-table">Table 7 · 4 items</span>
          <span className="hero-order-badge new">New</span>
        </div>
        <div className="hero-order-row">
          <span className="hero-order-id">#2846</span>
          <span className="hero-order-table">Table 12 · 2 items</span>
          <span className="hero-order-badge prep">Preparing</span>
        </div>
        <div className="hero-order-row">
          <span className="hero-order-id">#2845</span>
          <span className="hero-order-table">Pickup · 3 items</span>
          <span className="hero-order-badge ready">Ready</span>
        </div>
        <div className="hero-stats-row">
          <div className="hero-mini-stat">
            <div className="hero-mini-val">₹24k</div>
            <div className="hero-mini-label">Today</div>
          </div>
          <div className="hero-mini-stat">
            <div className="hero-mini-val">73</div>
            <div className="hero-mini-label">Orders</div>
          </div>
          <div className="hero-mini-stat">
            <div className="hero-mini-val">284</div>
            <div className="hero-mini-label">Scans</div>
          </div>
        </div>
      </div>
      <div className="hero-qr-float">
        <QrCode size={32} style={{ color: '#1D9E75' }} />
        <span>Scan to order</span>
      </div>
    </div>
  );
}
