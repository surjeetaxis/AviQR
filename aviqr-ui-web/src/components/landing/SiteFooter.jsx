import { Link } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';

export default function SiteFooter({ isHome = false }) {
  const base = isHome ? '' : '/';

  return (
    <footer className="land-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="land-logo" style={{ marginBottom: 10 }}>
            <LogoMark />
            <span className="land-wordmark">Avi<em>QR</em></span>
          </div>
          <p className="footer-tagline">Scan. Order. Engage. Grow.</p>
          <p className="footer-copy">© {new Date().getFullYear()} AviQR Technologies Pvt Ltd</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <a href={`${base}#features`}>Features</a>
            <Link to="/features">What's new</Link>
            <a href={`${base}#pricing`}>Pricing</a>
            <a href={`${base}#verticals`}>Verticals</a>
            <Link to="/free-qr-menu-generator">Free QR generator</Link>
            <Link to="/guides">Guides</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Company</div>
            <Link to="/about">About us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/partners">Partners</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Accounts</div>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
            <Link to="/login?role=admin">Admin login</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Legal</div>
            <a href="/privacy">Privacy policy</a>
            <a href="/terms">Terms of service</a>
            <a href="/refund">Refund policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
