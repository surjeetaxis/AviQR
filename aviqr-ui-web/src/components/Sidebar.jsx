import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, BookOpen, QrCode, Users, BarChart3,
  Settings, LogOut, X, Sparkles, Package, Gift, ShieldCheck,
  TrendingUp, Utensils, PlusCircle, Receipt, FlaskConical, Clock, ChefHat,
  MessageSquare, Zap, LayoutGrid
} from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_PERMISSIONS } from '../context/AuthContext.jsx';
import { useLang } from './shared/LangPicker.jsx';
import { t } from '../i18n/translations.js';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    labelKey: 'groupOperations',
    items: [
      { to:'/dashboard', labelKey:'navDashboard',    icon:LayoutDashboard },
      { to:'/orders',    labelKey:'orders',       icon:ShoppingBag,  badge:'orders' },
      { to:'/billing',   labelKey:'navPosBilling',icon:Receipt },
      { to:'/kot',       labelKey:'navKot', icon:ChefHat, badge:'kot' },
    ],
  },
  {
    labelKey: 'menu',
    items: [
      { to:'/menu',         labelKey:'navMenuItems',    icon:BookOpen },
      { to:'/variations',   labelKey:'navVariants', icon:PlusCircle },
      { to:'/dining-areas', labelKey:'navDineInAreas', icon:LayoutGrid },
      { to:'/shortcodes',   labelKey:'navShortcodes', icon:Zap },
    ],
  },
  {
    labelKey: 'groupQR',
    items: [
      { to:'/qr-codes',   labelKey:'qrCodes',     icon:QrCode },
    ],
  },
  {
    labelKey: 'groupInventory',
    items: [
      { to:'/inventory',     labelKey:'navStockLevels',      icon:Package },
      { to:'/raw-materials', labelKey:'navRawMaterials',     icon:FlaskConical },
    ],
  },
  {
    labelKey: 'groupCustomers',
    items: [
      { to:'/loyalty', labelKey:'navLoyalty', icon:Gift },
      { to:'/campaigns', labelKey:'navCampaigns', icon:MessageSquare },
    ],
  },
  {
    labelKey: 'staff',
    items: [
      { to:'/staff', labelKey:'staff', icon:Users },
    ],
  },
  {
    labelKey: 'reports',
    items: [
      { to:'/reports',   labelKey:'reports',           icon:BarChart3 },
      { to:'/analytics',     labelKey:'navAnalytics', icon:TrendingUp },
      { to:'/order-history', labelKey:'navOrderHistory',       icon:Clock },
    ],
  },
  {
    labelKey: 'groupAI',
    items: [
      { to:'/ai', labelKey:'navAiFeatures', icon:Sparkles },
    ],
  },
  {
    labelKey: 'groupAccount',
    items: [
      { to:'/settings', labelKey:'settings', icon:Settings },
    ],
  },
];

export default function Sidebar({ mobileOpen, onClose, liveOrderCount = 0, basePath = '' }) {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  // Returns true if the current user's role can access a given route path segment
  const canAccess = (to) => {
    const role = (user?.role || '').toUpperCase();
    const perms = ROLE_PERMISSIONS[role];
    if (perms === null || perms === undefined) return true;
    return perms.includes(to.replace('/', ''));
  };

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
          <span className="sidebar-wordmark">Avi<em>QR</em></span>
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
            {liveOrderCount > 0 ? `${liveOrderCount} ${t('liveOrders', lang)}` : t('noActiveOrders', lang)}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Primary navigation" style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {basePath && (
          <NavLink to="/hotel" onClick={onClose} className="sidebar-link" style={{ marginBottom:8 }}>
            <span>&larr; {t('backToOutlets', lang)}</span>
          </NavLink>
        )}
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canAccess(item.to));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.labelKey} style={{ marginBottom:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:.8, padding:'10px 20px 4px' }}>
                {t(group.labelKey, lang)}
              </div>
              {visibleItems.map(({ to, labelKey, icon:Icon, badge }) => (
                <NavLink key={to} to={`${basePath}${to}`} onClick={onClose}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{t(labelKey, lang)}</span>
                  {badge === 'orders' && liveOrderCount > 0 && (
                    <span className="sidebar-badge" style={{ background:'#DC2626', marginLeft:'auto' }}>{liveOrderCount}</span>
                  )}
                  {badge === 'kot' && liveOrderCount > 0 && (
                    <span className="sidebar-badge" style={{ background:'#D97706', marginLeft:'auto' }}>{liveOrderCount}</span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}

        {isAdmin && (
          <div style={{ marginBottom:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:.8, padding:'10px 20px 4px' }}>Admin</div>
            <NavLink to="/admin" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
              <ShieldCheck size={16} /><span>{t('navAdminPanel', lang)}</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:8, textAlign:'center' }}>
          {(ROLE_LABELS[user?.role] || 'Owner').toUpperCase()}
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" /> {t('logout', lang)}
        </button>
        <div className="sidebar-version">AviQR v2.1</div>
      </div>
    </aside>
  );
}
