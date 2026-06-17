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

export const DEMO_USERS = {
  owner:    { id:'00000000-0000-0000-0000-000000000003', name:'Sujeet Narayanan',  email:'sujeet@spiceroute.in',  role:'OWNER',    shopId:'00000000-0000-0000-0000-000000000101', avatar:'SN' },
  admin:    { id:'00000000-0000-0000-0000-000000000001', name:'Priya Mehta',        email:'admin@aviqr.in',        role:'ADMIN',    avatar:'PM' },
  support:  { id:'00000000-0000-0000-0000-000000000002', name:'Arjun Nair',         email:'support@aviqr.in',      role:'SUPPORT',  avatar:'AN' },
  hotel:    { id:'00000000-0000-0000-0000-000000000006', name:'Grand Palace Hotel', email:'gm@grandpalace.in',     role:'HOTEL',    hotelId:'00000000-0000-0000-0006-000000000001', avatar:'GP' },
  mall:     { id:'00000000-0000-0000-0000-000000000007', name:'Forum Mall',         email:'admin@forum.in',        role:'MALL',     mallId:'00000000-0000-0000-0009-000000000001', avatar:'FM' },
  supplier: { id:'00000000-0000-0000-0000-000000000008', name:'Ramesh Enterprises', email:'ramesh@teas.in',        role:'SUPPLIER', avatar:'RE' },
  customer: { id:'00000000-0000-0000-0000-000000000010', name:'Anjali Singh',       email:'anjali@gmail.com',      role:'CUSTOMER', avatar:'AS' },
  manager:  { id:'00000000-0000-0000-0000-000000000009', name:'Vikram Sharma',      email:'vikram@gmail.com',      role:'MANAGER',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'VS' },
  cashier:  { id:'00000000-0000-0000-0000-000000000014', name:'Deepa Cashier',      email:'cashier@spiceroute.in', role:'CASHIER',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'DC' },
  kitchen:  { id:'00000000-0000-0000-0000-000000000013', name:'Chef Rangan',        email:'kitchen@spiceroute.in', role:'KITCHEN',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'CR' },
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

  // Demo login — works even without backend
  const demoLogin = async (role) => {
    const u = DEMO_USERS[role.toLowerCase()] || DEMO_USERS.owner;
    try {
      await storage.set('aviqr_token', 'demo-token');
      await storage.set('aviqr_user',  JSON.stringify(u));
    } catch (e) {
      console.warn('Storage unavailable, using in-memory only');
    }
    setUser(u);
    return u;
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
      login, loginOtp, register, demoLogin, logout,
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
