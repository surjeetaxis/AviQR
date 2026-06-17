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

export const DEMO_USERS = {
  owner:    { id:'00000000-0000-0000-0000-000000000003', name:'Sujeet Narayanan',  email:'sujeet@spiceroute.in',  role:'OWNER',    shopId:'00000000-0000-0000-0000-000000000101', avatar:'SN' },
  admin:    { id:'00000000-0000-0000-0000-000000000001', name:'Priya Mehta',        email:'admin@aviqr.in',        role:'ADMIN',    avatar:'PM' },
  support:  { id:'00000000-0000-0000-0000-000000000002', name:'Arjun Nair',         email:'support@aviqr.in',      role:'SUPPORT',  avatar:'AN' },
  hotel:    { id:'00000000-0000-0000-0000-000000000006', name:'Grand Palace Hotel', email:'gm@grandpalace.in',     role:'HOTEL',    hotelId:'00000000-0000-0000-0006-000000000001', avatar:'GP' },
  mall:     { id:'00000000-0000-0000-0000-000000000007', name:'Forum Mall Admin',   email:'admin@forum.in',        role:'MALL',     mallId:'00000000-0000-0000-0009-000000000001', avatar:'FM' },
  supplier: { id:'00000000-0000-0000-0000-000000000008', name:'Ramesh Enterprises', email:'ramesh@teas.in',        role:'SUPPLIER', avatar:'RE' },
  customer: { id:'00000000-0000-0000-0000-000000000010', name:'Anjali Singh',       email:'anjali@gmail.com',      role:'CUSTOMER', avatar:'AS' },
  manager:  { id:'00000000-0000-0000-0000-000000000009', name:'Vikram Sharma',      email:'vikram@gmail.com',      role:'MANAGER',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'VS' },
  cashier:  { id:'00000000-0000-0000-0000-000000000014', name:'Deepa Cashier',      email:'cashier@spiceroute.in', role:'CASHIER',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'DC' },
  kitchen:  { id:'00000000-0000-0000-0000-000000000013', name:'Chef Rangan',        email:'kitchen@spiceroute.in', role:'KITCHEN',  shopId:'00000000-0000-0000-0000-000000000101', avatar:'CR' },
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

  const demoLogin = (role) => {
    const u = DEMO_USERS[role.toLowerCase()] || DEMO_USERS.owner;
    localStorage.setItem('aviqr_user',  JSON.stringify(u));
    localStorage.setItem('aviqr_token', 'demo-token');
    setUser(u);
    setToken('demo-token');
    return u;
  };

  // switchRole — lets sidebar switch between demo dashboards
  const switchRole = (role) => {
    return demoLogin(role);
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

  const role = (user?.role || '').toLowerCase();

  return (
    <AuthContext.Provider value={{
      user, token, lang, loading,
      login, loginWithOtp, register, demoLogin, switchRole, logout, changeLang,
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
