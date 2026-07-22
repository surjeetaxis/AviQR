import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, Package, User } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { getCustomerContext, contextRoute } from '../context/customerContext.js';
import BottomNav from '../components/customer/BottomNav.jsx';
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

  return (
    <div className="cps-shell">
      <div className="cps-content">
        <Outlet />
      </div>
      <BottomNav
        tabs={TABS}
        activeKey={activeTab}
        badges={{ cart: cartCount }}
        onTabClick={goTab}
      />
    </div>
  );
}