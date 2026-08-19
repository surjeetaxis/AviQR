import { useNavigate } from 'react-router-dom';
import { IndianRupee, Clock, ChefHat, Globe, CreditCard, TrendingUp, ArrowRight } from 'lucide-react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import '../company/Company.css';

const CRITERIA = [
  {
    icon: IndianRupee,
    title: '1. How the pricing actually works',
    body: "There are two common models: a flat monthly subscription, or a percentage commission on every order (sometimes both at once). Run your own numbers — a commission-based platform that looks free upfront can end up costing far more than a flat subscription once you're doing real volume. At ₹999/month for AviQR's Growth plan, that's a fixed cost regardless of whether you do 50 orders or 500 that month. Also check whether there's a genuinely free tier with real capacity, not just a time-limited trial — AviQR's Starter plan supports up to 20 menu items and 50 orders/day at zero cost.",
  },
  {
    icon: Clock,
    title: '2. How long setup actually takes',
    body: 'Ask specifically: can you go from signup to a live, working QR code the same day, without a sales call? Platforms that require onboarding calls or an "implementation team" are telling you something about ongoing friction, not just setup friction. The single biggest time-saver is OCR menu upload — photographing your existing printed menu instead of manually typing every item, price, and category.',
  },
  {
    icon: ChefHat,
    title: '3. Whether it\'s just a menu, or an actual kitchen system',
    body: "A QR menu that only takes orders and dumps them somewhere doesn't remove your kitchen's bottleneck — it just relocates it. Check specifically for Kitchen Display (does the order route directly to a screen, or does someone still relay it verbally?), POS/billing integration (does an order become a real GST-compliant invoice automatically?), and inventory tracking (real ingredient cost per dish, low-stock warnings).",
  },
  {
    icon: Globe,
    title: '4. Language support, if your customers need it',
    body: 'If a meaningful share of your customers read a menu more comfortably in Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, or another regional language, check whether translation is automatic and customer-selectable on the menu itself — or whether you\'d need to build and maintain separate menus per language yourself. AviQR handles 9 Indian languages selectable directly on the customer-facing menu, no per-language setup required on your end.',
  },
  {
    icon: CreditCard,
    title: '5. Payment options',
    body: "UPI is table stakes in India — if a platform doesn't support it natively, that's disqualifying on its own. Beyond that, check whether card and cash are both still available as fallback options, since not every customer wants to pay online, and forcing it can lose the sale entirely.",
  },
  {
    icon: TrendingUp,
    title: '6. What happens as you grow',
    body: "If you open a second location, does it need a separate account, or does one login manage both? Does it handle more than one venue type, if relevant (a hotel needing room service, a food court needing multi-vendor billing)? And since a QR-ordering customer is already identified by phone number, does the platform let you build repeat-visit loyalty on top of that data, or is it a bolt-on you'd need a separate tool for?",
  },
];

export default function QrMenuChecklistPage() {
  const navigate = useNavigate();
  return (
    <div className="company-page">
      <SEO
        title="What to Look for in QR Menu Software: A 2026 Buyer's Checklist"
        description="A practical checklist for choosing QR menu software for your restaurant — commission model, setup time, kitchen integration, and what's easy to overlook."
        canonical="https://aviqr.com/guides/qr-menu-software-checklist"
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "What to Look for in QR Menu Software: A 2026 Buyer's Checklist",
          description: "A practical checklist for choosing QR menu software for your restaurant.",
          datePublished: "2026-08-19",
          dateModified: "2026-08-19",
          author: { "@type": "Organization", name: "AviQR" },
          publisher: { "@type": "Organization", name: "AviQR", logo: { "@type": "ImageObject", url: "https://aviqr.com/favicon.svg" } },
          mainEntityOfPage: "https://aviqr.com/guides/qr-menu-software-checklist",
        }}
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Guide</div>
        <h1 className="company-title">What to Look for in QR Menu Software: A 2026 Buyer's Checklist</h1>
        <p className="company-sub">
          Every QR menu platform's homepage looks roughly the same — a phone mockup, a QR code, a "scan to order" line.
          The actual differences only show up once you're comparing pricing pages and feature lists side by side.
        </p>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        {CRITERIA.map(c => (
          <div key={c.title} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="value-icon" style={{ margin: 0 }}><c.icon size={18} /></div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--gray-900)' }}>{c.title}</h2>
            </div>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>{c.body}</p>
          </div>
        ))}
      </section>

      <section className="company-section">
        <div className="trust-card">
          <div className="trust-icon"><IndianRupee size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="trust-title">The short version</div>
            <div className="trust-desc" style={{ marginTop: 4 }}>
              If you only check three things: the real cost at your actual order volume (not the headline price), whether
              it's an actual kitchen/billing system or just a pretty menu, and how long it genuinely takes to get live.
              Everything else is easier to fix later than a bad decision on those three.
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
                onClick={() => navigate('/features')}
              >
                See the full feature list
              </button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
