import { LegalArticle } from '../src/components/legal/LegalArticle.js';

const SECTIONS = [
  { h: '1. Two kinds of payments on AviQR', p: 'AviQR handles two separate kinds of money movement, and this policy covers both: (a) the subscription fee a business owner pays AviQR for use of the platform, and (b) food/service orders a customer pays a business owner for through the QR menu. AviQR is the payment facilitator for both, via Razorpay, but is not the seller of food or services in case (b).' },
  { h: '2. Subscription plan refunds', p: 'The Starter plan is free — there is nothing to refund. Paid plans (Growth, Business) are billed monthly in advance. Subscription fees are non-refundable for the current billing cycle once charged, except where required by Indian consumer protection law.\n\nIf you cancel a paid plan, you keep access until the end of the cycle you already paid for; there is no partial-month refund for early cancellation. You can cancel any time from Settings → Subscription, with no cancellation fee.' },
  { h: '3. Free trial', p: 'The 14-day trial on the Growth plan requires no card upfront. If you add a card and don\'t cancel before the trial ends, the first paid cycle begins automatically — you can cancel any time before then at no charge.' },
  { h: '4. Refunds for customer food/service orders', p: 'If a customer\'s order is cancelled before the business accepts it, or the business cancels it (e.g. item out of stock), any online payment is refunded automatically to the original payment method via Razorpay, typically within 5–7 business days.\n\nRefund requests for accepted orders (wrong item, quality issue, non-delivery) are the responsibility of the business the customer ordered from — AviQR does not adjudicate food quality or service disputes, per our Terms of Service. Customers should first contact the business directly; if unresolved, AviQR support can help mediate at support@aviqr.in.' },
  { h: '5. Failed or duplicate payments', p: 'If a payment is deducted but the order/subscription doesn\'t reflect it (e.g. a network error at checkout), the amount is automatically reversed by Razorpay within 5–7 business days. If it isn\'t, email support@aviqr.in with the payment reference ID shown in your Razorpay receipt.' },
  { h: '6. How to request a refund', p: 'Email support@aviqr.in with your registered phone/email, the order ID or subscription invoice number, and the reason. We acknowledge requests within 48 hours and resolve eligible ones within 7 business days.' },
  { h: '7. Contact', p: 'Billing support: support@aviqr.in · Grievance Officer: grievance@aviqr.in' },
];

export default function RefundScreen() {
  return <LegalArticle title="Refund & Cancellation Policy" meta="Effective Date: 25 June 2025 · Version 1.0" sections={SECTIONS} updated="25 June 2025" />;
}
