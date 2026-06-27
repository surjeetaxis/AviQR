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
import AdminDashboard    from './pages/admin/AdminDashboard.jsx';
import SupportDashboard  from './pages/support/SupportDashboard.jsx';
import SupplierDashboard from './pages/supplier/SupplierDashboard.jsx';
import HotelDashboard    from './pages/hotel/HotelDashboard.jsx';
import MallDashboard     from './pages/mall/MallDashboard.jsx';
import CustomerMenu      from './pages/customer/CustomerMenu.jsx';
import Onboarding        from './components/shared/Onboarding.jsx';
import TermsPage         from './pages/legal/TermsPage.jsx';
import PrivacyPage         from './pages/legal/PrivacyPage.jsx';
import AIHub              from './pages/ai/AIHub.jsx';

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

      {/* Onboarding — shown after registration, per role */}
      <Route path="/onboarding"      element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* Customer QR Menu — fully public */}
      <Route path="/terms"          element={<TermsPage />} />
      <Route path="/privacy"        element={<PrivacyPage />} />
      <Route path="/menu/:shopId"   element={<CustomerMenu />} />
      <Route path="/customer"        element={<CustomerMenu />} />

      {/* Owner/Staff dashboard */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders"    element={<Orders />} />
        <Route path="menu"      element={<Menu />} />
        <Route path="qr-codes"  element={<QRCodes />} />
        <Route path="staff"     element={<Staff />} />
        <Route path="reports"   element={<Reports />} />
        <Route path="settings"  element={<Settings />} />
        <Route path="ai"        element={<AIHub />} />
      </Route>

      {/* Role dashboards */}
      <Route path="/admin/*"    element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/support/*"  element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
      <Route path="/supplier/*" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />
      <Route path="/hotel/*"    element={<ProtectedRoute><HotelDashboard /></ProtectedRoute>} />
      <Route path="/mall/*"     element={<ProtectedRoute><MallDashboard /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
