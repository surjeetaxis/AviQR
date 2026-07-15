import { useNavigate } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';

// Shared marketing-site header — used on the landing page itself and on every
// other public page (About, Contact, FAQ, Privacy, Terms, Refund) so the whole
// site feels like one product instead of the landing page plus bolted-on docs.
export default function SiteHeader({ isHome = false }) {
  const navigate = useNavigate();
  const base = isHome ? '' : '/';

  return (
    <nav className="land-nav">
      <div className="land-nav-inner">
        <div className="land-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <LogoMark />
          <span className="land-wordmark">Avi<em>QR</em></span>
        </div>
        <div className="land-nav-links">
          <a href={`${base}#features`}>Features</a>
          <a href={`${base}#showcase`}>See it in action</a>
          <a href={`${base}#verticals`}>Who it's for</a>
          <a href={`${base}#pricing`}>Pricing</a>
          <a href="/features">What's new</a>
          <a href="/faq">FAQ</a>
          <a href="/about">About</a>
        </div>
        <div className="land-nav-cta">
          <button className="btn-ghost-nav" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn-primary-nav" onClick={() => navigate('/register')}>Get started free →</button>
        </div>
      </div>
    </nav>
  );
}
