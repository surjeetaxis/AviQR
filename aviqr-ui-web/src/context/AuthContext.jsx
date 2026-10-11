import { createContext, useContext, useState, useEffect } from 'react';
import { refreshSession } from '../api/index.js';
import { setSession, subscribeSessions } from '../api/sessionStore.js';
import { authApi, shopApi } from '../api/index.js';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  OWNER:'Shop Owner', MANAGER:'Manager', CASHIER:'Cashier', KITCHEN:'Kitchen Staff',
  MENU_EDITOR:'Menu Editor', ORDER_VIEWER:'Order Viewer',
  ADMIN:'Super Admin', SUPPORT:'Support Agent', SUPPLIER:'Supplier',
  HOTEL:'Hotel Owner', MALL:'Mall Admin', CUSTOMER:'Customer',
  owner:'Shop Owner', manager:'Manager', cashier:'Cashier', kitchen:'Kitchen Staff',
  menu_editor:'Menu Editor', order_viewer:'Order Viewer',
  admin:'Super Admin', support:'Support Agent', supplier:'Supplier',
  hotel:'Hotel Owner', mall:'Mall Admin', customer:'Customer',
};

// null = unrestricted; array = allowed route segments
// 'settings' is intentionally absent from all staff roles — OWNER only
export const ROLE_PERMISSIONS = {
  OWNER:        null,   // main user — full access including settings
  ADMIN:        null,   // platform super admin
  SUPPORT:      null,
  MANAGER:      ['dashboard','orders','billing','kot','menu','menu/scan','variations','shortcodes','dining-areas','qr-codes',
                 'inventory','raw-materials','loyalty','campaigns','reports','analytics','order-history','ai'],
  CASHIER:      ['dashboard','orders','billing','reports','order-history'],
  KITCHEN:      ['dashboard','orders','kot'],
  MENU_EDITOR:  ['dashboard','menu','menu/scan','variations','shortcodes','dining-areas'],
  ORDER_VIEWER: ['dashboard','orders','order-history'],
};

export const ROLE_DEFAULT_ROUTE = {
  OWNER:'/dashboard', MANAGER:'/dashboard',
  CASHIER:'/billing', KITCHEN:'/kot',
  MENU_EDITOR:'/menu', ORDER_VIEWER:'/orders',
  ADMIN:'/admin', SUPPORT:'/support',
  HOTEL:'/hotel', MALL:'/mall', SUPPLIER:'/supplier',
};

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [lang, setLang]     = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apply = (audience, data) => {
      if (audience !== 'staff') return;
      const { accessToken, refreshToken, trustedDeviceToken, ...profile } = data || {};
      setUser(data ? profile : null); setToken(accessToken || null);
    };
    const unsubscribe = subscribeSessions(apply);
    const savedLang = localStorage.getItem('aviqr_lang');
    if (savedLang) setLang(savedLang);
    let cancelled = false;
    refreshSession().catch(() => { if (!cancelled) setSession(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const saveSession = data => {
    if (data.requiresOtp) return data;
    setSession(data);
    const { accessToken, refreshToken, trustedDeviceToken, ...userData } = data;
    localStorage.setItem('aviqr_user', JSON.stringify(userData));
    if (userData.preferredLanguage) {
      setLang(userData.preferredLanguage);
      localStorage.setItem('aviqr_lang', userData.preferredLanguage);
    }
    return userData;
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    return saveSession(res.data.data);
  };

  const loginWithOtp = async (email, otp, options={}) => {
    const res = await authApi.loginOtp({ email, otp, ...options });
    return saveSession(res.data.data);
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    return saveSession(res.data.data);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    setSession(null);
    localStorage.removeItem('aviqr_user');
    setToken(null);
    setUser(null);
  };

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('aviqr_lang', code);
    if (user) {
      updateUser({ preferredLanguage: code });
      authApi.updateProfile({ preferredLanguage: code }).catch(() => {});
    }
  };

  const linkShop = async (shopId) => {
    const res = await authApi.linkShop(shopId);
    return saveSession(res.data.data);
  };

  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('aviqr_user', JSON.stringify(updated));
      return updated;
    });
  };

  // The shop's logo isn't part of the login payload (it can change any time from
  // Settings), so it's fetched once per session and cached on `user` — Sidebar/Topbar
  // read it from there instead of each re-fetching the shop. Settings.jsx calls
  // updateUser({ shopLogoUrl }) directly after a save so both update immediately
  // without waiting for this effect to re-run.
  useEffect(() => {
    if (!user?.shopId || user.shopLogoUrl !== undefined) return;
    shopApi.getById(user.shopId)
      .then(res => updateUser({ shopLogoUrl: res.data?.data?.logoUrl || '' }))
      .catch(() => {});
  }, [user?.shopId, user?.shopLogoUrl]);

  const role = (user?.role || '').toLowerCase();

  return (
    <AuthContext.Provider value={{
      user, token, lang, loading,
      login, loginWithOtp, register, logout, changeLang,
      updateUser, linkShop,
      isOwner:    ['owner','manager','cashier','kitchen','menu_editor','order_viewer'].includes(role),
      isAdmin:    role === 'admin',
      isSupport:  role === 'support',
      isHotel:    role === 'hotel',
      isMall:     role === 'mall',
      isSupplier: role === 'supplier',
      isCustomer: role === 'customer',
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
