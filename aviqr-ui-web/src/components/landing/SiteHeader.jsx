import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';

// Shared marketing-site header — used on the landing page itself and on every
// other public page (About, Contact, FAQ, Privacy, Terms, Refund) so the whole
// site feels like one product instead of the landing page plus bolted-on docs.
export default function SiteHeader({ isHome = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const base = isHome ? '' : '/';

  return (
    <nav className="land-nav">
      <div className="land-nav-inner">
        <Link className="land-logo" to="/" aria-label="AviQR home">
          <LogoMark />
          <span className="land-wordmark">Avi<em>QR</em></span>
        </Link>
        <button className="public-menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="public-navigation" onClick={()=>setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
        <div id="public-navigation" className={`land-nav-links${open ? " mobile-open" : ""}`} onClick={()=>setOpen(false)}>
          <a href={`${base}#features`}>Features</a>
          <a href={`${base}#showcase`}>See it in action</a>
          <a href={`${base}#verticals`}>Who it's for</a>
          <a href={`${base}#pricing`}>Pricing</a>
          <a href="/features" className="land-nav-secondary">What's new</a>
          <a href="/free-qr-menu-generator" className="land-nav-secondary">Free QR generator</a>
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
