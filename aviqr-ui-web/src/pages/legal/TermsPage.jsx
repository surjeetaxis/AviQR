import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import './Legal.css';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <SEO title="Terms of Service — AviQR" description="The terms governing use of the AviQR platform." canonical="https://aviqr.in/terms" />
      <SiteHeader />
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-meta">Effective Date: 25 June 2025 · Version 1.0</p>

        <h2>1. Acceptance</h2>
        <p>By accessing or using AviQR ("Service"), you agree to these Terms. If you do not agree, do not use the Service.</p>

        <h2>2. Service Description</h2>
        <p>AviQR provides a SaaS platform enabling restaurants, hotels, malls, and food courts to manage digital menus, receive orders via QR code, and process payments through Razorpay.</p>

        <h2>3. Eligibility</h2>
        <p>You must be at least 18 years of age. By registering, you confirm all information you provide is accurate. The Service is intended for lawful business use in India.</p>

        <h2>4. Account Security</h2>
        <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately at <a href="mailto:support@aviqr.in">support@aviqr.in</a> of any unauthorized use.</p>

        <h2>5. Subscription & Payment</h2>
        <p>Subscription fees are billed in advance in INR, exclusive of GST. Payments are processed via Razorpay. Fees are non-refundable except as required by law. Failure to pay may result in suspension.</p>

        <h2>6. Acceptable Use</h2>
        <p>You may not use the Service for unlawful purposes, to list prohibited items, to misrepresent your business, or to attempt unauthorized access to any system.</p>

        <h2>7. Customer Transactions</h2>
        <p>AviQR facilitates orders between you and your customers. You are solely responsible for food quality, safety, and FSSAI compliance. Refund disputes are between you, your customer, and Razorpay.</p>

        <h2>8. Intellectual Property</h2>
        <p>AviQR and all associated content are the property of AviQR Technologies. You retain rights to your content but grant AviQR a licence to host and display it for the purpose of operating the Service.</p>

        <h2>9. Disclaimer & Liability</h2>
        <p>The Service is provided "as is." AviQR is not liable for indirect, incidental, or consequential damages. Total liability is capped at fees paid in the preceding 12 months.</p>

        <h2>10. Governing Law</h2>
        <p>These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.</p>

        <h2>11. Grievance Officer</h2>
        <p>Grievance Officer Email: <a href="mailto:grievance@aviqr.in">grievance@aviqr.in</a><br/>Response time: within 30 days of receipt.</p>

        <h2>12. Contact</h2>
        <p>Email: <a href="mailto:legal@aviqr.in">legal@aviqr.in</a> · Website: <a href="https://aviqr.in">aviqr.in</a></p>

        <p className="legal-updated">Last updated: 25 June 2025</p>
      </div>
      <SiteFooter />
    </div>
  );
}
