import { useNavigate } from 'react-router-dom';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import { QrCode, ScanLine, Radar, Receipt, Printer, ArrowRight } from 'lucide-react';
import '../landing/Landing.css';
import './Company.css';
import './FeaturesPage.css';

const FEATURES = [
  {
    icon: QrCode,
    tag: 'Order confirmation',
    title: 'A code and QR your customer can show at the counter',
    desc: "After a pay-at-counter order is placed, the customer's confirmation screen shows a short 6-digit code and a scannable QR — proof of their order before it's ever paid for. The same code works twice: once to confirm payment, and again at pickup or delivery handover to close the order.",
    example: 'Table 6 orders butter chicken and chooses "Cash at counter." They see code 608305 with a QR on screen. The kitchen never sees the ticket until staff scans or types that code in at the counter and confirms payment.',
    img: '/demo/order-code-qr.png',
  },
  {
    icon: ScanLine,
    tag: 'POS · Billing',
    title: 'Confirm codes without leaving the billing screen',
    desc: 'Counter staff get a "Confirm code" button right on the POS/Billing screen — scan the QR or type the code, see the order and amount due, and confirm payment or pickup in one tap. No separate app or screen to switch to.',
    example: 'A cashier at Billing clicks "Confirm code", scans the customer\'s QR, and taps "Confirm payment." The order is released to the kitchen queue immediately — cash, card, or QR, it all ends the same way.',
    img: '/demo/pos-confirm-code.png',
  },
  {
    icon: Radar,
    tag: 'Live tracking',
    title: 'Live status, not just at checkout — everywhere',
    desc: 'The Confirmed → Preparing → Ready → Served progress track follows the order into order history too, auto-refreshing every few seconds with a manual refresh option, so a customer can check in any time without reloading the page.',
    example: 'A customer places an order, closes the tab, and reopens their order history 10 minutes later — the tracker already shows "Preparing," kept live without them touching refresh.',
    img: '/demo/live-tracking.png',
  },
  {
    icon: Receipt,
    tag: 'Billing counter',
    title: 'Discounts and service charges, itemized on the bill',
    desc: 'Apply a discount or add a service charge right at the billing counter — the bill recalculates tax on the adjusted amount automatically, with every line shown separately before you finalize.',
    example: 'A regular gets a ₹20 discount, and a 10% service charge is added for dine-in. The POS bill summary itemizes Subtotal, Discount, Service Charge, Tax, and Total — nothing hidden or bundled.',
    img: '/demo/pos-bill-breakup.png',
  },
  {
    icon: Printer,
    tag: 'Receipts',
    title: 'Receipts that carry your logo, not a generic template',
    desc: "Printed and shared receipts pull your restaurant's logo, address, and GSTIN straight from your shop profile — along with the full discount/service-charge/tax break-up — so every receipt looks like it belongs to your business.",
    example: "A dine-in bill is closed and the printed receipt shows the restaurant's own logo at the top, the itemized bill, and GST details — ready to hand over as-is.",
    img: '/demo/receipt.png',
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();
  return (
    <div className="company-page">
      <SEO
        title="Features — Order Confirmation, Live Tracking & Billing"
        description="See AviQR's counter payment confirmation, live order tracking, POS bill break-ups and branded receipts in action, with real screenshots."
        canonical="https://aviqr.com/features"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">What's new</div>
        <h1 className="company-title">Built from real counter workflows</h1>
        <p className="company-sub">
          These are the newest additions to AviQR — order confirmation codes, live tracking,
          and billing-counter tools — shown here with real screenshots from a running shop.
        </p>
      </section>

      <section className="feature-rows">
        {FEATURES.map((f, i) => (
          <div key={f.title} className={`feature-row ${i % 2 === 1 ? 'feature-row-rev' : ''}`}>
            <div className="feature-row-text">
              <div className="feature-row-icon"><f.icon size={20} /></div>
              <div className="feature-row-tag">{f.tag}</div>
              <h2 className="feature-row-title">{f.title}</h2>
              <p className="feature-row-desc">{f.desc}</p>
              <div className="feature-row-example">
                <span className="feature-row-example-label">Example</span>
                <p>{f.example}</p>
              </div>
            </div>
            <div className="feature-row-media">
              <img src={f.img} alt={f.title} loading="lazy" />
            </div>
          </div>
        ))}
      </section>

      <section className="cta-banner">
        <div className="cta-banner-inner">
          <h2 className="cta-title">See these running on your own menu</h2>
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
