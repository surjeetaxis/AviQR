import { useState } from 'react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import { Mail, Phone, MapPin, ShieldAlert } from 'lucide-react';
import '../landing/Landing.css';
import './Company.css';

const CHANNELS = [
  { icon: Mail,  title: 'Support',   desc: 'Product questions, bugs, account help', value: 'support@aviqr.in', href: 'mailto:support@aviqr.in' },
  { icon: Phone, title: 'Call us',   desc: 'Mon–Sat, 9 AM – 8 PM IST', value: '+91 98450 00000', href: 'tel:+919845000000' },
  { icon: MapPin,title: 'Office',    desc: 'Registered address', value: 'Bengaluru, Karnataka – 560001', href: null },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${form.name || 'AviQR visitor'}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:support@aviqr.in?subject=${subject}&body=${body}`;
  };

  return (
    <div className="company-page">
      <SEO
        title="Contact AviQR"
        description="Reach the AviQR team for support, sales or grievance escalation."
        canonical="https://aviqr.in/contact"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Contact</div>
        <h1 className="company-title">Talk to us</h1>
        <p className="company-sub">Questions about a plan, a bug to report, or a partnership to discuss — here's how to reach the team directly.</p>
      </section>

      <section className="company-section" style={{ paddingBottom: 24 }}>
        <div className="contact-grid">
          {CHANNELS.map(c => (
            <div key={c.title} className="contact-card">
              <div className="contact-icon"><c.icon size={20} /></div>
              <div className="contact-title">{c.title}</div>
              <div className="contact-desc">{c.desc}</div>
              {c.href
                ? <a className="contact-value" href={c.href}>{c.value}</a>
                : <div className="contact-value" style={{ color: 'var(--gray-700)' }}>{c.value}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="contact-form-wrap">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field">
            <label htmlFor="c-name">Name</label>
            <input id="c-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div className="contact-field">
            <label htmlFor="c-email">Email</label>
            <input id="c-email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@business.com" />
          </div>
          <div className="contact-field">
            <label htmlFor="c-message">Message</label>
            <textarea id="c-message" required value={form.message} onChange={e => set('message', e.target.value)} placeholder="How can we help?" />
          </div>
          <button type="submit" className="contact-submit">Send message</button>
          <p className="contact-form-note">Opens your email app addressed to support@aviqr.in — we typically reply within 2 hours during business hours.</p>
        </form>

        <div className="trust-card" style={{ marginTop: 24 }}>
          <div className="trust-icon"><ShieldAlert size={20} /></div>
          <div>
            <div className="trust-title">Grievance Officer</div>
            <div className="trust-desc">
              For DPDP Act / IT Rules grievances that aren't resolved by support, escalate to{' '}
              <a href="mailto:grievance@aviqr.in">grievance@aviqr.in</a> — response within 30 days.
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
