import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, BookOpen, QrCode, Users, BarChart3,
  Settings, LogOut, X, Sparkles, Package, Gift, ShieldCheck,
  TrendingUp, Utensils, PlusCircle, Receipt, FlaskConical, Clock
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext.jsx';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { to:'/dashboard', label:'Dashboard',    icon:LayoutDashboard },
      { to:'/orders',    label:'Orders',       icon:ShoppingBag,  badge:'orders' },
      { to:'/billing',   label:'POS / Billing',icon:Receipt },
    ],
  },
  {
    label: 'Menu',
    items: [
      { to:'/menu',       label:'Menu Items',    icon:BookOpen },
      { to:'/variations', label:'Variants & Add-ons', icon:PlusCircle },
      { to:'/qr-codes',   label:'QR Codes',     icon:QrCode },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to:'/inventory',     label:'Stock Levels',      icon:Package },
      { to:'/raw-materials', label:'Raw Materials',     icon:FlaskConical },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to:'/loyalty', label:'Loyalty Program', icon:Gift },
      { to:'/staff',   label:'Staff',           icon:Users },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to:'/reports',   label:'Reports',           icon:BarChart3 },
      { to:'/analytics',     label:'Advanced Analytics', icon:TrendingUp },
      { to:'/order-history', label:'Order History',       icon:Clock },
      { to:'/ai',        label:'AI Features',        icon:Sparkles },
    ],
  },
  {
    label: 'Account',
    items: [
      { to:'/settings', label:'Settings', icon:Settings },
    ],
  },
];

export default function Sidebar({ mobileOpen, onClose, liveOrderCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => { onClose(); logout(); navigate('/'); };

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <rect x="3"  y="3"  width="9" height="9" rx="2" fill="#1D9E75"/>
              <rect x="16" y="3"  width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
              <rect x="3"  y="16" width="9" height="9" rx="2" fill="#fff" opacity=".92"/>
              <rect x="5.5"  y="5.5"  width="4" height="4" rx="1" fill="#111"/>
              <rect x="18.5" y="5.5"  width="4" height="4" rx="1" fill="#111"/>
              <rect x="5.5"  y="18.5" width="4" height="4" rx="1" fill="#111"/>
              <rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75"/>
              <rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5"/>
            </svg>
          </div>
          <span className="sidebar-wordmark">Avi<em>qr</em></span>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>

      {/* Shop card */}
      <div className="sidebar-shop-card">
        <div className="sidebar-shop-avatar">{user?.name?.slice(0,2).toUpperCase() || 'SR'}</div>
        <div className="sidebar-shop-info">
          <div className="sidebar-shop-name">{user?.shopName || user?.name || 'My Shop'}</div>
          <div className="sidebar-shop-status">
            <span className="status-dot" aria-hidden="true" />
            {liveOrderCount > 0 ? `${liveOrderCount} live orders` : 'No active orders'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Primary navigation" style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:.8, padding:'10px 20px 4px' }}>
              {group.label}
            </div>
            {group.items.map(({ to, label, icon:Icon, badge }) => (
              <NavLink key={to} to={to} onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
                {badge === 'orders' && liveOrderCount > 0 && (
                  <span className="sidebar-badge" style={{ background:'#DC2626', marginLeft:'auto' }}>{liveOrderCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {isAdmin && (
          <div style={{ marginBottom:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:.8, padding:'10px 20px 4px' }}>Admin</div>
            <NavLink to="/admin" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
              <ShieldCheck size={16} /><span>Admin Panel</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:8, textAlign:'center' }}>
          {(ROLE_LABELS[user?.role] || 'Owner').toUpperCase()}
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
        <div className="sidebar-version">AviQR v2.1</div>
      </div>
    </aside>
  );
}
