import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLE_PERMISSIONS, ROLE_DEFAULT_ROUTE } from './context/AuthContext.jsx';
import RouteLoading from './components/shared/RouteLoading.jsx';
import RouteErrorBoundary from './components/shared/RouteErrorBoundary.jsx';
import usePageViews from './hooks/useAnalytics.js';

const CaptchaPortal = lazy(() => import('./pages/CaptchaPortal.jsx'));
const AccountSecurity = lazy(() => import('./pages/AccountSecurity.jsx'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout.jsx'));
const Landing = lazy(() => import('./pages/landing/Landing.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Menu = lazy(() => import('./pages/Menu.jsx'));
const MenuOcrScan = lazy(() => import('./pages/MenuOcrScan.jsx'));
const QRCodes = lazy(() => import('./pages/QRCodes.jsx'));
const Staff = lazy(() => import('./pages/Staff.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Loyalty = lazy(() => import('./pages/Loyalty.jsx'));
const Campaigns = lazy(() => import('./pages/Campaigns.jsx'));
const Billing = lazy(() => import('./pages/Billing.jsx'));
const RawMaterials = lazy(() => import('./pages/RawMaterials.jsx'));
const MenuVariations = lazy(() => import('./pages/MenuVariations.jsx'));
const Shortcodes = lazy(() => import('./pages/Shortcodes.jsx'));
const DiningAreas = lazy(() => import('./pages/DiningAreas.jsx'));
const OrderHistory = lazy(() => import('./pages/OrderHistory.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const SupportDashboard = lazy(() => import('./pages/support/SupportDashboard.jsx'));
const SupplierDashboard = lazy(() => import('./pages/supplier/SupplierDashboard.jsx'));
const HotelDashboard = lazy(() => import('./pages/hotel/HotelDashboard.jsx'));
const ContactlessCheckin = lazy(() => import('./pages/pms/ContactlessCheckin.jsx'));
const BookingEngine = lazy(() => import('./pages/pms/BookingEngine.jsx'));
const StayReview = lazy(() => import('./pages/pms/StayReview.jsx'));
const MallDashboard = lazy(() => import('./pages/mall/MallDashboard.jsx'));
const VendorQrCodes = lazy(() => import('./pages/mall/VendorQrCodes.jsx'));
const CustomerMenu = lazy(() => import('./pages/customer/CustomerMenu.jsx'));
const GuestServices = lazy(() => import('./pages/customer/GuestServices.jsx'));
const FoodCourtHome = lazy(() => import('./pages/customer/FoodCourtHome.jsx'));
const BrandHome = lazy(() => import('./pages/customer/BrandHome.jsx'));
const CustomerPortalShell = lazy(() => import('./layouts/CustomerPortalShell.jsx'));
const PortalHome = lazy(() => import('./pages/customer/PortalHome.jsx'));
const QrScan = lazy(() => import('./pages/customer/QrScan.jsx'));
const PortalOrders = lazy(() => import('./pages/customer/PortalOrders.jsx'));
const PortalOrderDetail = lazy(() => import('./pages/customer/PortalOrderDetail.jsx'));
const PortalProfile = lazy(() => import('./pages/customer/PortalProfile.jsx'));
const PortalAddresses = lazy(() => import('./pages/customer/PortalAddresses.jsx'));
const TrackOrder = lazy(() => import('./pages/customer/TrackOrder.jsx'));
const Onboarding = lazy(() => import('./components/shared/Onboarding.jsx'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage.jsx'));
const RefundPage = lazy(() => import('./pages/legal/RefundPage.jsx'));
const AboutPage = lazy(() => import('./pages/company/AboutPage.jsx'));
const FeaturesPage = lazy(() => import('./pages/company/FeaturesPage.jsx'));
const ContactPage = lazy(() => import('./pages/company/ContactPage.jsx'));
const FAQPage = lazy(() => import('./pages/company/FAQPage.jsx'));
const PartnersPage = lazy(() => import('./pages/company/PartnersPage.jsx'));
const QrMenuGeneratorPage = lazy(() => import('./pages/tools/QrMenuGeneratorPage.jsx'));
const QrMenuGuidePage = lazy(() => import('./pages/guides/QrMenuGuidePage.jsx'));
const GuidesIndexPage = lazy(() => import('./pages/guides/GuidesIndexPage.jsx'));
const QrOrderingGuidePage = lazy(() => import('./pages/guides/QrOrderingGuidePage.jsx'));
const QrMenuChecklistPage = lazy(() => import('./pages/guides/QrMenuChecklistPage.jsx'));
const AIHub = lazy(() => import('./pages/ai/AIHub.jsx'));
const KOT = lazy(() => import('./pages/KOT.jsx'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />
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
  if (loading) return <RouteLoading />
  if (!user) return <Navigate to="/login" replace />;
  if ((user?.role || '').toUpperCase() !== 'ADMIN') {
    return <Navigate to={ROLE_DEFAULT_ROUTE[(user?.role || '').toUpperCase()] || '/dashboard'} replace />;
  }
  return children;
}

// ADMIN or SUPPORT only — the support console (tickets, subscriptions, etc.)
function SupportRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />
  if (!user) return <Navigate to="/login" replace />;
  const role = (user?.role || '').toUpperCase();
  if (role !== 'SUPPORT' && role !== 'ADMIN') {
    return <Navigate to={ROLE_DEFAULT_ROUTE[role] || '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  usePageViews();

  return (
    <RouteErrorBoundary>
    <Suspense fallback={<RouteLoading message="Loading page…" />}>
      <Routes>
      <Route path="/captcha" element={<CaptchaPortal />} />
      {/* Public */}
      <Route path="/"                element={<Landing />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms"           element={<TermsPage />} />
      <Route path="/privacy"         element={<PrivacyPage />} />
      <Route path="/refund"          element={<RefundPage />} />
      <Route path="/about"           element={<AboutPage />} />
      <Route path="/features"        element={<FeaturesPage />} />
      <Route path="/contact"         element={<ContactPage />} />
      <Route path="/faq"             element={<FAQPage />} />
      <Route path="/partners"        element={<PartnersPage />} />
      <Route path="/free-qr-menu-generator" element={<QrMenuGeneratorPage />} />
      <Route path="/guides/qr-code-menu-guide" element={<QrMenuGuidePage />} />
      <Route path="/guides"                  element={<GuidesIndexPage />} />
      <Route path="/guides/qr-ordering-system-restaurants-india" element={<QrOrderingGuidePage />} />
      <Route path="/guides/qr-menu-software-checklist" element={<QrMenuChecklistPage />} />
      <Route path="/track-order"     element={<TrackOrder />} />
      <Route path="/pms/contactless-checkin/:reservationId" element={<ContactlessCheckin />} />
      <Route path="/book/:hotelId" element={<BookingEngine />} />
      <Route path="/review/:hotelId" element={<StayReview />} />
      <Route path="/account-security" element={<ProtectedRoute><AccountSecurity /></ProtectedRoute>} />
      <Route path="/portal/security" element={<AccountSecurity customerMode />} />
      <Route path="/onboarding"      element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Customer Portal — persistent bottom-nav shell (Home/Search/Cart/Orders/Profile)
          wraps the three QR-flow pages at their EXISTING paths, so already-printed
          QR codes keep working unchanged, plus the new Orders/Profile pages. */}
      <Route element={<CustomerPortalShell />}>
        <Route path="/customer"                element={<CustomerMenu />} />
        <Route path="/menu/:shopId"            element={<CustomerMenu />} />
        <Route path="/hotel-services/:hotelId" element={<GuestServices />} />
        <Route path="/food-court/:mallId"      element={<FoodCourtHome />} />
        <Route path="/brand/:brandId"          element={<BrandHome />} />
        <Route path="/portal/home"             element={<PortalHome />} />
        <Route path="/portal/scan"             element={<QrScan />} />
        <Route path="/portal/orders"           element={<PortalOrders />} />
        <Route path="/portal/orders/:orderId"  element={<PortalOrderDetail />} />
        <Route path="/portal/profile"          element={<PortalProfile />} />
        <Route path="/portal/profile/addresses" element={<PortalAddresses />} />
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
        <Route path="menu/scan"    element={<RoleRoute path="menu"><MenuOcrScan /></RoleRoute>} />
        <Route path="variations"   element={<RoleRoute path="variations"><MenuVariations /></RoleRoute>} />
        <Route path="shortcodes"   element={<RoleRoute path="shortcodes"><Shortcodes /></RoleRoute>} />
        <Route path="dining-areas" element={<RoleRoute path="dining-areas"><DiningAreas /></RoleRoute>} />
        {/* Reports — OWNER MANAGER CASHIER */}
        <Route path="reports"      element={<RoleRoute path="reports"><Reports /></RoleRoute>} />
        <Route path="order-history" element={<RoleRoute path="order-history"><OrderHistory /></RoleRoute>} />
        {/* Owner/Manager only */}
        <Route path="qr-codes"     element={<RoleRoute path="qr-codes"><QRCodes /></RoleRoute>} />
        <Route path="staff"        element={<RoleRoute path="staff"><Staff /></RoleRoute>} />
        <Route path="inventory"    element={<RoleRoute path="inventory"><Inventory /></RoleRoute>} />
        <Route path="raw-materials" element={<RoleRoute path="raw-materials"><RawMaterials /></RoleRoute>} />
        <Route path="loyalty"      element={<RoleRoute path="loyalty"><Loyalty /></RoleRoute>} />
        <Route path="campaigns"    element={<RoleRoute path="campaigns"><Campaigns /></RoleRoute>} />
        <Route path="analytics"    element={<RoleRoute path="analytics"><Analytics /></RoleRoute>} />
        <Route path="ai"           element={<RoleRoute path="ai"><AIHub /></RoleRoute>} />
      </Route>

      {/* Hotel owner managing a specific outlet — reuses the shop-owner pages above, scoped to the outlet's linked shop */}
      <Route path="/hotel/outlets/:outletId" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="staff"         element={<Staff />} />
        <Route path="settings"      element={<Settings />} />
        <Route path="loyalty"       element={<Loyalty />} />
        <Route path="campaigns"     element={<Campaigns />} />
        <Route path="menu"          element={<Menu />} />
        <Route path="variations"    element={<MenuVariations />} />
        <Route path="shortcodes"    element={<Shortcodes />} />
        <Route path="dining-areas"  element={<DiningAreas />} />
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
      <Route path="/support"  element={<SupportRoute><SupportDashboard /></SupportRoute>} />
      <Route path="/supplier" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
      {/* Mall admin managing a specific vendor's QR codes — reuses the shop-owner QR
          designer, scoped to the vendor's linked shop (same idea as hotel outlets,
          QR-only here since mall has its own vendor-management UI elsewhere) */}
      <Route path="/mall/vendors/:vendorId/qr-codes" element={<ProtectedRoute><VendorQrCodes /></ProtectedRoute>} />
      <Route path="/hotel"    element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>} />
      <Route path="/pms"      element={<Navigate to="/hotel" replace />} />
      <Route path="/mall"     element={<ProtectedRoute><MallDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </RouteErrorBoundary>
  );
}
