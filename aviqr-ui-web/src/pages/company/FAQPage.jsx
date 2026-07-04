import { useState } from 'react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import { ChevronDown } from 'lucide-react';
import '../landing/Landing.css';
import './Company.css';

const FAQ_GROUPS = [
  {
    title: 'Getting started',
    items: [
      { q: 'How long does it take to go live?', a: 'Most businesses are live in under 10 minutes: register, add your menu (manually or by photographing your printed menu with OCR), and your permanent QR code is ready to print.' },
      { q: 'Do I need to buy any hardware?', a: 'No. Customers scan with their own phone camera — no app, no dedicated scanner, no tablet required. You only need a device to view your own dashboard, which works on any phone, tablet or computer.' },
      { q: 'Can I upload a photo of my existing printed menu?', a: 'Yes — the OCR menu upload reads a photograph of your printed menu and builds a structured digital menu (items, prices, categories) automatically in under 5 minutes, which you can then edit.' },
      { q: 'What if my QR code gets damaged or I need a new print?', a: 'The QR code itself never changes — it\'s permanent per venue/table. Reprint it any time from QR Codes → Print Designer; scanning it will always open your current live menu.' },
    ],
  },
  {
    title: 'Pricing & billing',
    items: [
      { q: 'Is the Starter plan really free?', a: 'Yes — no credit card required, no trial expiry. It supports up to 20 menu items, 50 orders/day and 1 QR code, which covers most small stalls and single-counter shops indefinitely.' },
      { q: 'How does billing work for paid plans?', a: 'Growth and Business plans are billed monthly in advance in INR through Razorpay, with GST-compliant invoices. You can cancel any time from Settings → Subscription with no cancellation fee.' },
      { q: 'Do you take a commission on every order?', a: 'No. Pricing is a flat monthly subscription — there is no per-order commission on top, unlike marketplace aggregators.' },
      { q: 'What\'s your refund policy?', a: 'Paid subscription fees are non-refundable for the current billing cycle once charged, but you keep access until the cycle ends. Full details are in our Refund & Cancellation Policy.' },
    ],
  },
  {
    title: 'Features',
    items: [
      { q: 'Which languages does the customer menu support?', a: '9 Indian languages, selectable by the customer from the menu itself — no separate setup needed per language.' },
      { q: 'What is dynamic pricing?', a: 'Rules that automatically change prices by time and date — weekend surcharges, festival pricing, happy-hour discounts — without you manually editing prices each time.' },
      { q: 'Can customers see a video or 3D preview of a dish?', a: 'Yes, if you\'ve added one — any menu item can carry a short video or a rotatable 3D model that customers can view before ordering.' },
      { q: 'Does AviQR handle kitchen operations, not just ordering?', a: 'Yes — Kitchen Display (KOT) pushes orders to the kitchen screen instantly, and Inventory & Recipes tracks raw material stock and real ingredient cost per dish.' },
      { q: 'Is there a version for hotels and malls?', a: 'Yes — hotels get room service, housekeeping, laundry and spa requests off one in-room QR; malls and food courts get vendor onboarding and revenue-share tracking under one QR for the whole court.' },
    ],
  },
  {
    title: 'Payments & security',
    items: [
      { q: 'Who processes payments?', a: 'Razorpay — the same gateway used by thousands of Indian businesses. Card details are never stored on AviQR\'s own servers.' },
      { q: 'Is my data encrypted?', a: 'Yes — all data in transit uses TLS 1.2/1.3, passwords are hashed with bcrypt, databases are never publicly reachable, and login sessions use short-lived, rotating JWT tokens.' },
      { q: 'Do you sell customer data to advertisers?', a: 'No. We don\'t sell data, and we don\'t share it with advertising or marketing platforms. Full detail is in our Privacy Policy.' },
    ],
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState('Getting started-0');

  return (
    <div className="company-page">
      <SEO
        title="FAQ — AviQR"
        description="Answers about getting started, pricing, features, payments and security on AviQR."
        canonical="https://aviqr.in/faq"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">FAQ</div>
        <h1 className="company-title">Frequently asked questions</h1>
        <p className="company-sub">Can't find what you need? <a href="/contact" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>Contact us</a> directly.</p>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        <div className="faq-groups">
          {FAQ_GROUPS.map(group => (
            <div key={group.title}>
              <div className="faq-group-title">{group.title}</div>
              {group.items.map((item, i) => {
                const key = `${group.title}-${i}`;
                const isOpen = open === key;
                return (
                  <div key={key} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button className="faq-question" onClick={() => setOpen(isOpen ? null : key)}>
                      {item.q}
                      <ChevronDown size={18} />
                    </button>
                    <div className="faq-answer"><p>{item.a}</p></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
