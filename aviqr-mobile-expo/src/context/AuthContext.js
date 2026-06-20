import { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { authApi } from '../api/index.js';

const AuthContext = createContext(null);

// ── Storage — SecureStore on device, localStorage on web ─────────────────────
const storage = {
  async get(key) {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async del(key) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

export const ROLE_HOME = {
  OWNER:'/(owner)/dashboard', MANAGER:'/(owner)/dashboard',
  CASHIER:'/(owner)/dashboard', KITCHEN:'/(owner)/dashboard',
  ADMIN:'/(admin)/home', SUPPORT:'/(support)/home',
  HOTEL:'/(hotel)/home', MALL:'/(mall)/home',
  SUPPLIER:'/(supplier)/home', CUSTOMER:'/(customer)/menu',
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

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    try {
      await storage.del('aviqr_token');
      await storage.del('aviqr_refresh');
      await storage.del('aviqr_user');
    } catch {}
    setUser(null);
  };

  const role = (user?.role || '').toUpperCase();

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, loginOtp, register, logout,
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
