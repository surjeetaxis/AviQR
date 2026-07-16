import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/index.js';

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
  MANAGER:      ['dashboard','orders','billing','kot','menu','variations','shortcodes','dining-areas','qr-codes',
                 'inventory','raw-materials','loyalty','campaigns','reports','analytics','order-history','ai'],
  CASHIER:      ['dashboard','orders','billing','reports','order-history'],
  KITCHEN:      ['dashboard','orders','kot'],
  MENU_EDITOR:  ['dashboard','menu','variations','shortcodes','dining-areas'],
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
    const saved = localStorage.getItem('aviqr_user');
    const tok   = localStorage.getItem('aviqr_token');
    let savedUser = null;
    if (saved && tok) { savedUser = JSON.parse(saved); setUser(savedUser); setToken(tok); }
    const savedLang = localStorage.getItem('aviqr_lang');
    if (savedUser?.preferredLanguage) setLang(savedUser.preferredLanguage);
    else if (savedLang) setLang(savedLang);
    setLoading(false);
  }, []);

  const saveSession = (data) => {
    const { accessToken, refreshToken, ...userData } = data;
    localStorage.setItem('aviqr_token',   accessToken);
    localStorage.setItem('aviqr_refresh', refreshToken || '');
    localStorage.setItem('aviqr_user',    JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
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

  const loginWithOtp = async (phone, otp) => {
    const res = await authApi.loginOtp({ phone, otp });
    return saveSession(res.data.data);
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    return saveSession(res.data.data);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('aviqr_token');
    localStorage.removeItem('aviqr_refresh');
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
