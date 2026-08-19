import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode, BookOpen, ListChecks } from 'lucide-react';
import SEO from '../../components/shared/SEO.jsx';
import SiteHeader from '../../components/landing/SiteHeader.jsx';
import SiteFooter from '../../components/landing/SiteFooter.jsx';
import '../landing/Landing.css';
import '../company/Company.css';

const GUIDES = [
  {
    icon: BookOpen,
    title: 'QR Code Ordering System for Restaurants in India: The Complete 2026 Guide',
    desc: 'How QR code ordering actually works, what to check before choosing a system, and setup steps.',
    href: '/guides/qr-ordering-system-restaurants-india',
  },
  {
    icon: ListChecks,
    title: "What to Look for in QR Menu Software: A 2026 Buyer's Checklist",
    desc: 'Commission model, setup time, kitchen integration, and what\'s easy to overlook when comparing vendors.',
    href: '/guides/qr-menu-software-checklist',
  },
  {
    icon: QrCode,
    title: 'QR Code Menus for Restaurants: A Practical Guide',
    desc: "What a QR code menu actually is, why small restaurants and cafes in India are switching to one.",
    href: '/guides/qr-code-menu-guide',
  },
];

export default function GuidesIndexPage() {
  const navigate = useNavigate();
  return (
    <div className="company-page">
      <SEO
        title="Guides — QR Ordering & Digital Menus for Restaurants"
        description="Practical guides on QR code ordering, digital menus, and choosing restaurant software — written for owners in India."
        canonical="https://aviqr.com/guides"
      />
      <SiteHeader />

      <section className="company-hero">
        <div className="company-eyebrow">Guides</div>
        <h1 className="company-title">Guides for restaurant owners</h1>
        <p className="company-sub">
          Practical, no-fluff guides on QR ordering and digital menus — written for the decisions you actually have to make, not to sell a specific tool.
        </p>
      </section>

      <section className="company-section" style={{ maxWidth: 760 }}>
        {GUIDES.map(g => (
          <div
            key={g.href}
            className="value-card"
            style={{ marginBottom: 16, cursor: 'pointer', textAlign: 'left' }}
            onClick={() => navigate(g.href)}
          >
            <div className="value-icon"><g.icon size={18} /></div>
            <div className="value-title">{g.title}</div>
            <div className="value-desc">{g.desc}</div>
            <div style={{ marginTop: 10, color: 'var(--green-dark)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              Read guide <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </section>

      <SiteFooter />
    </div>
  );
}
