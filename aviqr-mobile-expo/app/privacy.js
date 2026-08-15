import { LegalArticle } from '../src/components/legal/LegalArticle.js';

const SECTIONS = [
  { h: '1. Introduction', p: 'AviQR ("we", "our") is committed to protecting your privacy. This Policy explains what data we collect, how we use it, and your rights under the Digital Personal Data Protection Act 2023 (DPDP Act) and the IT Rules 2011.' },
  { h: '2. Data We Collect', p: 'Business users: Name, email, phone, business details (GSTIN, address), subscription and billing history, usage logs, device information.\n\nEnd customers (via QR menu): Name and phone number (entered at checkout), order details, payment method. No card data is stored on AviQR servers.' },
  { h: '3. How We Use Your Data', p: 'We use your data to operate the platform, process orders, send order notifications (WhatsApp/SMS via Twilio), generate analytics, respond to support queries, and comply with legal obligations. We do not sell your data.' },
  { h: '4. Data Sharing', p: 'Razorpay — payment processing (order amount, contact details).\nTwilio — SMS/WhatsApp notifications (phone number, order summary).\nGoogle Cloud Vision — OCR menu scanning (image only).\nWe do not share data with advertisers or marketing platforms.' },
  { h: '5. Data Retention', p: 'Account data: duration of account + 3 years. Order/payment records: 7 years (Income Tax Act). Customer contact data: 1 year from order. Audit logs: 90 days.' },
  { h: '6. Security', p: 'All data in transit is encrypted via TLS 1.2/1.3. Passwords are hashed with bcrypt. Databases are not publicly accessible. JWT tokens are short-lived with rotation.' },
  { h: '7. Cookies', p: 'We use session cookies for login state and a preference cookie (aviqr_lang) for language selection. We do not use advertising cookies or cross-site tracking.' },
  { h: '8. Your Rights (DPDP Act 2023)', p: 'You have the right to access, correct, erase, and port your personal data. You may withdraw consent for WhatsApp notifications at any time in Settings. Contact privacy@aviqr.com to exercise your rights.' },
  { h: '9. Children', p: 'AviQR is not directed to persons under 18. We do not knowingly collect data from minors.' },
  { h: '10. Contact', p: 'Privacy queries: privacy@aviqr.com\nGrievance Officer: grievance@aviqr.com (response within 30 days)\nAddress: [Company Registered Address], Bengaluru, Karnataka – 560001' },
];

export default function PrivacyScreen() {
  return <LegalArticle title="Privacy Policy" meta="Effective Date: 25 June 2025 · Version 1.0" sections={SECTIONS} updated="25 June 2025" />;
}
