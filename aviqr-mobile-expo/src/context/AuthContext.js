import { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { authApi } from '../api/index.js';
import { tokenStorage as storage } from '../api/tokenStorage.js';

const AuthContext = createContext(null);

export const ROLE_HOME = {
  OWNER:'/(owner)/dashboard', MANAGER:'/(owner)/dashboard',
  CASHIER:'/(owner)/dashboard', KITCHEN:'/(owner)/dashboard',
  ADMIN:'/(admin)/admin-home', SUPPORT:'/(support)/support-home',
  HOTEL:'/(hotel)/hotel-home', MALL:'/(mall)/mall-home',
  SUPPLIER:'/(supplier)/supplier-home', CUSTOMER:'/(customer)/portal-home',
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [saved, tok] = await Promise.all([
          storage.get('aviqr_user'),
          storage.get('aviqr_token'),
        ]);
        if (saved && tok) setUser(JSON.parse(saved));
      } catch (e) {
        console.warn('Session restore failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = async ({ accessToken, refreshToken, ...userData }) => {
    await storage.set('aviqr_token',   accessToken);
    await storage.set('aviqr_refresh', refreshToken || '');
    await storage.set('aviqr_user',    JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    return saveSession(res.data.data);
  };

  const loginOtp = async (phone, otp) => {
    const res = await authApi.loginOtp({ phone, otp });
    return saveSession(res.data.data);
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    return saveSession(res.data.data);
  };

  // Called right after creating a shop during onboarding — mints a fresh
  // JWT with shopId baked in (mirrors web's AuthContext.linkShop).
  const linkShop = async (shopId) => {
    const res = await authApi.linkShop(shopId);
    return saveSession(res.data.data);
  };

  // Merges a profile update (e.g. from Settings/Profile screens) into the
  // persisted session so other screens reading `user` see it immediately,
  // without needing a full re-login.
  const updateUser = async (partial) => {
    const merged = { ...user, ...partial };
    await storage.set('aviqr_user', JSON.stringify(merged));
    setUser(merged);
    return merged;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    try {
      await storage.del('aviqr_token');
      await storage.del('aviqr_refresh');
      await storage.del('aviqr_user');
    } catch {}
    setUser(null);
    // Every "Sign out" button across every role's screens just calls
    // logout() with no follow-up navigation — without this, clearing the
    // session left you stranded on the same now-unauthenticated screen
    // instead of landing back on the public homepage.
    router.replace('/');
  };

  const role = (user?.role || '').toUpperCase();

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, loginOtp, register, logout, updateUser, linkShop,
      homeRoute: ROLE_HOME[role] || '/(owner)/dashboard',
      isOwner:   ['OWNER','MANAGER','CASHIER','KITCHEN'].includes(role),
      isAdmin:   role === 'ADMIN',
      isSupport: role === 'SUPPORT',
      isHotel:   role === 'HOTEL',
      isMall:    role === 'MALL',
      isSupplier:role === 'SUPPLIER',
      isCustomer:role === 'CUSTOMER',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const ROLE_CONFIG = {
  OWNER:    { label: 'Shop Owner',      color: '#1D9E75' },
  MANAGER:  { label: 'Manager',         color: '#2563EB' },
  CASHIER:  { label: 'Cashier',         color: '#7C3AED' },
  KITCHEN:  { label: 'Kitchen Staff',   color: '#D97706' },
  ADMIN:    { label: 'Super Admin',     color: '#DC2626' },
  SUPPORT:  { label: 'Support Agent',   color: '#D97706' },
  SUPPLIER: { label: 'Supplier',        color: '#2563EB' },
  HOTEL:    { label: 'Hotel Manager',   color: '#7C3AED' },
  MALL:     { label: 'Mall Manager',    color: '#059669' },
  CUSTOMER: { label: 'Customer',        color: '#6B7280' },
};
