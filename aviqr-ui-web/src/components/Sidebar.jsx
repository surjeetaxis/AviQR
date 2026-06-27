import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, BookOpen, QrCode,
  Users, BarChart3, Settings, LogOut, X, Sparkles
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext.jsx';
import './Sidebar.css';

const OWNER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders',    label: 'Orders',    icon: ShoppingBag, badge: 3 },
  { to: '/menu',      label: 'Menu',      icon: BookOpen },
  { to: '/qr-codes',  label: 'QR Codes',  icon: QrCode },
  { to: '/staff',     label: 'Staff',     icon: Users },
  { to: '/reports',   label: 'Reports',   icon: BarChart3 },
  { to: '/ai',        label: 'AI Features', icon: Sparkles },
  { to: '/settings',  label: 'Settings',  icon: Settings },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { onClose(); logout(); navigate('/'); };

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="9" height="9" rx="2" fill="#1D9E75"/>
              <rect x="16" y="3" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
              <rect x="3" y="16" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
              <rect x="5.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
              <rect x="18.5" y="5.5" width="4" height="4" rx="1" fill="#111"/>
              <rect x="5.5" y="18.5" width="4" height="4" rx="1" fill="#111"/>
              <rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5"/>
            </svg>
          </div>
          <span className="sidebar-wordmark">Avi<em>qr</em></span>
          <span className="sidebar-tag">{ROLE_LABELS[user?.role]?.toUpperCase() || 'OWNER'}</span>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>

      <div className="sidebar-shop-card">
        <div className="sidebar-shop-avatar">{user?.avatar || 'SR'}</div>
        <div className="sidebar-shop-info">
          <div className="sidebar-shop-name">{user?.shopName || user?.name || 'Spice Route'}</div>
          <div className="sidebar-shop-status">
            <span className="status-dot" aria-hidden="true" />
            Open · {ROLE_LABELS[user?.role] || 'Owner'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {OWNER_NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {badge && <span className="sidebar-badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
        <div className="sidebar-version">v2.0 · aviqr.in</div>
      </div>
    </aside>
  );
}
