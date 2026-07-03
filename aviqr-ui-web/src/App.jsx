import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLE_PERMISSIONS, ROLE_DEFAULT_ROUTE } from './context/AuthContext.jsx';

import DashboardLayout   from './layouts/DashboardLayout.jsx';
import Landing           from './pages/landing/Landing.jsx';
import Login             from './pages/auth/Login.jsx';
import Register          from './pages/auth/Register.jsx';
import ForgotPassword    from './pages/auth/ForgotPassword.jsx';
import Dashboard         from './pages/Dashboard.jsx';
import Orders            from './pages/Orders.jsx';
import Menu              from './pages/Menu.jsx';
import QRCodes           from './pages/QRCodes.jsx';
import Staff             from './pages/Staff.jsx';
import Reports           from './pages/Reports.jsx';
import Settings          from './pages/Settings.jsx';
import Inventory         from './pages/Inventory.jsx';
import Loyalty           from './pages/Loyalty.jsx';
import Billing           from './pages/Billing.jsx';
import RawMaterials      from './pages/RawMaterials.jsx';
import MenuVariations    from './pages/MenuVariations.jsx';
import OrderHistory    from './pages/OrderHistory.jsx';
import Analytics         from './pages/Analytics.jsx';
import AdminDashboard    from './pages/admin/AdminDashboard.jsx';
import SupportDashboard  from './pages/support/SupportDashboard.jsx';
import SupplierDashboard from './pages/supplier/SupplierDashboard.jsx';
import HotelDashboard    from './pages/hotel/HotelDashboard.jsx';
import MallDashboard     from './pages/mall/MallDashboard.jsx';
import CustomerMenu      from './pages/customer/CustomerMenu.jsx';
import GuestServices     from './pages/customer/GuestServices.jsx';
import FoodCourtHome     from './pages/customer/FoodCourtHome.jsx';
import CustomerPortalShell from './layouts/CustomerPortalShell.jsx';
import PortalHome        from './pages/customer/PortalHome.jsx';
import PortalOrders      from './pages/customer/PortalOrders.jsx';
import PortalProfile     from './pages/customer/PortalProfile.jsx';
import Onboarding        from './components/shared/Onboarding.jsx';
import TermsPage         from './pages/legal/TermsPage.jsx';
import PrivacyPage       from './pages/legal/PrivacyPage.jsx';
import AIHub             from './pages/ai/AIHub.jsx';
import KOT              from './pages/KOT.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Redirects to the role's default page if the route isn't allowed
function RoleRoute({ path, children }) {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const perms = ROLE_PERMISSIONS[role];
  if (perms !== null && perms !== undefined && !perms.includes(path)) {
    return <Navigate to={ROLE_DEFAULT_ROUTE[role] || '/dashboard'} replace />;
  }
  return children;
}

// Only platform ADMIN role may enter the admin panel
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if ((user?.role || '').toUpperCase() !== 'ADMIN') {
    return <Navigate to={ROLE_DEFAULT_ROUTE[(user?.role || '').toUpperCase()] || '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                element={<Landing />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms"           element={<TermsPage />} />
      <Route path="/privacy"         element={<PrivacyPage />} />
      <Route path="/customer"        element={<CustomerMenu />} />
      <Route path="/onboarding"      element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Customer Portal — persistent bottom-nav shell (Home/Search/Cart/Orders/Profile)
          wraps the three QR-flow pages at their EXISTING paths, so already-printed
          QR codes keep working unchanged, plus the new Orders/Profile pages. */}
      <Route element={<CustomerPortalShell />}>
        <Route path="/menu/:shopId"            element={<CustomerMenu />} />
        <Route path="/hotel-services/:hotelId" element={<GuestServices />} />
        <Route path="/food-court/:mallId"      element={<FoodCourtHome />} />
        <Route path="/portal/home"             element={<PortalHome />} />
        <Route path="/portal/orders"           element={<PortalOrders />} />
        <Route path="/portal/profile"          element={<PortalProfile />} />
      </Route>

      {/* Main dashboard */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* Accessible by all shop roles */}
        <Route path="dashboard"    element={<Dashboard />} />
        {/* Settings — OWNER only (main user) */}
        <Route path="settings"     element={<RoleRoute path="settings"><Settings /></RoleRoute>} />
        {/* Orders — OWNER MANAGER CASHIER KITCHEN ORDER_VIEWER */}
        <Route path="orders"       element={<RoleRoute path="orders"><Orders /></RoleRoute>} />
        {/* Billing/POS — OWNER MANAGER CASHIER */}
        <Route path="billing"      element={<RoleRoute path="billing"><Billing /></RoleRoute>} />
        {/* KOT — OWNER MANAGER KITCHEN */}
        <Route path="kot"          element={<RoleRoute path="kot"><KOT /></RoleRoute>} />
        {/* Menu — OWNER MANAGER MENU_EDITOR */}
        <Route path="menu"         element={<RoleRoute path="menu"><Menu /></RoleRoute>} />
        <Route path="variations"   element={<RoleRoute path="variations"><MenuVariations /></RoleRoute>} />
        {/* Reports — OWNER MANAGER CASHIER */}
        <Route path="reports"      element={<RoleRoute path="reports"><Reports /></RoleRoute>} />
        <Route path="order-history" element={<RoleRoute path="order-history"><OrderHistory /></RoleRoute>} />
        {/* Owner/Manager only */}
        <Route path="qr-codes"     element={<RoleRoute path="qr-codes"><QRCodes /></RoleRoute>} />
        <Route path="staff"        element={<RoleRoute path="staff"><Staff /></RoleRoute>} />
        <Route path="inventory"    element={<RoleRoute path="inventory"><Inventory /></RoleRoute>} />
        <Route path="raw-materials" element={<RoleRoute path="raw-materials"><RawMaterials /></RoleRoute>} />
        <Route path="loyalty"      element={<RoleRoute path="loyalty"><Loyalty /></RoleRoute>} />
        <Route path="analytics"    element={<RoleRoute path="analytics"><Analytics /></RoleRoute>} />
        <Route path="ai"           element={<RoleRoute path="ai"><AIHub /></RoleRoute>} />
      </Route>

      {/* Hotel owner managing a specific outlet — reuses the shop-owner pages above, scoped to the outlet's linked shop */}
      <Route path="/hotel/outlets/:outletId" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="staff"         element={<Staff />} />
        <Route path="settings"      element={<Settings />} />
        <Route path="loyalty"       element={<Loyalty />} />
        <Route path="menu"          element={<Menu />} />
        <Route path="variations"    element={<MenuVariations />} />
        <Route path="orders"        element={<Orders />} />
        <Route path="billing"       element={<Billing />} />
        <Route path="kot"           element={<KOT />} />
        <Route path="inventory"     element={<Inventory />} />
        <Route path="raw-materials" element={<RawMaterials />} />
        <Route path="analytics"     element={<Analytics />} />
        <Route path="reports"       element={<Reports />} />
        <Route path="order-history" element={<OrderHistory />} />
        <Route path="qr-codes"      element={<QRCodes />} />
      </Route>

      {/* Role-specific dashboards — standalone (no owner sidebar) */}
      <Route path="/admin"    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/support"  element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
      <Route path="/supplier" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
      <Route path="/hotel"    element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>} />
      <Route path="/mall"     element={<ProtectedRoute><MallDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
