// AviQR Web — API Client
// Auto-falls back to mock data when backend is unreachable

import axios from 'axios';

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT + shop context on every request ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aviqr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const user = JSON.parse(localStorage.getItem('aviqr_user') || '{}');
    if (user.shopId) config.headers['X-Shop-Id']   = user.shopId;
    if (user.role)   config.headers['X-User-Role'] = user.role.toUpperCase();
  } catch {}
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const rt = localStorage.getItem('aviqr_refresh');
        if (rt) {
          const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: rt });
          const newToken = res.data.data.accessToken;
          localStorage.setItem('aviqr_token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('aviqr_token');
        localStorage.removeItem('aviqr_refresh');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Backend health check ──────────────────────────────────────────────────────
// Uses a RELATIVE URL so Vite proxy handles it — avoids CORS in dev
// In production, same domain so no CORS issue either
export let backendOnline = true;
export async function checkBackend() {
  try {
    // /actuator/health is proxied by Vite to localhost:8080 in dev
    // In prod it's served from the same origin via Nginx
    await axios.get('/actuator/health', { timeout: 5000 });
    backendOnline = true;
  } catch {
    backendOnline = false;
  }
  return backendOnline;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (d)    => api.post('/api/v1/auth/login', d),
  loginOtp:       (d)    => api.post('/api/v1/auth/otp/login', d),
  sendOtp:        (ph)   => api.post('/api/v1/auth/otp/send', { phone: ph }),
  register:       (d)    => api.post('/api/v1/auth/register', d),
  logout:         ()     => api.post('/api/v1/auth/logout'),
  getProfile:     ()     => api.get('/api/v1/auth/profile'),
  updateProfile:  (d)    => api.put('/api/v1/auth/profile', d),
  forgotPassword: (e)    => api.post(`/api/v1/auth/forgot-password?email=${e}`),
  linkShop:       (shopId) => api.put('/api/v1/auth/link-shop', { shopId }),
  // Admin
  getUsers:       (p)    => api.get('/api/v1/auth/admin/users', { params: p }),
  updateStatus:   (id,s) => api.put(`/api/v1/auth/admin/users/${id}/status?status=${s}`),
  deleteUser:     (id)   => api.delete(`/api/v1/auth/admin/users/${id}`),
  getUserStats:   ()     => api.get('/api/v1/auth/admin/users/stats'),
};

// ── Shop ──────────────────────────────────────────────────────────────────────
export const shopApi = {
  getMyShops:       ()           => api.get('/api/v1/shops/my'),
  getById:          (id)         => api.get(`/api/v1/shops/${id}`),
  create:           (d)          => api.post('/api/v1/shops', d),
  update:           (id, d)      => api.put(`/api/v1/shops/${id}`, d),
  list:             (p)          => api.get('/api/v1/shops', { params: p }),
  updateStatus:     (id, status) => api.put(`/api/v1/shops/${id}/status?status=${status}`),
  getStaff:         (shopId)     => api.get(`/api/v1/staff/shop/${shopId}`),
  addStaff:         (sId, d)     => api.post(`/api/v1/staff/shop/${sId}`, d),
  updateStaff:      (id, d)      => api.put(`/api/v1/staff/${id}`, d),
  removeStaff:      (id)         => api.delete(`/api/v1/staff/${id}`),
  getSettings:      (shopId)     => api.get(`/api/v1/settings/shop/${shopId}`),
  saveSettings:     (sId, d)     => api.put(`/api/v1/settings/shop/${sId}`, d),
};

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menuApi = {
  getPublicMenu:  (shopId, lang) => api.get(`/api/v1/menu/public/${shopId}`, { params: { lang } }),
  getCategories:  (shopId)       => api.get(`/api/v1/categories/shop/${shopId}`),
  createCategory: (d)            => api.post('/api/v1/categories', d),
  updateCategory: (id, d)        => api.put(`/api/v1/categories/${id}`, d),
  deleteCategory: (id)           => api.delete(`/api/v1/categories/${id}`),
  getItems:       (shopId)       => api.get(`/api/v1/items/shop/${shopId}`),
  createItem:     (d)            => api.post('/api/v1/items', d),
  updateItem:     (id, d)        => api.put(`/api/v1/items/${id}`, d),
  toggleAvail:    (id, a)        => api.put(`/api/v1/items/${id}/availability?available=${a}`),
  deleteItem:     (id)           => api.delete(`/api/v1/items/${id}`),
  getPricingRules:(shopId)       => api.get(`/api/v1/pricing-rules/shop/${shopId}`),
  createRule:     (d)            => api.post('/api/v1/pricing-rules', d),
  deleteRule:     (id)           => api.delete(`/api/v1/pricing-rules/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderApi = {
  placeOrder:   (shopId, d) => api.post(`/api/v1/orders/shop/${shopId}`, d),
  getLiveOrders:(shopId)    => api.get(`/api/v1/orders/shop/${shopId}/live`),
  getOrders:    (shopId, p) => api.get(`/api/v1/orders/shop/${shopId}`, { params: p }),
  updateStatus: (id, s)     => api.put(`/api/v1/orders/${id}/status?status=${s}`),
  getById:      (id)        => api.get(`/api/v1/orders/${id}`),
  getHistory:   (p)         => api.get('/api/v1/orders/customer/history', { params: p }),
  listAll:      (p)         => api.get('/api/v1/orders/admin/all', { params: p }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  createOrder:    (d)        => api.post('/api/v1/payments/create-order', d),
  verify:         (d)        => api.post('/api/v1/payments/verify', d),
  getByShop:      (sId, p)   => api.get(`/api/v1/payments/shop/${sId}`, { params: p }),
  refund:         (payId)    => api.post(`/api/v1/payments/${payId}/refund`),
  listAll:        (p)        => api.get('/api/v1/payments', { params: p }),
};

// ── QR Codes ──────────────────────────────────────────────────────────────────
export const qrApi = {
  getByShop:    (shopId)       => api.get(`/api/v1/qr-codes/shop/${shopId}`),
  create:       (shopId, p)    => api.post(`/api/v1/qr-codes/shop/${shopId}`, null, { params: p }),
  imageUrl:     (code)         => `${BASE_URL}/api/v1/qr-codes/${code}/image`,
  listAll:         (p)           => api.get('/api/v1/qr-codes/admin/all', { params: p }),
  toggleActive:    (id, active)  => api.put(`/api/v1/qr-codes/${id}/active?active=${active}`),
  createMarketing: (body)        => api.post('/api/v1/qr-codes/admin/marketing', body),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  getDaily:     (shopId)     => api.get(`/api/v1/reports/shop/${shopId}/daily`),
  getRevenue:   (shopId, d)  => api.get(`/api/v1/reports/shop/${shopId}/revenue?days=${d || 7}`),
  getTopItems:  (shopId)     => api.get(`/api/v1/reports/shop/${shopId}/top-items`),
  getPeakHours: (shopId)     => api.get(`/api/v1/reports/shop/${shopId}/peak-hours`),
  getPlatform:  ()           => api.get('/api/v1/reports/admin/platform'),
};

// ── Hotel ─────────────────────────────────────────────────────────────────────
export const hotelApi = {
  getMyHotels:    ()         => api.get('/api/v1/hotels/my'), listAll:        (p)        => api.get('/api/v1/hotels/admin/all', { params: p }),
  update:         (id, d)    => api.put(`/api/v1/hotels/${id}`, d),
  getRooms:       (hotelId)  => api.get(`/api/v1/rooms/hotel/${hotelId}`),
  updateRoom:     (id, d)    => api.put(`/api/v1/rooms/${id}`, d),
  getRequests:    (hId, p)   => api.get(`/api/v1/room-requests/hotel/${hId}`, { params: p }),
  updateRequest:  (id, s)    => api.put(`/api/v1/room-requests/${id}/status?status=${s}`),
  createRequest:  (d)        => api.post('/api/v1/room-requests', d),
};

// ── Mall ──────────────────────────────────────────────────────────────────────
export const mallApi = {
  getMyMalls:  ()            => api.get('/api/v1/malls/my'),
  listAll:     ()            => api.get('/api/v1/malls'),
  getVendors:  (mallId)      => api.get(`/api/v1/vendors/mall/${mallId}`),
  addVendor:   (d)           => api.post('/api/v1/vendors', d),
  toggleVendor:(id, a)       => api.put(`/api/v1/vendors/${id}/status?active=${a}`),
  deleteVendor:(id)          => api.delete(`/api/v1/vendors/${id}`),
};

// ── Support ───────────────────────────────────────────────────────────────────
export const supportApi = {
  getTickets:   (p)          => api.get('/api/v1/tickets', { params: p }),
  updateTicket: (id, s, r)   => api.put(`/api/v1/tickets/${id}/status?status=${s}&resolution=${r || ''}`),
  createTicket: (d)          => api.post('/api/v1/tickets', d),
  getStats:     ()           => api.get('/api/v1/tickets/stats'),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  getAll:      ()            => api.get('/api/v1/notifications'),
  getCount:    ()            => api.get('/api/v1/notifications/unread-count'),
  markRead:    (id)          => api.put(`/api/v1/notifications/${id}/read`),
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryApi = {
  getSummary:   (sId)        => api.get(`/api/v1/inventory/shop/${sId}/summary`),
  getStock:     (sId)        => api.get(`/api/v1/inventory/shop/${sId}`),
  setStock:     (itemId, d)  => api.put(`/api/v1/inventory/item/${itemId}`, d),
  getOutOfStock:(sId)        => api.get(`/api/v1/inventory/shop/${sId}/out-of-stock`),
  getLowStock:  (sId)        => api.get(`/api/v1/inventory/shop/${sId}/low-stock`),
};

// ── Loyalty ───────────────────────────────────────────────────────────────────
export const loyaltyApi = {
  getBalance:  (sId, phone)  => api.get(`/api/v1/loyalty/${sId}/balance`, { params: { phone } }),
  earn:        (sId, d)      => api.post(`/api/v1/loyalty/${sId}/earn`, d),
  redeem:      (sId, d)      => api.post(`/api/v1/loyalty/${sId}/redeem`, d),
  getCustomers:(sId)         => api.get(`/api/v1/loyalty/${sId}/customers`),
  getHistory:  (sId, phone)  => api.get(`/api/v1/loyalty/${sId}/history`, { params: { phone } }),
};

// ── Invoice & KOT ─────────────────────────────────────────────────────────────
export const invoiceApi = {
  downloadUrl: (orderId, shop) => {
    const p = new URLSearchParams({ ...shop });
    return `${api.defaults.baseURL}/api/v1/orders/${orderId}/invoice?${p}`;
  },
  kotUrl: (orderId) => `${api.defaults.baseURL}/api/v1/orders/${orderId}/kot`,
};

// ── Aggregator (Zomato/Swiggy mapping) ───────────────────────────────────────
export const aggregatorApi = {
  saveMapping: (d) => api.post('/api/v1/aggregator/mapping', d),
};

export default api;

// ── Menu Variants ─────────────────────────────────────────────────────────────
export const variantApi = {
  getVariants: (itemId)           => api.get(`/api/v1/items/${itemId}/variants`),
  saveVariants: (itemId, data)    => api.put(`/api/v1/items/${itemId}/variants`, data),
  deleteVariants: (itemId)        => api.delete(`/api/v1/items/${itemId}/variants`),
};

// ── Menu Add-ons ──────────────────────────────────────────────────────────────
export const addonApi = {
  getByShop:   (shopId)     => api.get(`/api/v1/addons/shop/${shopId}`),
  create:      (data)       => api.post('/api/v1/addons', data),
  update:      (id, data)   => api.put(`/api/v1/addons/${id}`, data),
  delete:      (id)         => api.delete(`/api/v1/addons/${id}`),
};

// ── Raw Materials ─────────────────────────────────────────────────────────────
export const rawMaterialApi = {
  getByShop:    (shopId)          => api.get(`/api/v1/raw-materials/shop/${shopId}`),
  getLowStock:  (shopId)          => api.get(`/api/v1/raw-materials/shop/${shopId}/low-stock`),
  create:       (data)            => api.post('/api/v1/raw-materials', data),
  update:       (id, data)        => api.put(`/api/v1/raw-materials/${id}`, data),
  adjustStock:  (id, delta, reason) => api.post(`/api/v1/raw-materials/${id}/adjust`, null, { params: { delta, reason } }),
};

// ── Recipe ────────────────────────────────────────────────────────────────────
export const recipeApi = {
  getRecipe:   (itemId)     => api.get(`/api/v1/items/${itemId}/recipe`),
  saveRecipe:  (itemId, d)  => api.put(`/api/v1/items/${itemId}/recipe`, d),
  getDishCost: (itemId)     => api.get(`/api/v1/items/${itemId}/cost`),
};

// ── POS / Billing ─────────────────────────────────────────────────────────────
export const posApi = {
  // Creates an order directly from the POS terminal (owner/cashier initiated)
  createBill:  (shopId, data) => api.post(`/api/v1/orders/shop/${shopId}/pos`, data),
  // KOT print URL
  kotUrl:      (orderId)      => `${api.defaults.baseURL}/api/v1/orders/${orderId}/kot`,
  // Billing summary for a table
  getTable:    (shopId, tbl)  => api.get(`/api/v1/orders/shop/${shopId}/table/${tbl}`),
};

// ── Aggregator Configuration ──────────────────────────────────────────────────
export const aggregatorConfigApi = {
  // Save Zomato/Swiggy restaurant ID mapping for a shop
  saveMapping: (data)     => api.post('/api/v1/aggregator/mapping', data),
  getMapping:  (shopId)   => api.get(`/api/v1/aggregator/mapping/${shopId}`),
};
