import { useNavigate } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';

export default function SiteFooter({ isHome = false }) {
  const navigate = useNavigate();
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
          <p className="footer-copy">© 2025 AviQR Technologies Pvt Ltd</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <a href={`${base}#features`}>Features</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/features'); }}>What's new</a>
            <a href={`${base}#pricing`}>Pricing</a>
            <a href={`${base}#verticals`}>Verticals</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/free-qr-menu-generator'); }}>Free QR generator</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/guides/qr-code-menu-guide'); }}>QR menu guide</a>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Company</div>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/about'); }}>About us</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/contact'); }}>Contact</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/faq'); }}>FAQ</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/partners'); }}>Partners</a>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Accounts</div>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>Register</a>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/login?role=admin'); }}>Admin login</a>
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
