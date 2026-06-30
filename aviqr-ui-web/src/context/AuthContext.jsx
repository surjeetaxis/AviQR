import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/index.js';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  OWNER:'Shop Owner', MANAGER:'Manager', CASHIER:'Cashier', KITCHEN:'Kitchen Staff',
  ADMIN:'Super Admin', SUPPORT:'Support Agent', SUPPLIER:'Supplier',
  HOTEL:'Hotel Owner', MALL:'Mall Admin', CUSTOMER:'Customer',
  owner:'Shop Owner', manager:'Manager', cashier:'Cashier', kitchen:'Kitchen Staff',
  admin:'Super Admin', support:'Support Agent', supplier:'Supplier',
  hotel:'Hotel Owner', mall:'Mall Admin', customer:'Customer',
};

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [lang, setLang]     = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('aviqr_user');
    const tok   = localStorage.getItem('aviqr_token');
    if (saved && tok) { setUser(JSON.parse(saved)); setToken(tok); }
    const savedLang = localStorage.getItem('aviqr_lang');
    if (savedLang) setLang(savedLang);
    setLoading(false);
  }, []);

  const saveSession = (data) => {
    const { accessToken, refreshToken, ...userData } = data;
    localStorage.setItem('aviqr_token',   accessToken);
    localStorage.setItem('aviqr_refresh', refreshToken || '');
    localStorage.setItem('aviqr_user',    JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
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
      isOwner:    ['owner','manager','cashier','kitchen'].includes(role),
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
