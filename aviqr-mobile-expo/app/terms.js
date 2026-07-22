import { LegalArticle } from '../src/components/legal/LegalArticle.js';

const SECTIONS = [
  { h: '1. Acceptance', p: 'By accessing or using AviQR ("Service"), you agree to these Terms. If you do not agree, do not use the Service.' },
  { h: '2. Service Description', p: 'AviQR provides a SaaS platform enabling restaurants, hotels, malls, and food courts to manage digital menus, receive orders via QR code, and process payments through Razorpay.' },
  { h: '3. Eligibility', p: 'You must be at least 18 years of age. By registering, you confirm all information you provide is accurate. The Service is intended for lawful business use in India.' },
  { h: '4. Account Security', p: 'You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately at support@aviqr.in of any unauthorized use.' },
  { h: '5. Subscription & Payment', p: 'Subscription fees are billed in advance in INR, exclusive of GST. Payments are processed via Razorpay. Fees are non-refundable except as required by law. Failure to pay may result in suspension.' },
  { h: '6. Acceptable Use', p: 'You may not use the Service for unlawful purposes, to list prohibited items, to misrepresent your business, or to attempt unauthorized access to any system.' },
  { h: '7. Customer Transactions', p: 'AviQR facilitates orders between you and your customers. You are solely responsible for food quality, safety, and FSSAI compliance. Refund disputes are between you, your customer, and Razorpay.' },
  { h: '8. Intellectual Property', p: 'AviQR and all associated content are the property of AviQR Technologies. You retain rights to your content but grant AviQR a licence to host and display it for the purpose of operating the Service.' },
  { h: '9. Disclaimer & Liability', p: 'The Service is provided "as is." AviQR is not liable for indirect, incidental, or consequential damages. Total liability is capped at fees paid in the preceding 12 months.' },
  { h: '10. Governing Law', p: 'These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.' },
  { h: '11. Grievance Officer', p: 'Grievance Officer Email: grievance@aviqr.in. Response time: within 30 days of receipt.' },
  { h: '12. Contact', p: 'Email: legal@aviqr.in · Website: aviqr.in' },
];

export default function TermsScreen() {
  return <LegalArticle title="Terms of Service" meta="Effective Date: 25 June 2025 · Version 1.0" sections={SECTIONS} updated="25 June 2025" />;
}
