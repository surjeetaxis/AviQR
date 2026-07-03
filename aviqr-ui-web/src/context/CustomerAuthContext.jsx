import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/index.js';

// A separate, lightweight session for the Customer Portal (QR-scanning diners/guests),
// deliberately isolated from AuthContext's aviqr_token/aviqr_user so a customer session
// in one tab never collides with a staff session in another (e.g. an owner previewing
// their own QR code while still logged into their dashboard).
//
// Login is phone+OTP only (authApi.sendOtp/loginOtp) — auth-service self-registers a
// CUSTOMER-role account on first successful OTP login, so there's no separate signup step.
// Browsing (menu/food-court/hotel-services) never requires this; it's only needed for
// Cart checkout, Orders, Rewards, Favorites, and Profile.
const CustomerAuthContext = createContext(null);

const TOKEN_KEY = 'aviqr_customer_token';
const USER_KEY  = 'aviqr_customer';

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser  = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser && savedToken) {
      setCustomer(JSON.parse(savedUser));
      setCustomerToken(savedToken);
    }
    setLoading(false);
  }, []);

  const sendOtp = (phone) => authApi.sendOtp(phone);

  const loginWithOtp = async (phone, otp) => {
    const res = await authApi.loginOtp({ phone, otp });
    const { accessToken, ...userData } = res.data.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setCustomerToken(accessToken);
    setCustomer(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCustomerToken(null);
    setCustomer(null);
  };

  // Header object to spread into any api.* call that needs the customer's identity
  // (favorites, orders, real checkout) — the shared axios interceptor only attaches
  // the staff aviqr_token, so customer-portal calls must pass this explicitly.
  const authHeader = customerToken ? { headers: { Authorization: `Bearer ${customerToken}` } } : {};

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data, authHeader);
    const updated = res.data.data;
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setCustomer(updated);
    return updated;
  };

  return (
    <CustomerAuthContext.Provider value={{
      customer, customerToken, loading, authHeader,
      isLoggedIn: !!customerToken,
      sendOtp, loginWithOtp, logout, updateProfile,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be inside CustomerAuthProvider');
  return ctx;
};
