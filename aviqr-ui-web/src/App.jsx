import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

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
      <Route path="/menu/:shopId"    element={<CustomerMenu />} />
      <Route path="/customer"        element={<CustomerMenu />} />
      <Route path="/onboarding"      element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Main dashboard */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        {/* Core */}
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="orders"       element={<Orders />} />
        <Route path="billing"      element={<Billing />} />
        <Route path="menu"         element={<Menu />} />
        <Route path="variations"   element={<MenuVariations />} />
        <Route path="qr-codes"     element={<QRCodes />} />
        <Route path="staff"        element={<Staff />} />
        {/* Inventory */}
        <Route path="inventory"    element={<Inventory />} />
        <Route path="raw-materials" element={<RawMaterials />} />
        {/* Loyalty */}
        <Route path="loyalty"      element={<Loyalty />} />
        {/* Reports */}
        <Route path="reports"      element={<Reports />} />
        <Route path="analytics"    element={<Analytics />} />
        <Route path="order-history" element={<OrderHistory />} />
        {/* AI + Settings */}
        <Route path="ai"           element={<AIHub />} />
        <Route path="settings"     element={<Settings />} />
        {/* Kitchen Display */}
        <Route path="kot"          element={<KOT />} />
      </Route>

      {/* Role-specific dashboards — standalone (no owner sidebar) */}
      <Route path="/admin"    element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/support"  element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
      <Route path="/supplier" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
      <Route path="/hotel"    element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>} />
      <Route path="/mall"     element={<ProtectedRoute><MallDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
