import { createContext, useContext, useState, useEffect } from 'react';
import { refreshSession } from '../api/index.js';
import { setSession, subscribeSessions } from '../api/sessionStore.js';
import { authApi } from '../api/index.js';

// A separate, lightweight session for the Customer Portal (QR-scanning diners/guests),
// deliberately isolated from AuthContext's aviqr_token/aviqr_user so a customer session
// in one tab never collides with a staff session in another (e.g. an owner previewing
// their own QR code while still logged into their dashboard).
//
// Login is email+OTP only (authApi.sendOtp/loginOtp) — auth-service self-registers a
// CUSTOMER-role account on first successful OTP login, so there's no separate signup step.
// Browsing (menu/food-court/hotel-services) never requires this; it's only needed for
// Cart checkout, Orders, Rewards, Favorites, and Profile.
const CustomerAuthContext = createContext(null);

const USER_KEY  = 'aviqr_customer';

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apply = (audience, data) => {
      if (audience !== 'customer') return;
      const {accessToken, refreshToken, trustedDeviceToken, ...profile} = data || {};
      setCustomer(data ? profile : null); setCustomerToken(accessToken || null);
    };
    const unsubscribe = subscribeSessions(apply);
    let cancelled = false;
    refreshSession('customer').catch(() => { if (!cancelled) setSession(null,'customer'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const sendOtp = (email) => authApi.sendOtp(email);

  const loginWithOtp = async (email, otp) => {
    const res = await authApi.loginOtp({ email, otp }, { headers: {'X-Auth-Audience': 'customer'} });
    const { accessToken, refreshToken, trustedDeviceToken, ...userData } = res.data.data;
    setSession(res.data.data,'customer');
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setCustomerToken(accessToken);
    setCustomer(userData);
    return userData;
  };

  const logout = async () => {
    try { await authApi.logout({headers:{Authorization:`Bearer ${customerToken}`,'X-Auth-Audience':'customer'}}); } catch {}
    setSession(null,'customer');
    localStorage.removeItem(USER_KEY);
    setCustomerToken(null);
    setCustomer(null);
  };

  // Header object to spread into any api.* call that needs the customer's identity
  // (favorites, orders, real checkout) — the shared axios interceptor only attaches
  // the staff aviqr_token, so customer-portal calls must pass this explicitly.
  const authHeader = customerToken ? { headers: { Authorization: `Bearer ${customerToken}`, 'X-Auth-Audience': 'customer' } } : {};

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
