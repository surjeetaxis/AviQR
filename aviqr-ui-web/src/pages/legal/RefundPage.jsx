import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import './Legal.css';

export default function RefundPage() {
  return (
    <div className="legal-page">
      <SEO title="Refund & Cancellation Policy — AviQR" description="AviQR's refund and cancellation policy for subscriptions and customer orders." canonical="https://aviqr.in/refund" />
      <SiteHeader />
      <div className="legal-content">
        <h1>Refund & Cancellation Policy</h1>
        <p className="legal-meta">Effective Date: 25 June 2025 · Version 1.0</p>

        <h2>1. Two kinds of payments on AviQR</h2>
        <p>AviQR handles two separate kinds of money movement, and this policy covers both: (a) the <strong>subscription fee</strong> a business owner pays AviQR for use of the platform, and (b) <strong>food/service orders</strong> a customer pays a business owner for through the QR menu. AviQR is the payment facilitator for both, via Razorpay, but is not the seller of food or services in case (b).</p>

        <h2>2. Subscription plan refunds</h2>
        <p>The <strong>Starter</strong> plan is free — there is nothing to refund. Paid plans (Growth, Business) are billed monthly in advance. Subscription fees are <strong>non-refundable</strong> for the current billing cycle once charged, except where required by Indian consumer protection law.</p>
        <p>If you cancel a paid plan, you keep access until the end of the cycle you already paid for; there is no partial-month refund for early cancellation. You can cancel any time from Settings → Subscription, with no cancellation fee.</p>

        <h2>3. Free trial</h2>
        <p>The 14-day trial on the Growth plan requires no card upfront. If you add a card and don't cancel before the trial ends, the first paid cycle begins automatically — you can cancel any time before then at no charge.</p>

        <h2>4. Refunds for customer food/service orders</h2>
        <p>If a customer's order is cancelled before the business accepts it, or the business cancels it (e.g. item out of stock), any online payment is refunded automatically to the original payment method via Razorpay, typically within <strong>5–7 business days</strong>.</p>
        <p>Refund requests for accepted orders (wrong item, quality issue, non-delivery) are the responsibility of the business the customer ordered from — AviQR does not adjudicate food quality or service disputes, per our <a href="/terms">Terms of Service</a>. Customers should first contact the business directly; if unresolved, AviQR support can help mediate at <a href="mailto:support@aviqr.in">support@aviqr.in</a>.</p>

        <h2>5. Failed or duplicate payments</h2>
        <p>If a payment is deducted but the order/subscription doesn't reflect it (e.g. a network error at checkout), the amount is automatically reversed by Razorpay within 5–7 business days. If it isn't, email <a href="mailto:support@aviqr.in">support@aviqr.in</a> with the payment reference ID shown in your Razorpay receipt.</p>

        <h2>6. How to request a refund</h2>
        <p>Email <a href="mailto:support@aviqr.in">support@aviqr.in</a> with your registered phone/email, the order ID or subscription invoice number, and the reason. We acknowledge requests within 48 hours and resolve eligible ones within 7 business days.</p>

        <h2>7. Contact</h2>
        <p>Billing support: <a href="mailto:support@aviqr.in">support@aviqr.in</a> · Grievance Officer: <a href="mailto:grievance@aviqr.in">grievance@aviqr.in</a></p>

        <p className="legal-updated">Last updated: 25 June 2025</p>
      </div>
      <SiteFooter />
    </div>
  );
}
