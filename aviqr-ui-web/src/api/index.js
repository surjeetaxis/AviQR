// AviQR Web — API Client
// Auto-falls back to mock data when backend is unreachable

import axios from 'axios';
import { getActiveOutletId, getActiveToken } from './outletContext.js';

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const APP_VERSION = '1.0.0';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT + shop context on every request ────────────────────────────────
api.interceptors.request.use((config) => {
  // While managing a hotel outlet, use the short-lived outlet-scoped token
  // (carries the outlet's real shopId) instead of the user's own login token,
  // so gateway-derived X-Shop-Id checks in shop/order/menu/report/qr/payment
  // services authorize correctly.
  // A caller can pre-set Authorization (e.g. a per-call outlet/vendor-scoped
  // token) to opt out of this — used when aggregating across several outlets
  // at once, where the single module-level active-outlet token doesn't fit.
  if (!config.headers.Authorization) {
    const outletToken = getActiveOutletId() ? getActiveToken() : null;
    const token = outletToken || localStorage.getItem('aviqr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const user = JSON.parse(localStorage.getItem('aviqr_user') || '{}');
    if (user.shopId) config.headers['X-Shop-Id']   = user.shopId;
    if (user.role)   config.headers['X-User-Role'] = user.role.toUpperCase();
  } catch {}
  // Lets support/admin session analytics tell web logins apart from mobile —
  // see aviqr-mobile-expo's resolveDevHost()-adjacent header set for the
  // mobile-side equivalent of this.
  config.headers['X-Platform'] = 'WEB';
  config.headers['X-App-Version'] = APP_VERSION;
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
  getProfile:     (config={})    => api.get('/api/v1/auth/profile', config),
  updateProfile:  (d, config={}) => api.put('/api/v1/auth/profile', d, config),
  deactivateAccount: (config={}) => api.put('/api/v1/auth/deactivate', {}, config),
  forgotPassword:  (e)    => api.post(`/api/v1/auth/forgot-password?email=${e}`),
  changePassword:  (d)    => api.post('/api/v1/auth/change-password', d),
  linkShop:        (shopId) => api.put('/api/v1/auth/link-shop', { shopId }),
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
  getStaff:         (shopId)     => {
    const outletId = getActiveOutletId();
    return outletId
      ? api.get(`/api/v1/hotel-outlets/${outletId}/staff`)
      : api.get(`/api/v1/staff/shop/${shopId}`);
  },
  addStaff:         (sId, d)     => api.post(`/api/v1/staff/shop/${sId}`, d),
  updateStaff:      (id, d)      => api.put(`/api/v1/staff/${id}`, d),
  removeStaff:      (id)         => api.delete(`/api/v1/staff/${id}`),
  getSettings:      (shopId)     => api.get(`/api/v1/settings/shop/${shopId}`),
  saveSettings:     (sId, d)     => api.put(`/api/v1/settings/shop/${sId}`, d),
  enter:            (id)         => api.post(`/api/v1/shops/${id}/enter`),
  // Its own top-level path (not /api/v1/shops/nearby) — see NearbyShopController.
  nearby:           (lat, lng, radiusKm, sort) => api.get('/api/v1/nearby-shops', { params: { lat, lng, radiusKm, sort } }),
  // ── Subscription (plan/trial/status) ────────────────────────────────────────
  getSubscription:      (id)         => api.get(`/api/v1/shops/${id}/subscription`),
  updateSubscription:   (id, status) => api.put(`/api/v1/shops/${id}/subscription/status`, { status }),
  requestCancellation:  (id)         => api.post(`/api/v1/shops/${id}/subscription/cancel-request`),
  getReferrals:         (id)         => api.get(`/api/v1/shops/${id}/referrals`),
};

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menuApi = {
  getPublicMenu:  (shopId, lang) => api.get(`/api/v1/menu/public/${shopId}`, { params: { lang } }),
  getCategories:  (shopId)       => api.get(`/api/v1/categories/shop/${shopId}`),
  createCategory: (d)            => api.post('/api/v1/categories', d),
  updateCategory: (id, d)        => api.put(`/api/v1/categories/${id}`, d),
  deleteCategory: (id)           => api.delete(`/api/v1/categories/${id}`),
  getItems:       (shopId)       => api.get(`/api/v1/items/shop/${shopId}`),
  getAllItems:    (shopId)       => api.get(`/api/v1/items/shop/${shopId}/all`),
  createItem:     (d)            => api.post('/api/v1/items', d),
  updateItem:     (id, d)        => api.put(`/api/v1/items/${id}`, d),
  toggleAvail:    (id, a)        => api.put(`/api/v1/items/${id}/availability?available=${a}`),
  deleteItem:     (id)           => api.delete(`/api/v1/items/${id}`),
  getPricingRules:(shopId)       => api.get(`/api/v1/pricing-rules/shop/${shopId}`),
  createRule:     (d)            => api.post('/api/v1/pricing-rules', d),
  deleteRule:     (id)           => api.delete(`/api/v1/pricing-rules/${id}`),
  copyToShops:    (fromShopId, toShopIds) => api.post('/api/v1/menu/copy', { fromShopId, toShopIds }),
  // ── Bulk import from CSV/Excel ─────────────────────────────────────────────
  importFile: (shopId, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('shopId', shopId);
    return api.post('/api/v1/menu/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadSample: async (format) => {
    const res = await api.get(`/api/v1/menu/import/sample.${format}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `aviqr-menu-sample.${format}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ── Orders ────────────────────────────────────────────────────────────────────
// config: optional axios config override (Customer Portal calls pass
// CustomerAuthContext's authHeader here since the shared interceptor only
// attaches the staff aviqr_token, not the separate customer session token).
export const orderApi = {
  placeOrder:   (shopId, d, config={}) => api.post(`/api/v1/orders/shop/${shopId}`, d, config),
  getLiveOrders:(shopId)    => api.get(`/api/v1/orders/shop/${shopId}/live`),
  getOrders:    (shopId, p, config={}) => api.get(`/api/v1/orders/shop/${shopId}`, { ...config, params: p }),
  updateStatus: (id, s)     => api.put(`/api/v1/orders/${id}/status?status=${s}`),
  getById:      (id, config={}) => api.get(`/api/v1/orders/${id}`, config),
  getHistory:   (p, config={})  => api.get('/api/v1/orders/customer/history', { ...config, params: p }),
  listAll:      (p)         => api.get('/api/v1/orders/admin/all', { params: p }),
  // Anonymous "track my order" — no auth header, gateway routes this publicly.
  lookupPublic: (orderNumber, phone) => api.get('/api/v1/orders/public/lookup', { params: { orderNumber, phone } }),
};

// ── Reviews (guest ratings/feedback) ─────────────────────────────────────────
export const reviewApi = {
  submit:         (d, config={})   => api.post('/api/v1/reviews', d, config),
  getShopSummary: (shopId)         => api.get(`/api/v1/reviews/public/shop/${shopId}/summary`),
  getShopReviews: (shopId, p)      => api.get(`/api/v1/reviews/public/shop/${shopId}`, { params: p }),
};

// ── Order confirmation code / QR — pay-at-counter gate & pickup handover ───────
// getCodeImage returns a blob, not a URL: the endpoint sits behind the gateway's
// AuthenticationFilter (like every other /api/v1/orders/** route), and a plain
// <img src> can't attach a Bearer token the way this shared axios instance does.
export const orderQrApi = {
  lookupCode:     (shopId, code)   => api.get(`/api/v1/orders/shop/${shopId}/lookup-code`, { params: { code } }),
  confirmPayment: (shopId, code)   => api.post(`/api/v1/orders/shop/${shopId}/confirm-payment`, { code }),
  confirmPickup:  (shopId, code)   => api.post(`/api/v1/orders/shop/${shopId}/confirm-pickup`, { code }),
  getCodeImage:   (orderId, config={}) => api.get(`/api/v1/orders/${orderId}/code-image`, { ...config, responseType: 'blob' }),
};

// ── Media (file upload — menu item photos/videos/3D models, shop logos) ───────
export const mediaApi = {
  upload: (file, folder = 'misc', kind = 'image') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/api/v1/media/upload', fd, {
      params: { folder, kind },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  createOrder:    (d, config={}) => api.post('/api/v1/payments/create-order', d, config),
  verify:         (d, config={}) => api.post('/api/v1/payments/verify', d, config),
  getByShop:      (sId, p)   => api.get(`/api/v1/payments/shop/${sId}`, { params: p }),
  getByCustomer:  (cId, p)   => api.get(`/api/v1/payments/customer/${cId}`, { params: p }),
  refund:         (payId)    => api.post(`/api/v1/payments/${payId}/refund`),
  listAll:        (p)        => api.get('/api/v1/payments', { params: p }),
};

// ── OCR jobs (menu-scan upload, owner-facing + admin/support visibility) ──────
export const ocrApi = {
  listAllJobs:  (p)          => api.get('/api/v1/ocr/jobs/admin/all', { params: p }),
  getByShop:    (shopId)     => api.get(`/api/v1/ocr/jobs/shop/${shopId}`),
  upload:       (shopId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/api/v1/ocr/upload', fd, {
      params: { shopId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getJob:       (id)         => api.get(`/api/v1/ocr/jobs/${id}`),
  approve:      (id, items)  => api.post(`/api/v1/ocr/jobs/${id}/approve`, items ? { items } : undefined),
};

// ── Audit logs (admin/support visibility) ─────────────────────────────────────
export const auditApi = {
  list:         (p)          => api.get('/api/v1/auth/admin/audit-logs', { params: p }),
};

// ── QR Codes ──────────────────────────────────────────────────────────────────
export const qrApi = {
  getByShop:    (shopId)       => api.get(`/api/v1/qr-codes/shop/${shopId}`),
  create:       (shopId, p)    => api.post(`/api/v1/qr-codes/shop/${shopId}`, null, { params: p }),
  imageUrl:     (code)         => `${BASE_URL}/api/v1/qr-codes/${code}/image`,
  listAll:         (p)           => api.get('/api/v1/qr-codes/admin/all', { params: p }),
  toggleActive:    (id, active)  => api.put(`/api/v1/qr-codes/${id}/active?active=${active}`),
  createMarketing: (body)        => api.post('/api/v1/qr-codes/admin/marketing', body),
  updateMarketing: (id, body)    => api.put(`/api/v1/qr-codes/${id}/marketing`, body),
  redirectUrl:     (code)         => `${BASE_URL}/api/v1/qr-codes/r/${code}`,
};

// ── Subscription Plans ──────────────────────────────────────────────────────────
export const planApi = {
  listPublic:   (vertical)     => api.get('/api/v1/plans/public', { params: vertical ? { vertical } : {} }),
  listAdmin:    ()             => api.get('/api/v1/plans'),
  create:       (body)         => api.post('/api/v1/plans', body),
  update:       (id, body)     => api.put(`/api/v1/plans/${id}`, body),
  toggleActive: (id, active)   => api.put(`/api/v1/plans/${id}/active?active=${active}`),
  remove:       (id)           => api.delete(`/api/v1/plans/${id}`),
};

// ── Discount Offers ──────────────────────────────────────────────────────────────
export const offerApi = {
  listActive:   ()             => api.get('/api/v1/offers/public'),
  listAdmin:    ()             => api.get('/api/v1/offers'),
  create:       (body)         => api.post('/api/v1/offers', body),
  update:       (id, body)     => api.put(`/api/v1/offers/${id}`, body),
  toggleActive: (id, active)   => api.put(`/api/v1/offers/${id}/active?active=${active}`),
  remove:       (id)           => api.delete(`/api/v1/offers/${id}`),
};

// ── Shop Promotions (per-shop customer-facing discounts, e.g. for QR posters) ──
export const shopPromotionApi = {
  listByShop:   (shopId)         => api.get(`/api/v1/shop-promotions/shop/${shopId}`),
  listPublic:   (shopId)         => api.get(`/api/v1/shop-promotions/public/${shopId}`),
  create:       (shopId, body)   => api.post(`/api/v1/shop-promotions/shop/${shopId}`, body),
  update:       (id, body)       => api.put(`/api/v1/shop-promotions/${id}`, body),
  toggleActive: (id, active)     => api.put(`/api/v1/shop-promotions/${id}/active?active=${active}`),
  remove:       (id)             => api.delete(`/api/v1/shop-promotions/${id}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  // token: optional per-call override (e.g. an outlet/vendor-scoped token) for
  // callers whose own login JWT has no shopId — see api.js interceptor comment.
  getDaily:     (shopId, token) => api.get(`/api/v1/reports/shop/${shopId}/daily`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  getRevenue:   (shopId, d, token) => api.get(`/api/v1/reports/shop/${shopId}/revenue?days=${d || 7}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  getTopItems:  (shopId)     => api.get(`/api/v1/reports/shop/${shopId}/top-items`),
  getPeakHours: (shopId)     => api.get(`/api/v1/reports/shop/${shopId}/peak-hours`),
  getPlatform:  ()           => api.get('/api/v1/reports/admin/platform'),
  getPlatformRevenueTrend: (days) => api.get('/api/v1/reports/admin/platform/revenue-trend', { params: { days } }),
  getPlatformOrderTypes:   (days) => api.get('/api/v1/reports/admin/platform/order-types', { params: { days } }),
  getPlatformTopShops:     (days, limit) => api.get('/api/v1/reports/admin/platform/top-shops', { params: { days, limit } }),
  emailPlatformReport:     (to, days) => api.post('/api/v1/reports/admin/platform/email', { to, days }),
  exportPlatformReport: async (days) => {
    const res = await api.get('/api/v1/reports/admin/platform/export', { params: { days }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `platform-report-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  getTaxReport: (shopId, startDate, endDate) => api.get(`/api/v1/reports/shop/${shopId}/tax`, { params: { startDate, endDate } }),
  // Server-generated CSV — authenticated blob download (mirrors invoiceApi's openPrintable
  // pattern below, adapted for a file download instead of an in-place HTML render).
  exportTaxReport: async (shopId, startDate, endDate) => {
    const res = await api.get(`/api/v1/reports/shop/${shopId}/tax/export`, { params: { startDate, endDate }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `tax-report-${shopId}-${startDate || 'last30d'}_${endDate || 'today'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ── Hotel ─────────────────────────────────────────────────────────────────────
export const hotelApi = {
  getMyHotels:    ()         => api.get('/api/v1/hotels/my'), listAll:        (p)        => api.get('/api/v1/hotels/admin/all', { params: p }),
  update:         (id, d)    => api.put(`/api/v1/hotels/${id}`, d),
  getRooms:       (hotelId)  => api.get(`/api/v1/rooms/hotel/${hotelId}`),
  updateRoom:     (id, d)    => api.put(`/api/v1/rooms/${id}`, d),
  createRoom:     (d)        => api.post('/api/v1/rooms', d),
  toggleRoomQr:   (id, active) => api.put(`/api/v1/rooms/${id}/qr?active=${active}`),
  createRoomQr:   (id)         => api.post(`/api/v1/rooms/${id}/qr-code`),
  createHotelQr:  (id)         => api.post(`/api/v1/hotels/${id}/qr-code`),
  getRequests:    (hId, p)   => api.get(`/api/v1/room-requests/hotel/${hId}`, { params: p }),
  updateRequest:  (id, s)    => api.put(`/api/v1/room-requests/${id}/status?status=${s}`),
  createRequest:  (d)        => api.post('/api/v1/room-requests', d),
};

// ── Hotel Guest Services (QR service hub, requests, bookings, folio) ──────────
// PUBLIC endpoints — guest scans a QR, no auth needed
export const guestServiceApi = {
  // Service hub the QR lands on: all outlets + charge-to-room eligibility
  hub:        (hotelId, room, area) => api.get(`/api/v1/public/hotel/${hotelId}/services`, { params: { room, area } }),
  // Raise a housekeeping / amenities / concierge request
  request:    (hotelId, body)       => api.post(`/api/v1/public/hotel/${hotelId}/service-request`, body),
  // Book a spa / activity / table slot
  book:       (hotelId, body)       => api.post(`/api/v1/public/hotel/${hotelId}/book`, body),
  // View running folio
  folio:      (hotelId, room)       => api.get(`/api/v1/public/hotel/${hotelId}/folio`, { params: { room } }),
  // Record a direct payment (card/UPI/wallet)
  payDirect:  (hotelId, body)       => api.post(`/api/v1/public/hotel/${hotelId}/pay-direct`, body),
};

// ── Hotel staff ops (dashboard) ──────────────────────────────────────────────
export const hotelOpsApi = {
  listRequests:   (hotelId, status) => api.get(`/api/v1/hotel/${hotelId}/service-requests`, { params: { status } }),
  updateRequest:  (id, status)      => api.put(`/api/v1/hotel/service-requests/${id}/status?status=${status}`),
  listBookings:   (hotelId, status) => api.get(`/api/v1/hotel/${hotelId}/bookings`, { params: { status } }),
  updateBooking:  (id, status)      => api.put(`/api/v1/hotel/bookings/${id}/status?status=${status}`),
  roomCharges:    (roomId)          => api.get(`/api/v1/rooms/${roomId}/charges`),
  settleCharges:  (roomId)          => api.post(`/api/v1/rooms/${roomId}/settle-charges`),
};

// ── Hotel Outlets (restaurants/spas/bars inside the hotel, each backed by a shop-service Shop) ─
export const hotelOutletApi = {
  list:         (hotelId)      => api.get(`/api/v1/hotel-outlets/hotel/${hotelId}`),
  getById:      (id)           => api.get(`/api/v1/hotel-outlets/${id}`),
  create:       (d)            => api.post('/api/v1/hotel-outlets', d),
  toggleStatus: (id, active)   => api.put(`/api/v1/hotel-outlets/${id}/status?active=${active}`),
  toggleQr:     (id, active)   => api.put(`/api/v1/hotel-outlets/${id}/qr?active=${active}`),
  delete:       (id)           => api.delete(`/api/v1/hotel-outlets/${id}`),
  createQr:     (id)           => api.post(`/api/v1/hotel-outlets/${id}/qr-code`),
  enter:        (id)           => api.post(`/api/v1/hotel-outlets/${id}/enter`),
};

// ── Hotel Access (hotel-wide staff roles: OWNER/GENERAL_MANAGER/OUTLET_MANAGER/STAFF) ─────
export const hotelAccessApi = {
  list:   (hotelId)      => api.get(`/api/v1/hotels/${hotelId}/access`),
  grant:  (hotelId, d)   => api.post(`/api/v1/hotels/${hotelId}/access`, d),
  revoke: (hotelId, id)  => api.delete(`/api/v1/hotels/${hotelId}/access/${id}`),
};

// ── Mall ──────────────────────────────────────────────────────────────────────
export const mallApi = {
  getMyMalls:  ()            => api.get('/api/v1/malls/my'),
  listAll:     ()            => api.get('/api/v1/malls'),
  update:      (id, d)       => api.put(`/api/v1/malls/${id}`, d),
  getVendors:  (mallId)      => api.get(`/api/v1/vendors/mall/${mallId}`),
  addVendor:   (d)           => api.post('/api/v1/vendors', d),
  toggleVendor:(id, a)       => api.put(`/api/v1/vendors/${id}/status?active=${a}`),
  deleteVendor:(id)          => api.delete(`/api/v1/vendors/${id}`),
  enterVendor: (id)          => api.post(`/api/v1/vendors/${id}/enter`),
  createVendorQr: (id)       => api.post(`/api/v1/vendors/${id}/qr-code`),
  createMallQr:   (id)       => api.post(`/api/v1/malls/${id}/qr-code`),
  // ── Restaurant Request Flow ──────────────────────────────────────────────
  requestVendor:    (d)              => api.post('/api/v1/vendors/request', d),
  myRequests:        (shopIds)       => api.get('/api/v1/vendors/requests/mine', { params: { shopIds: shopIds.join(',') } }),
  respondToRequest:  (vendorId, dec) => api.put(`/api/v1/vendors/${vendorId}/respond?decision=${dec}`),
  // ── Food Court QR Flow (public, no auth) ─────────────────────────────────
  getPublicMall:     (id)            => api.get(`/api/v1/malls/public/${id}`),
  getPublicVendors:  (mallId)        => api.get(`/api/v1/malls/public/${mallId}/vendors`),
};

// ── Supplier Brand ──────────────────────────────────────────────────────────
export const brandApi = {
  save:              (d)             => api.post('/api/v1/brands', d),
  getMine:           ()              => api.get('/api/v1/brands/my'),
  createQr:          (id)            => api.post(`/api/v1/brands/${id}/qr-code`),
  // ── Brand QR Flow (public, no auth) ──────────────────────────────────────
  getPublicBrand:    (id)            => api.get(`/api/v1/brands/public/${id}`),
  getPublicShops:    (id)            => api.get(`/api/v1/brands/public/${id}/shops`),
  // Head-office rollup — revenue/orders across every outlet the caller owns, by city/zone.
  getOverview:       (days=7)        => api.get('/api/v1/brands/overview', { params: { days } }),
};

// ── Support ───────────────────────────────────────────────────────────────────
export const supportApi = {
  getTickets:   (p)          => api.get('/api/v1/tickets', { params: p }),
  updateTicket: (id, s, r)   => api.put(`/api/v1/tickets/${id}/status?status=${s}&resolution=${r || ''}`),
  createTicket: (d)          => api.post('/api/v1/tickets', d),
  getStats:     ()           => api.get('/api/v1/tickets/stats'),
  assignTicket: (id, agentId)=> api.put(`/api/v1/tickets/${id}/assign?agentId=${agentId}`),
  impersonate:  (body)       => api.post('/api/v1/support/impersonate', body),
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
  getBalance:  (sId, phone, config={})  => api.get(`/api/v1/loyalty/${sId}/balance`, { ...config, params: { phone } }),
  earn:        (sId, d)      => api.post(`/api/v1/loyalty/${sId}/earn`, d),
  redeem:      (sId, d)      => api.post(`/api/v1/loyalty/${sId}/redeem`, d),
  getCustomers:(sId)         => {
    const outletId = getActiveOutletId();
    return outletId
      ? api.get(`/api/v1/hotel-outlets/${outletId}/loyalty-customers`)
      : api.get(`/api/v1/loyalty/${sId}/customers`);
  },
  getHistory:  (sId, phone, config={})  => api.get(`/api/v1/loyalty/${sId}/history`, { ...config, params: { phone } }),
};

// ── SMS CRM campaigns (birthday/anniversary wishes, segment broadcasts) ────────
export const campaignApi = {
  list:    (sId, config={})        => api.get(`/api/v1/campaigns/${sId}`, config),
  create:  (sId, d, config={})     => api.post(`/api/v1/campaigns/${sId}`, d, config),
  get:     (sId, id, config={})    => api.get(`/api/v1/campaigns/${sId}/${id}`, config),
  logs:    (sId, id, config={})    => api.get(`/api/v1/campaigns/${sId}/${id}/logs`, config),
  sendNow: (sId, id, config={})    => api.post(`/api/v1/campaigns/${sId}/${id}/send`, {}, config),
  pause:   (sId, id, config={})    => api.put(`/api/v1/campaigns/${sId}/${id}/pause`, {}, config),
  resume:  (sId, id, config={})    => api.put(`/api/v1/campaigns/${sId}/${id}/resume`, {}, config),
  remove:  (sId, id, config={})    => api.delete(`/api/v1/campaigns/${sId}/${id}`, config),
};

// ── Unified customer profile (birthday/anniversary/notes/labels) — CRM foundation ──
export const customerApi = {
  list:         (sId, config={})               => api.get(`/api/v1/customers/${sId}`, config),
  getProfile:   (sId, phone, config={})         => api.get(`/api/v1/customers/${sId}/profile`, { ...config, params: { phone } }),
  updateProfile:(sId, d, config={})             => api.put(`/api/v1/customers/${sId}/profile`, d, config),
  updateNotes:  (sId, d, config={})             => api.put(`/api/v1/customers/${sId}/profile/notes`, d, config),
  addLabel:     (sId, d, config={})             => api.post(`/api/v1/customers/${sId}/profile/labels`, d, config),
  removeLabel:  (sId, phone, label, config={})  => api.delete(`/api/v1/customers/${sId}/profile/labels/${encodeURIComponent(label)}`, { ...config, params: { phone } }),
};

// ── Customer Portal: favorites (phone-keyed, no account required) ─────────────
export const favoritesApi = {
  toggle: (phone, shopId, config={}) => api.post('/api/v1/favorites', { phone, shopId }, config),
  mine:   (phone, config={})         => api.get('/api/v1/favorites/mine', { ...config, params: { phone } }),
};

// ── Customer Portal: saved addresses (account-keyed, requires login) ──────────
export const addressApi = {
  list:   (config={})        => api.get('/api/v1/auth/addresses', config),
  create: (d, config={})     => api.post('/api/v1/auth/addresses', d, config),
  update: (id, d, config={}) => api.put(`/api/v1/auth/addresses/${id}`, d, config),
  remove: (id, config={})    => api.delete(`/api/v1/auth/addresses/${id}`, config),
};

// ── Invoice & KOT ─────────────────────────────────────────────────────────────
// Shop name/address/GSTIN/logo are looked up server-side from the order's
// shopId — no need to pass shop details from the frontend.
//
// open() fetches through the authenticated axios instance (a plain
// window.open(url) never attaches the staff's Bearer token, so the gateway's
// AuthenticationFilter 401s it) and writes the HTML into a window opened
// synchronously up front, so popup blockers still see it as a direct
// response to the click.
async function openPrintable(path, target, features) {
  const win = window.open('', target, features);
  try {
    const res = await api.get(path, { responseType: 'text' });
    win.document.write(res.data);
    win.document.close();
  } catch (e) {
    win?.close();
    throw e;
  }
}

export const invoiceApi = {
  openInvoice: (orderId) => openPrintable(`/api/v1/orders/${orderId}/invoice`, '_blank'),
  openKot:     (orderId) => openPrintable(`/api/v1/orders/${orderId}/kot`, 'kot', 'width=440,height=640'),
};

// ── Table Bills — consolidates a table's unbilled orders, customer pays it, staff settles it ──
export const billApi = {
  generate:    (shopId, tableNumber) => api.post(`/api/v1/bills/shop/${shopId}/table/${encodeURIComponent(tableNumber)}/generate`),
  getCurrent:  (shopId, tableNumber) => api.get(`/api/v1/bills/shop/${shopId}/table/${encodeURIComponent(tableNumber)}/current`),
  getOpenBills:(shopId)              => api.get(`/api/v1/bills/shop/${shopId}/open`),
  getById:     (id)                  => api.get(`/api/v1/bills/${id}`),
  settle:      (id)                  => api.post(`/api/v1/bills/${id}/settle`),
  openInvoice: (id) => openPrintable(`/api/v1/bills/${id}/invoice`, '_blank'),
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
  delete:       (id)              => api.delete(`/api/v1/raw-materials/${id}`),
  adjustStock:  (id, delta, reason) => api.post(`/api/v1/raw-materials/${id}/adjust`, null, { params: { delta, reason } }),
  copyToShops:  (fromShopId, toShopIds) => api.post('/api/v1/raw-materials/copy', { fromShopId, toShopIds }),
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

// ── Shortcodes (quick billing) ────────────────────────────────────────────────
export const shortcodeApi = {
  getByShop: (shopId)       => api.get(`/api/v1/shortcodes/shop/${shopId}`),
  lookup:    (shopId, code) => api.get(`/api/v1/shortcodes/shop/${shopId}/lookup`, { params: { code } }),
  create:    (data)         => api.post('/api/v1/shortcodes', data),
  update:    (id, data)     => api.put(`/api/v1/shortcodes/${id}`, data),
  delete:    (id)           => api.delete(`/api/v1/shortcodes/${id}`),
};

// ── Dine-in Areas (multiple menus / per-area pricing) ─────────────────────────
export const diningAreaApi = {
  getByShop:  (shopId)       => api.get(`/api/v1/dining-areas/shop/${shopId}`),
  create:     (data)         => api.post('/api/v1/dining-areas', data),
  update:     (id, data)     => api.put(`/api/v1/dining-areas/${id}`, data),
  delete:     (id)           => api.delete(`/api/v1/dining-areas/${id}`),
  getPrices:  (areaId)       => api.get(`/api/v1/dining-areas/${areaId}/prices`),
  savePrices: (areaId, data) => api.put(`/api/v1/dining-areas/${areaId}/prices`, data),
};
