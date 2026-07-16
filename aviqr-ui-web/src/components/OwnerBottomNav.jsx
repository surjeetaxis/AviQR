import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, BookOpen, BarChart3, Settings } from 'lucide-react';
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext.jsx';
import './OwnerBottomNav.css';

// Mobile-width replacement for the Sidebar's off-canvas drawer (see
// DashboardLayout.jsx / .css — hidden above 900px, where the full Sidebar
// takes over). Same floating-pill-with-sliding-badge pattern as the
// customer portal's nav (CustomerPortalShell.jsx/.css) and the Expo app's
// OwnerTabBar — one shared design language across every bottom nav in the
// product, just re-themed per surface's own tab set.
const TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
  { to: '/orders',    label: 'Orders',    icon: ShoppingBag,     perm: 'orders' },
  { to: '/menu',      label: 'Menu',      icon: BookOpen,        perm: 'menu' },
  { to: '/reports',   label: 'Reports',   icon: BarChart3,       perm: 'reports' },
  { to: '/settings',  label: 'Settings',  icon: Settings,        perm: 'settings' },
];

export default function OwnerBottomNav({ liveOrderCount = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role || '').toUpperCase();
  const perms = ROLE_PERMISSIONS[role];
  const canAccess = (perm) => perms === null || perms === undefined || perms.includes(perm);

  const visibleTabs = TABS.filter(tab => canAccess(tab.perm));
  const activeIndex = Math.max(0, visibleTabs.findIndex(tab => location.pathname.startsWith(tab.to)));
  const ActiveIcon = visibleTabs[activeIndex]?.icon;

  return (
    <nav className="obn-nav" style={{ '--index': activeIndex, '--count': visibleTabs.length }} aria-label="Primary navigation">
      <div className="obn-indicator" aria-hidden="true">
        <span className="obn-indicator-circle">
          {ActiveIcon && <ActiveIcon size={20} />}
        </span>
      </div>

      {visibleTabs.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={tab.to}
            className={`obn-tab${isActive ? ' is-active' : ''}`}
            onClick={() => navigate(tab.to)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="obn-tab-icon">
              <tab.icon size={20} />
              {tab.to === '/orders' && liveOrderCount > 0 && !isActive && (
                <span className="obn-badge">{liveOrderCount > 9 ? '9+' : liveOrderCount}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
