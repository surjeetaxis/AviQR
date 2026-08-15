import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import './Legal.css';

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <SEO title="Privacy Policy — AviQR" description="How AviQR collects, uses and protects your data." canonical="https://aviqr.com/privacy" />
      <SiteHeader />
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Effective Date: 25 June 2025 · Version 1.0</p>

        <h2>1. Introduction</h2>
        <p>AviQR ("we", "our") is committed to protecting your privacy. This Policy explains what data we collect, how we use it, and your rights under the Digital Personal Data Protection Act 2023 (DPDP Act) and the IT Rules 2011.</p>

        <h2>2. Data We Collect</h2>
        <p><strong>Business users:</strong> Name, email, phone, business details (GSTIN, address), subscription and billing history, usage logs, device information.</p>
        <p><strong>End customers (via QR menu):</strong> Name and phone number (entered at checkout), order details, payment method. No card data is stored on AviQR servers.</p>

        <h2>3. How We Use Your Data</h2>
        <p>We use your data to operate the platform, process orders, send order notifications (WhatsApp/SMS via Twilio), generate analytics, respond to support queries, and comply with legal obligations. We do <strong>not</strong> sell your data.</p>

        <h2>4. Data Sharing</h2>
        <p><strong>Razorpay</strong> — payment processing (order amount, contact details).<br/>
        <strong>Twilio</strong> — SMS/WhatsApp notifications (phone number, order summary).<br/>
        <strong>Google Cloud Vision</strong> — OCR menu scanning (image only).<br/>
        We do not share data with advertisers or marketing platforms.</p>

        <h2>5. Data Retention</h2>
        <p>Account data: duration of account + 3 years. Order/payment records: 7 years (Income Tax Act). Customer contact data: 1 year from order. Audit logs: 90 days.</p>

        <h2>6. Security</h2>
        <p>All data in transit is encrypted via TLS 1.2/1.3. Passwords are hashed with bcrypt. Databases are not publicly accessible. JWT tokens are short-lived with rotation.</p>

        <h2>7. Cookies</h2>
        <p>We use session cookies for login state and a preference cookie (aviqr_lang) for language selection. We do not use advertising cookies or cross-site tracking.</p>

        <h2>8. Your Rights (DPDP Act 2023)</h2>
        <p>You have the right to access, correct, erase, and port your personal data. You may withdraw consent for WhatsApp notifications at any time in Settings. Contact <a href="mailto:privacy@aviqr.com">privacy@aviqr.com</a> to exercise your rights.</p>

        <h2>9. Children</h2>
        <p>AviQR is not directed to persons under 18. We do not knowingly collect data from minors.</p>

        <h2>10. Contact</h2>
        <p>Privacy queries: <a href="mailto:privacy@aviqr.com">privacy@aviqr.com</a><br/>
        Grievance Officer: <a href="mailto:grievance@aviqr.com">grievance@aviqr.com</a> (response within 30 days)<br/>
        Address: [Company Registered Address], Bengaluru, Karnataka – 560001</p>

        <p className="legal-updated">Last updated: 25 June 2025</p>
      </div>
      <SiteFooter />
    </div>
  );
}
