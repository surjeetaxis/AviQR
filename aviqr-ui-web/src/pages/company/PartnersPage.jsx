import { useState } from 'react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import { CreditCard, Boxes, Building2, Handshake } from 'lucide-react';
import '../landing/Landing.css';
import './Company.css';

// A real, working intake page for the partnership channel — not a claim that
// any specific integration/partner already exists. Submissions route to a
// real inbox (partnerships@aviqr.com) until there's enough volume to justify
// a dedicated backend endpoint + admin queue.
const TRACKS = [
  { icon: CreditCard, title: 'Payment gateways',        desc: 'Offer AviQR as an add-on to your merchant base, or integrate as a supported payment method.' },
  { icon: Boxes,       title: 'POS & billing software',  desc: 'Two-way sync between your POS and AviQR\'s ordering/menu layer for shared merchants.' },
  { icon: Building2,   title: 'Hospitality tech / PMS',  desc: 'Room-service and in-room ordering integrations for hotel property management systems.' },
  { icon: Handshake,    title: 'Referral partners',       desc: 'Consultants, F&B associations, or agencies that work with restaurants and want to refer AviQR.' },
];

export default function PartnersPage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', track: '', message: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    const subject = encodeURIComponent(`Partnership enquiry — ${form.company || form.name || 'AviQR visitor'}`);
    const body = encodeURIComponent(
      `Track: ${form.track || 'Not specified'}\nCompany: ${form.company}\n\n${form.message}\n\n— ${form.name} (${form.email})`
    );
    window.location.href = `mailto:partnerships@aviqr.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="company-page">
      <SEO
        title="Partner with AviQR"
        description="Explore an integration or referral partnership with AviQR — payment gateways, POS software, hospitality PMS, and referral partners."
        canonical="https://aviqr.com/partners"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Partners</div>
        <h1 className="company-title">Build with AviQR, or refer it</h1>
        <p className="company-sub">
          We're open to integrations with payment gateways, POS and billing software, and hospitality PMS providers —
          and to referral partnerships with anyone who works closely with restaurants, hotels, or malls.
        </p>
      </section>

      <section className="company-section" style={{ paddingBottom: 24 }}>
        <div className="contact-grid">
          {TRACKS.map(t => (
            <div key={t.title} className="contact-card">
              <div className="contact-icon"><t.icon size={20} /></div>
              <div className="contact-title">{t.title}</div>
              <div className="contact-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="contact-form-wrap">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field">
            <label htmlFor="p-name">Your name</label>
            <input id="p-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div className="contact-field">
            <label htmlFor="p-company">Company</label>
            <input id="p-company" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Your company" />
          </div>
          <div className="contact-field">
            <label htmlFor="p-email">Email</label>
            <input id="p-email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="contact-field">
            <label htmlFor="p-track">Which track fits best?</label>
            <select id="p-track" value={form.track} onChange={e => set('track', e.target.value)}
              style={{ padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: 14 }}>
              <option value="">Select one</option>
              {TRACKS.map(t => <option key={t.title} value={t.title}>{t.title}</option>)}
            </select>
          </div>
          <div className="contact-field">
            <label htmlFor="p-message">Tell us more</label>
            <textarea id="p-message" required value={form.message} onChange={e => set('message', e.target.value)} placeholder="What are you looking to build or refer?" />
          </div>
          <button type="submit" className="contact-submit">Send enquiry</button>
          <p className="contact-form-note">Opens your email app addressed to partnerships@aviqr.com — the team reviews every enquiry.</p>
        </form>
      </div>

      <SiteFooter />
    </div>
  );
}
