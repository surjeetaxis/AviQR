import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, IndianRupee, ChefHat, CreditCard, Camera, QrCode, Printer, Wifi, ArrowRight } from 'lucide-react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import '../company/Company.css';

const CHECKLIST = [
  { title: 'Menu changes take effect everywhere, instantly', desc: 'If you 86 an item or change a price, it should update on the QR menu immediately — not require reprinting anything.' },
  { title: 'Kitchen display, not just a pretty menu', desc: 'Order-taking without a way to route that order to the kitchen just moves the bottleneck instead of removing it.' },
  { title: 'Real payment integration', desc: 'UPI is non-negotiable in the Indian market — a "call staff to pay" workaround isn\'t a real payment integration.' },
  { title: 'No commission stacked on top of a subscription', desc: 'Some systems charge both a monthly fee and a cut of every order — run the math against your average order volume first.' },
  { title: 'Setup time under an hour', desc: 'If onboarding requires a sales call and an "implementation team," that\'s a signal about ongoing friction, not just setup friction.' },
];

const STEPS = [
  { icon: Camera,   title: 'Register and create your menu', desc: 'Photograph your existing printed menu and use OCR to build the digital version automatically — typically under 5 minutes for a normal-sized menu.' },
  { icon: QrCode,   title: 'Get your QR code', desc: 'One code per table, or one for the whole shop — generated instantly, nothing to order or wait for.' },
  { icon: Printer,  title: 'Print and place it', desc: 'Table tents, stickers, or a counter card — the code encodes a link, not the menu itself, so it never needs reprinting when your menu changes.' },
  { icon: CreditCard, title: 'Connect payments', desc: 'UPI, card, and wallet payments via a gateway like Razorpay; cash stays available as an option if you want it.' },
  { icon: Wifi,     title: 'Go live', desc: 'Orders start landing on your dashboard/kitchen display as customers scan.' },
];

const FAQ = [
  { q: 'Do customers need to download an app?', a: 'No — a QR code opens a normal web page in whatever browser is already on their phone. Requiring an app download is one of the biggest reasons QR ordering flows fail to get adopted by customers.' },
  { q: 'What if my QR code gets damaged?', a: "On a well-built system, the code itself never changes — it's a permanent link per table/venue. You can reprint it any time and it'll open the same live menu; nothing needs to be regenerated." },
  { q: 'Can I upload a photo of my existing printed menu instead of typing it in?', a: 'Yes, on platforms with OCR menu upload (AviQR included) — you photograph your current printed menu and it builds a structured digital menu automatically, which you then review and edit.' },
  { q: 'Is there a free option?', a: 'Some platforms, including AviQR, offer a genuinely free tier (not just a trial) for small operations — worth checking the item/order limits before assuming "free" covers your actual volume.' },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(item => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "QR Code Ordering System for Restaurants in India: The Complete 2026 Guide",
  description: "How QR code ordering actually works for restaurants in India — setup, costs, what customers see, and how to pick a system.",
  datePublished: "2026-08-19",
  dateModified: "2026-08-19",
  author: { "@type": "Organization", name: "AviQR" },
  publisher: { "@type": "Organization", name: "AviQR", logo: { "@type": "ImageObject", url: "https://aviqr.com/favicon.svg" } },
  mainEntityOfPage: "https://aviqr.com/guides/qr-ordering-system-restaurants-india",
};

export default function QrOrderingGuidePage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="company-page">
      <SEO
        title="QR Code Ordering System for Restaurants in India: The Complete 2026 Guide"
        description="How QR code ordering actually works for restaurants in India — setup, costs, what customers see, and how to pick a system. A practical 2026 guide."
        canonical="https://aviqr.com/guides/qr-ordering-system-restaurants-india"
        schema={[ARTICLE_SCHEMA, FAQ_SCHEMA]}
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Guide</div>
        <h1 className="company-title">QR Code Ordering System for Restaurants in India: The Complete 2026 Guide</h1>
        <p className="company-sub">
          What actually happens after a customer scans your QR code varies a lot between systems — that difference is what
          determines whether it saves your staff time or becomes one more thing that breaks during a Saturday rush.
        </p>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>How QR code ordering works</h2>
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, marginBottom: 12 }}>
          <strong>For the customer:</strong> they scan the code with their phone's own camera — no app to download. It opens
          the menu directly in their browser. They browse, add items to a cart, and either pay online then and there or
          confirm the order for staff to collect payment at the table or counter.
        </p>
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>
          <strong>For you, the owner:</strong> the order lands on a dashboard or a kitchen display in real time. No one is
          walking an order slip from the table to the kitchen. If the system integrates with billing, the same order becomes
          a GST-ready invoice without anyone re-typing it. The parts that actually matter operationally are what happens
          <em> between</em> those two moments — menu updates, kitchen routing, and billing — not the QR code itself.
        </p>
      </section>

      <section className="company-section">
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 24, textAlign: 'center' }}>
          What to actually look for
        </h2>
        <div className="value-grid">
          {CHECKLIST.map(c => (
            <div key={c.title} className="value-card">
              <div className="value-icon"><IndianRupee size={18} /></div>
              <div className="value-title">{c.title}</div>
              <div className="value-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 24, textAlign: 'center' }}>
          Setting one up: what the process actually looks like
        </h2>
        <div className="value-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {STEPS.map((s, i) => (
            <div key={s.title} className="value-card">
              <div className="value-icon"><s.icon size={18} /></div>
              <div className="value-title">{i + 1}. {s.title}</div>
              <div className="value-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>Pricing in the Indian market</h2>
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>
          Pricing models vary between flat monthly subscriptions and commission-per-order, and some vendors mix both. Run
          the math on your actual order volume before assuming a "free" or commission-only plan is cheaper than a flat
          subscription — commission adds up fast once you're doing meaningful volume. AviQR's Starter plan is free with no
          credit card required (up to 20 menu items, 50 orders/day, 1 QR code), with paid tiers at ₹999/month and
          ₹2,499/month as volume grows — flat subscription only, no per-order commission on any plan.
        </p>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        <div className="faq-groups">
          <div className="faq-group-title">Frequently asked questions</div>
          {FAQ.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={item.q} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenFaq(isOpen ? null : i)}>
                  {item.q}
                  <ChevronDown size={18} />
                </button>
                <div className="faq-answer"><p>{item.a}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="company-section">
        <div className="trust-card">
          <div className="trust-icon"><ChefHat size={20} /></div>
          <div style={{ flex: 1 }}>
            <div className="trust-title">Beyond ordering: what a full system adds</div>
            <div className="trust-desc" style={{ marginTop: 4 }}>
              Multilingual menus (9 Indian languages on AviQR, selectable by the customer with no per-language setup),
              dynamic pricing for weekends/festivals/happy-hour, inventory and real recipe-cost tracking, and loyalty
              built on the phone number a QR-ordering customer already gives you.
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

      <section className="company-section" style={{ maxWidth: 760 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 12 }}>Related guides</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="/guides/qr-menu-software-checklist" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>What to Look for in QR Menu Software: A 2026 Buyer's Checklist</a>
          <a href="/guides/qr-code-menu-guide" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>QR Code Menus for Restaurants: A Practical Guide</a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
