import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, Package, User } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { getCustomerContext, contextRoute } from '../context/customerContext.js';
import './CustomerPortalShell.css';

// The Customer Portal shell: persistent bottom nav across all three QR flows
// (restaurant menu, hotel services, food-court restaurant list) plus the new
// Orders/Profile pages. Wraps the *existing* routes via <Outlet/> — same URLs,
// so already-printed QR codes keep working unchanged.
//
// 8 nav items from the spec (Home/Search/Favorites/Cart/Orders/Payments/Rewards/
// Profile) are consolidated to 5 in the bottom bar (standard mobile UX — Swiggy/
// Zomato-style apps use ~5 max); Favorites/Rewards/Payments live inside Profile.
const TABS = [
  { key: 'home',    label: 'Home',    icon: Home },
  { key: 'search',  label: 'Search',  icon: Search },
  { key: 'cart',    label: 'Cart',    icon: ShoppingCart },
  { key: 'orders',  label: 'Orders',  icon: Package },
  { key: 'profile', label: 'Profile', icon: User },
];

export default function CustomerPortalShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();

  const goTab = (key) => {
    const ctx = getCustomerContext();
    const base = contextRoute(ctx);
    if (key === 'home')   return navigate(base || '/portal/home');
    if (key === 'search') return navigate(base ? `${base}?focusSearch=1` : '/portal/home');
    if (key === 'cart')   return navigate(base ? `${base}?openCart=1` : '/portal/home');
    if (key === 'orders') return navigate('/portal/orders');
    if (key === 'profile')return navigate('/portal/profile');
  };

  const activeTab = (() => {
    if (location.pathname.startsWith('/portal/orders')) return 'orders';
    if (location.pathname.startsWith('/portal/profile')) return 'profile';
    if (location.search.includes('openCart=1')) return 'cart';
    if (location.search.includes('focusSearch=1')) return 'search';
    return 'home';
  })();

  const activeIndex = Math.max(0, TABS.findIndex(t => t.key === activeTab));
  const ActiveIcon = TABS[activeIndex].icon;

  return (
    <div className="cps-shell">
      <div className="cps-content">
        <Outlet />
      </div>
      <nav className="cps-nav" aria-label="Customer Portal navigation">
        {/* Single floating indicator (notch + raised circle) that SLIDES between
            tabs via one transform — this is what actually animates on tab change,
            instead of each button popping its own copy in/out with no motion. */}
        <div
          className="cps-nav-indicator"
          style={{ '--index': activeIndex, '--count': TABS.length }}
          aria-hidden="true"
        >
          <span className="cps-nav-indicator-notch" />
          <span className="cps-nav-indicator-circle">
            <ActiveIcon size={20} />
          </span>
        </div>

        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`cps-nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => goTab(tab.key)}
            aria-label={tab.label}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            <div className="cps-nav-icon-wrap">
              <tab.icon size={20} />
              {tab.key === 'cart' && cartCount > 0 && <span className="cps-nav-badge">{cartCount}</span>}
            </div>
            <span className="sr-only">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}