import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Config ─────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

// Web (npx expo start --web) → empty string = same origin, no CORS
// Android emulator           → 10.0.2.2 maps to your PC's localhost
// iOS simulator              → localhost
// Real device same WiFi      → your PC's IP e.g. 192.168.1.42
const DEV_URL = Platform.OS === 'web'
  ? ''                          // relative URL, no CORS issues
  : 'http://10.0.2.2:8080';    // Android emulator default
  // : 'http://localhost:8080';   // iOS simulator
  // : 'http://192.168.1.XX:8080'; // real device on same WiFi

const PROD_URL = 'https://api.aviqr.in';

export const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// ── Attach JWT ──────────────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('aviqr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// ── Auto-refresh on 401 ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const rt = await SecureStore.getItemAsync('aviqr_refresh');
        if (rt) {
          const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: rt });
          const tok = res.data.data.accessToken;
          await SecureStore.setItemAsync('aviqr_token', tok);
          orig.headers.Authorization = `Bearer ${tok}`;
          return api(orig);
        }
      } catch {
        await SecureStore.deleteItemAsync('aviqr_token');
        await SecureStore.deleteItemAsync('aviqr_refresh');
      }
    }
    return Promise.reject(error);
  }
);

// ── Backend availability check ──────────────────────────────────────────────
export async function isBackendOnline() {
  try {
    await axios.get(`${BASE_URL}/actuator/health`, { timeout: 3000 });
    return true;
  } catch { return false; }
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login:         (d)    => api.post('/api/v1/auth/login', d),
  loginOtp:      (d)    => api.post('/api/v1/auth/otp/login', d),
  sendOtp:       (ph)   => api.post('/api/v1/auth/otp/send', { phone: ph }),
  register:      (d)    => api.post('/api/v1/auth/register', d),
  logout:        ()     => api.post('/api/v1/auth/logout'),
  getProfile:    ()     => api.get('/api/v1/auth/profile'),
  updateProfile: (d)    => api.put('/api/v1/auth/profile', d),
  getUsers:      (p)    => api.get('/api/v1/auth/admin/users', { params: p }),
  updateStatus:  (id,s) => api.put(`/api/v1/auth/admin/users/${id}/status?status=${s}`),
  deleteUser:    (id)   => api.delete(`/api/v1/auth/admin/users/${id}`),
  getUserStats:  ()     => api.get('/api/v1/auth/admin/users/stats'),
};

// ── Shop ────────────────────────────────────────────────────────────────────
export const shopApi = {
  getMyShops:  ()       => api.get('/api/v1/shops/my'),
  getStaff:    (sId)    => api.get(`/api/v1/staff/shop/${sId}`),
  addStaff:    (sId, d) => api.post(`/api/v1/staff/shop/${sId}`, d),
  updateStaff: (id, d)  => api.put(`/api/v1/staff/${id}`, d),
  removeStaff: (id)     => api.delete(`/api/v1/staff/${id}`),
  getSettings: (sId)    => api.get(`/api/v1/settings/shop/${sId}`),
  saveSettings:(sId, d) => api.put(`/api/v1/settings/shop/${sId}`, d),
  listAll:     (p)      => api.get('/api/v1/shops', { params: p }),
};

// ── Menu ────────────────────────────────────────────────────────────────────
export const menuApi = {
  getPublicMenu:  (sId, lang) => api.get(`/api/v1/menu/public/${sId}`, { params: { lang } }),
  getCategories:  (sId)       => api.get(`/api/v1/categories/shop/${sId}`),
  createCategory: (d)         => api.post('/api/v1/categories', d),
  updateCategory: (id, d)     => api.put(`/api/v1/categories/${id}`, d),
  deleteCategory: (id)        => api.delete(`/api/v1/categories/${id}`),
  getItems:       (sId)       => api.get(`/api/v1/items/shop/${sId}`),
  createItem:     (d)         => api.post('/api/v1/items', d),
  updateItem:     (id, d)     => api.put(`/api/v1/items/${id}`, d),
  toggleAvail:    (id, a)     => api.put(`/api/v1/items/${id}/availability?available=${a}`),
  deleteItem:     (id)        => api.delete(`/api/v1/items/${id}`),
};

// ── Orders ──────────────────────────────────────────────────────────────────
export const orderApi = {
  placeOrder:   (sId, d) => api.post(`/api/v1/orders/shop/${sId}`, d),
  getLive:      (sId)    => api.get(`/api/v1/orders/shop/${sId}/live`),
  getAll:       (sId, p) => api.get(`/api/v1/orders/shop/${sId}`, { params: p }),
  updateStatus: (id, s)  => api.put(`/api/v1/orders/${id}/status?status=${s}`),
  getHistory:   ()       => api.get('/api/v1/orders/customer/history'),
};

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentApi = {
  createOrder: (d)     => api.post('/api/v1/payments/create-order', d),
  verify:      (d)     => api.post('/api/v1/payments/verify', d),
  getByShop:   (sId,p) => api.get(`/api/v1/payments/shop/${sId}`, { params: p }),
};

// ── QR ──────────────────────────────────────────────────────────────────────
export const qrApi = {
  getByShop: (sId) => api.get(`/api/v1/qr-codes/shop/${sId}`),
  create:    (sId, p) => api.post(`/api/v1/qr-codes/shop/${sId}`, null, { params: p }),
  imageUrl:  (code) => `${BASE_URL}/api/v1/qr-codes/${code}/image`,
};

// ── Reports ─────────────────────────────────────────────────────────────────
export const reportApi = {
  getDaily:    (sId)   => api.get(`/api/v1/reports/shop/${sId}/daily`),
  getRevenue:  (sId,d) => api.get(`/api/v1/reports/shop/${sId}/revenue?days=${d||7}`),
  getTopItems: (sId)   => api.get(`/api/v1/reports/shop/${sId}/top-items`),
  getPeakHours:(sId)   => api.get(`/api/v1/reports/shop/${sId}/peak-hours`),
  getPlatform:      ()      => api.get('/api/v1/reports/admin/platform'),
  getPlatformStats: ()      => api.get('/api/v1/reports/admin/platform'), // alias used by admin/home.js
  getCustomers:     (sId)   => api.get(`/api/v1/reports/shop/${sId}/customers`),
};

// ── Hotel ───────────────────────────────────────────────────────────────────
export const hotelApi = {
  getMyHotels:   ()       => api.get('/api/v1/hotels/my'),
  getRooms:      (hId)    => api.get(`/api/v1/rooms/hotel/${hId}`),
  getRequests:   (hId, p) => api.get(`/api/v1/room-requests/hotel/${hId}`, { params: p }),
  updateRequest: (id, s)  => api.put(`/api/v1/room-requests/${id}/status?status=${s}`),
  createRequest: (d)      => api.post('/api/v1/room-requests', d),
};

// ── Mall ─────────────────────────────────────────────────────────────────────
export const mallApi = {
  getMyMalls:  ()      => api.get('/api/v1/malls/my'),
  getVendors:  (mId)   => api.get(`/api/v1/vendors/mall/${mId}`),
  addVendor:   (d)     => api.post('/api/v1/vendors', d),
  toggleVendor:(id, a) => api.put(`/api/v1/vendors/${id}/status?active=${a}`),
  deleteVendor:(id)    => api.delete(`/api/v1/vendors/${id}`),
};

// ── Support ──────────────────────────────────────────────────────────────────
export const supportApi = {
  getTickets:   (p)       => api.get('/api/v1/tickets', { params: p }),
  updateTicket: (id, s,r) => api.put(`/api/v1/tickets/${id}/status?status=${s}&resolution=${r||''}`),
  createTicket: (d)       => api.post('/api/v1/tickets', d),
  getStats:     ()        => api.get('/api/v1/tickets/stats'),
};

// ── Notifications ────────────────────────────────────────────────────────────
export const notifApi = {
  getAll:    () => api.get('/api/v1/notifications'),
  getCount:  () => api.get('/api/v1/notifications/unread-count'),
  markRead:  (id) => api.put(`/api/v1/notifications/${id}/read`),
};

export default api;
