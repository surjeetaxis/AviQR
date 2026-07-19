import axios from 'axios';
import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage.js';
import { getActiveOutletId } from './outletContext.js';

// ── Config ─────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

// A hardcoded LAN IP here (the previous approach) breaks every time you
// switch networks, switch between a physical device/simulator/emulator, or
// hand the project to someone else — each of those needs a DIFFERENT host,
// and "not able to reach the backend" with no obvious cause is exactly what
// a stale value silently produces. Instead, derive the host Metro is
// actually running on right now:
//   - Web (npx expo start --web)     → localhost (browser talks to the same
//                                       machine the gateway runs on)
//   - Physical device / simulator    → the LAN IP Expo Go/dev-client used to
//                                       load the JS bundle (Constants.
//                                       expoConfig.hostUri, e.g.
//                                       "192.168.1.10:8081") — always
//                                       correct for THIS run, on THIS network
//   - Android emulator               → that same hostUri reports "localhost"
//                                       (the emulator can't route back to
//                                       itself as its host), which must be
//                                       translated to 10.0.2.2, the special
//                                       alias the emulator maps to the host
//                                       machine's localhost
function resolveDevHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')?.[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  }
  return host;
}

const DEV_URL = Platform.OS === 'web'
  ? 'http://localhost:8080'
  : `http://${resolveDevHost()}:8080`;

const PROD_URL = 'https://api.aviqr.in';

export const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// ── Attach JWT ──────────────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenStorage.get('aviqr_token');
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
        const rt = await tokenStorage.get('aviqr_refresh');
        if (rt) {
          const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: rt });
          const tok = res.data.data.accessToken;
          await tokenStorage.set('aviqr_token', tok);
          orig.headers.Authorization = `Bearer ${tok}`;
          return api(orig);
        }
      } catch {
        await tokenStorage.del('aviqr_token');
        await tokenStorage.del('aviqr_refresh');
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
  forgotPassword:(e)    => api.post(`/api/v1/auth/forgot-password?email=${encodeURIComponent(e)}`),
  logout:        ()     => api.post('/api/v1/auth/logout'),
  getProfile:    ()     => api.get('/api/v1/auth/profile'),
  updateProfile: (d)    => api.put('/api/v1/auth/profile', d),
  deactivateAccount: () => api.put('/api/v1/auth/deactivate', {}),
  getUsers:      (p)    => api.get('/api/v1/auth/admin/users', { params: p }),
  updateStatus:  (id,s) => api.put(`/api/v1/auth/admin/users/${id}/status?status=${s}`),
  deleteUser:    (id)   => api.delete(`/api/v1/auth/admin/users/${id}`),
  getUserStats:  ()     => api.get('/api/v1/auth/admin/users/stats'),
};

// ── Shop ────────────────────────────────────────────────────────────────────
export const shopApi = {
  getMyShops:  ()       => api.get('/api/v1/shops/my'),
  getStaff:    (sId)    => {
    const outletId = getActiveOutletId();
    return outletId
      ? api.get(`/api/v1/hotel-outlets/${outletId}/staff`)
      : api.get(`/api/v1/staff/shop/${sId}`);
  },
  addStaff:    (sId, d) => api.post(`/api/v1/staff/shop/${sId}`, d),
  updateStaff: (id, d)  => api.put(`/api/v1/staff/${id}`, d),
  removeStaff: (id)     => api.delete(`/api/v1/staff/${id}`),
  getSettings: (sId)    => api.get(`/api/v1/settings/shop/${sId}`),
  saveSettings:(sId, d) => api.put(`/api/v1/settings/shop/${sId}`, d),
  listAll:     (p)      => api.get('/api/v1/shops', { params: p }),
  update:      (id, d)  => api.put(`/api/v1/shops/${id}`, d),
  updateStatus:(id, s)  => api.put(`/api/v1/shops/${id}/status?status=${s}`),
  // Mints a shop-scoped token (a supplier's own login JWT has no shopId, so
  // a direct order/report-service call would 403).
  enter:       (id)     => api.post(`/api/v1/shops/${id}/enter`),
};

// ── Menu ────────────────────────────────────────────────────────────────────
export const menuApi = {
  getPublicMenu:  (sId, lang) => api.get(`/api/v1/menu/public/${sId}`, { params: { lang } }),
  getCategories:  (sId)       => api.get(`/api/v1/categories/shop/${sId}`),
  createCategory: (d)         => api.post('/api/v1/categories', d),
  updateCategory: (id, d)     => api.put(`/api/v1/categories/${id}`, d),
  deleteCategory: (id)        => api.delete(`/api/v1/categories/${id}`),
  getItems:       (sId)       => api.get(`/api/v1/items/shop/${sId}/all`),
  createItem:     (d)         => api.post('/api/v1/items', d),
  updateItem:     (id, d)     => api.put(`/api/v1/items/${id}`, d),
  toggleAvail:    (id, a)     => api.put(`/api/v1/items/${id}/availability?available=${a}`),
  deleteItem:     (id)        => api.delete(`/api/v1/items/${id}`),
  copyToShops:    (fromShopId, toShopIds) => api.post('/api/v1/menu/copy', { fromShopId, toShopIds }),
};

// ── Raw materials (recipe ingredient master, supplier menu-sync copy) ───────
export const rawMaterialApi = {
  getByShop:   (shopId)            => api.get(`/api/v1/raw-materials/shop/${shopId}`),
  getLowStock: (shopId)            => api.get(`/api/v1/raw-materials/shop/${shopId}/low-stock`),
  create:      (d)                 => api.post('/api/v1/raw-materials', d),
  update:      (id, d)             => api.put(`/api/v1/raw-materials/${id}`, d),
  delete:      (id)                => api.delete(`/api/v1/raw-materials/${id}`),
  adjustStock: (id, delta, reason) => api.post(`/api/v1/raw-materials/${id}/adjust`, null, { params: { delta, reason } }),
  copyToShops: (fromShopId, toShopIds) => api.post('/api/v1/raw-materials/copy', { fromShopId, toShopIds }),
};

// ── Finished-goods stock tracking ────────────────────────────────────────────
export const inventoryApi = {
  getStock: (sId)       => api.get(`/api/v1/inventory/shop/${sId}`),
  setStock: (itemId, d) => api.put(`/api/v1/inventory/item/${itemId}`, d),
};

// ── Multi-outlet Brands (supplier head office — shared brand identity, ─────
// brand QR, cross-outlet revenue rollup) ─────────────────────────────────────
export const brandApi = {
  save:        (d)      => api.post('/api/v1/brands', d),
  getMine:     ()        => api.get('/api/v1/brands/my'),
  createQr:    (id)      => api.post(`/api/v1/brands/${id}/qr-code`),
  getOverview: (days=7)  => api.get('/api/v1/brands/overview', { params: { days } }),
  // Public — Brand QR Flow, no auth needed (customer scans a brand's main QR)
  getPublicBrand: (id) => api.get(`/api/v1/brands/public/${id}`),
  getPublicShops: (id) => api.get(`/api/v1/brands/public/${id}/shops`),
};

// ── Customer Portal: favorites (phone-keyed, no account required) ───────────
export const favoritesApi = {
  toggle: (phone, shopId) => api.post('/api/v1/favorites', { phone, shopId }),
  mine:   (phone)         => api.get('/api/v1/favorites/mine', { params: { phone } }),
};

// ── Customer Portal: saved addresses (account-keyed, requires login) ────────
export const addressApi = {
  list:   ()     => api.get('/api/v1/auth/addresses'),
  create: (d)    => api.post('/api/v1/auth/addresses', d),
  update: (id,d) => api.put(`/api/v1/auth/addresses/${id}`, d),
  remove: (id)   => api.delete(`/api/v1/auth/addresses/${id}`),
};

// ── Loyalty (customer-facing balance lookup) ─────────────────────────────────
export const loyaltyApi = {
  getBalance:   (shopId, phone) => api.get(`/api/v1/loyalty/${shopId}/balance`, { params: { phone } }),
  getCustomers: (shopId)        => api.get(`/api/v1/loyalty/${shopId}/customers`),
  getHistory:   (shopId, phone) => api.get(`/api/v1/loyalty/${shopId}/history`, { params: { phone } }),
  earn:         (shopId, d)     => api.post(`/api/v1/loyalty/${shopId}/earn`, d),
  redeem:       (shopId, d)     => api.post(`/api/v1/loyalty/${shopId}/redeem`, d),
};

// ── Orders ──────────────────────────────────────────────────────────────────
export const orderApi = {
  placeOrder:   (sId, d) => api.post(`/api/v1/orders/shop/${sId}`, d),
  getLive:      (sId)    => api.get(`/api/v1/orders/shop/${sId}/live`),
  // token: optional per-call override (e.g. a vendor-scoped token minted via
  // mallApi.enterVendor) for callers whose own login JWT has no shopId.
  getAll:       (sId, p, token) => api.get(`/api/v1/orders/shop/${sId}`, { params: p, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }),
  updateStatus: (id, s)  => api.put(`/api/v1/orders/${id}/status?status=${s}`),
  getHistory:   ()       => api.get('/api/v1/orders/customer/history'),
  listAll:      (p)      => api.get('/api/v1/orders/admin/all', { params: p }),
  getById:      (id)     => api.get(`/api/v1/orders/${id}`),
};

// ── Menu Variants & Add-ons (POS) ────────────────────────────────────────────
export const variantApi = {
  getVariants:   (itemId)       => api.get(`/api/v1/items/${itemId}/variants`),
  saveVariants:  (itemId, data) => api.put(`/api/v1/items/${itemId}/variants`, data),
  deleteVariants:(itemId)       => api.delete(`/api/v1/items/${itemId}/variants`),
};
export const addonApi = {
  getByShop: (sId)     => api.get(`/api/v1/addons/shop/${sId}`),
  create:    (d)       => api.post('/api/v1/addons', d),
  update:    (id, d)   => api.put(`/api/v1/addons/${id}`, d),
  delete:    (id)      => api.delete(`/api/v1/addons/${id}`),
};

// ── Shortcodes (quick-bill lookup) ───────────────────────────────────────────
export const shortcodeApi = {
  getByShop: (shopId)       => api.get(`/api/v1/shortcodes/shop/${shopId}`),
  lookup:    (shopId, code) => api.get(`/api/v1/shortcodes/shop/${shopId}/lookup`, { params: { code } }),
  create:    (d)           => api.post('/api/v1/shortcodes', d),
  update:    (id, d)       => api.put(`/api/v1/shortcodes/${id}`, d),
  delete:    (id)          => api.delete(`/api/v1/shortcodes/${id}`),
};

// ── Dine-in Areas (multiple menus / per-area pricing) ────────────────────────
export const diningAreaApi = {
  getByShop:  (shopId)       => api.get(`/api/v1/dining-areas/shop/${shopId}`),
  create:     (d)            => api.post('/api/v1/dining-areas', d),
  update:     (id, d)        => api.put(`/api/v1/dining-areas/${id}`, d),
  delete:     (id)           => api.delete(`/api/v1/dining-areas/${id}`),
  getPrices:  (areaId)       => api.get(`/api/v1/dining-areas/${areaId}/prices`),
  savePrices: (areaId, d)    => api.put(`/api/v1/dining-areas/${areaId}/prices`, d),
};

// ── POS / Billing (cashier-collected bill, no online payment round-trip) ────
export const posApi = {
  createBill: (shopId, data) => api.post(`/api/v1/orders/shop/${shopId}/pos`, data),
};

// ── Invoice / KOT — server-rendered HTML, printed via expo-print ───────────
export const invoiceApi = {
  getInvoiceHtml: (orderId) => api.get(`/api/v1/orders/${orderId}/invoice`, { responseType: 'text' }),
  getKotHtml:      (orderId) => api.get(`/api/v1/orders/${orderId}/kot`,     { responseType: 'text' }),
};

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentApi = {
  createOrder: (d)     => api.post('/api/v1/payments/create-order', d),
  verify:      (d)     => api.post('/api/v1/payments/verify', d),
  getByShop:   (sId,p) => api.get(`/api/v1/payments/shop/${sId}`, { params: p }),
  getByCustomer: (cId,p) => api.get(`/api/v1/payments/customer/${cId}`, { params: p }),
  listAll:     (p)     => api.get('/api/v1/payments', { params: p }),
};

// ── OCR jobs (admin/support visibility) ──────────────────────────────────────
export const ocrApi = {
  listAllJobs: (p) => api.get('/api/v1/ocr/jobs/admin/all', { params: p }),
  getByShop:   (shopId) => api.get(`/api/v1/ocr/jobs/shop/${shopId}`),
};

// ── Audit logs (admin/support visibility) ────────────────────────────────────
export const auditApi = {
  list: (p) => api.get('/api/v1/auth/admin/audit-logs', { params: p }),
};

// ── QR ──────────────────────────────────────────────────────────────────────
export const qrApi = {
  getByShop: (sId) => api.get(`/api/v1/qr-codes/shop/${sId}`),
  create:    (sId, p) => api.post(`/api/v1/qr-codes/shop/${sId}`, null, { params: p }),
  imageUrl:  (code) => `${BASE_URL}/api/v1/qr-codes/${code}/image`,
  listAll:      (p)          => api.get('/api/v1/qr-codes/admin/all', { params: p }),
  toggleActive: (id, active) => api.put(`/api/v1/qr-codes/${id}/active?active=${active}`),
};

// ── Reports ─────────────────────────────────────────────────────────────────
export const reportApi = {
  // token: optional per-call override (e.g. a vendor-scoped token minted via
  // mallApi.enterVendor) for callers whose own login JWT has no shopId.
  getDaily:    (sId, token)   => api.get(`/api/v1/reports/shop/${sId}/daily`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  getRevenue:  (sId,d,token) => api.get(`/api/v1/reports/shop/${sId}/revenue?days=${d||7}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  getTopItems: (sId)   => api.get(`/api/v1/reports/shop/${sId}/top-items`),
  getPeakHours:(sId)   => api.get(`/api/v1/reports/shop/${sId}/peak-hours`),
  getOrderTypes:      (sId, days) => api.get(`/api/v1/reports/shop/${sId}/order-types`, { params: { days } }),
  getAggregatorBreakdown: (sId, days) => api.get(`/api/v1/reports/shop/${sId}/aggregator-breakdown`, { params: { days } }),
  getHistory:  (sId, params) => api.get(`/api/v1/reports/shop/${sId}/history`, { params }),
  getPlatform:      ()      => api.get('/api/v1/reports/admin/platform'),
  getPlatformStats: ()      => api.get('/api/v1/reports/admin/platform'), // alias used by admin/home.js
  getCustomers:     (sId)   => api.get(`/api/v1/reports/shop/${sId}/customers`),
};

// ── Unified customer profile (birthday/anniversary/notes/labels) — CRM ────────
export const customerApi = {
  list:         (sId)             => api.get(`/api/v1/customers/${sId}`),
  getProfile:   (sId, phone)      => api.get(`/api/v1/customers/${sId}/profile`, { params: { phone } }),
  updateProfile:(sId, d)          => api.put(`/api/v1/customers/${sId}/profile`, d),
  updateNotes:  (sId, d)          => api.put(`/api/v1/customers/${sId}/profile/notes`, d),
  addLabel:     (sId, d)          => api.post(`/api/v1/customers/${sId}/profile/labels`, d),
  removeLabel:  (sId, phone, label) => api.delete(`/api/v1/customers/${sId}/profile/labels/${encodeURIComponent(label)}`, { params: { phone } }),
};

// ── SMS CRM campaigns (birthday/anniversary wishes, segment broadcasts) ───────
export const campaignApi = {
  list:    (sId)     => api.get(`/api/v1/campaigns/${sId}`),
  create:  (sId, d)  => api.post(`/api/v1/campaigns/${sId}`, d),
  logs:    (sId, id) => api.get(`/api/v1/campaigns/${sId}/${id}/logs`),
  sendNow: (sId, id) => api.post(`/api/v1/campaigns/${sId}/${id}/send`, {}),
  pause:   (sId, id) => api.put(`/api/v1/campaigns/${sId}/${id}/pause`),
  resume:  (sId, id) => api.put(`/api/v1/campaigns/${sId}/${id}/resume`),
  remove:  (sId, id) => api.delete(`/api/v1/campaigns/${sId}/${id}`),
};

// ── Hotel ───────────────────────────────────────────────────────────────────
export const hotelApi = {
  getMyHotels:   ()       => api.get('/api/v1/hotels/my'),
  listAll:       (p)      => api.get('/api/v1/hotels/admin/all', { params: p }),
  update:        (id, d)  => api.put(`/api/v1/hotels/${id}`, d),
  createHotelQr: (id)     => api.post(`/api/v1/hotels/${id}/qr-code`),
  getRooms:      (hId)    => api.get(`/api/v1/rooms/hotel/${hId}`),
  createRoom:    (d)      => api.post('/api/v1/rooms', d),
  toggleRoomQr:  (id, a)  => api.put(`/api/v1/rooms/${id}/qr?active=${a}`),
  createRoomQr:  (id)     => api.post(`/api/v1/rooms/${id}/qr-code`),
  getRequests:   (hId, p) => api.get(`/api/v1/room-requests/hotel/${hId}`, { params: p }),
  updateRequest: (id, s)  => api.put(`/api/v1/room-requests/${id}/status?status=${s}`),
  createRequest: (d)      => api.post('/api/v1/room-requests', d),
};

// ── Hotel Access (group-level dashboard access — GM/outlet-manager/staff, ──
// distinct from shop-service employees at one outlet) ───────────────────────
export const hotelAccessApi = {
  list:   (hotelId)     => api.get(`/api/v1/hotels/${hotelId}/access`),
  grant:  (hotelId, d)  => api.post(`/api/v1/hotels/${hotelId}/access`, d),
  revoke: (hotelId, id) => api.delete(`/api/v1/hotels/${hotelId}/access/${id}`),
};

// ── Hotel Guest Services (QR service hub, requests, bookings, folio) ────────
// PUBLIC endpoints — guest scans a QR, no auth needed
export const guestServiceApi = {
  hub:        (hotelId, room, area) => api.get(`/api/v1/public/hotel/${hotelId}/services`, { params: { room, area } }),
  request:    (hotelId, body)       => api.post(`/api/v1/public/hotel/${hotelId}/service-request`, body),
  book:       (hotelId, body)       => api.post(`/api/v1/public/hotel/${hotelId}/book`, body),
  folio:      (hotelId, room)       => api.get(`/api/v1/public/hotel/${hotelId}/folio`, { params: { room } }),
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
  // Mints an outlet-scoped token (the hotel owner's own JWT has no shopId, so
  // a direct order/report-service call would 403).
  enter:        (id)           => api.post(`/api/v1/hotel-outlets/${id}/enter`),
};

// ── Mall ─────────────────────────────────────────────────────────────────────
export const mallApi = {
  getMyMalls:  ()      => api.get('/api/v1/malls/my'),
  listAll:     ()      => api.get('/api/v1/malls'),
  getVendors:  (mId)   => api.get(`/api/v1/vendors/mall/${mId}`),
  addVendor:   (d)     => api.post('/api/v1/vendors', d),
  toggleVendor:(id, a) => api.put(`/api/v1/vendors/${id}/status?active=${a}`),
  deleteVendor:(id)    => api.delete(`/api/v1/vendors/${id}`),
  requestVendor:(d)    => api.post('/api/v1/vendors/request', d),
  // Mints a vendor-scoped token (the mall admin's own JWT has no shopId, so
  // order/report-service's same-shop check would 403 a direct call).
  enterVendor: (id)    => api.post(`/api/v1/vendors/${id}/enter`),
  // Public — Food Court QR Flow, no auth needed (customer scans the mall's QR)
  getPublicMall:    (id) => api.get(`/api/v1/malls/public/${id}`),
  getPublicVendors: (id) => api.get(`/api/v1/malls/public/${id}/vendors`),
  createMallQr:(id)    => api.post(`/api/v1/malls/${id}/qr-code`),
};

// ── Support ──────────────────────────────────────────────────────────────────
export const supportApi = {
  getTickets:   (p)       => api.get('/api/v1/tickets', { params: p }),
  updateTicket: (id, s,r) => api.put(`/api/v1/tickets/${id}/status?status=${s}&resolution=${r||''}`),
  createTicket: (d)       => api.post('/api/v1/tickets', d),
  getStats:     ()        => api.get('/api/v1/tickets/stats'),
  impersonate:  (body)    => api.post('/api/v1/support/impersonate', body),
};

// ── Subscription Plans (public listing + ADMIN management) ──────────────────
export const planApi = {
  listPublic:   (vertical) => api.get('/api/v1/plans/public', { params: vertical ? { vertical } : {} }),
  listAdmin:    ()         => api.get('/api/v1/plans'),
  create:       (d)        => api.post('/api/v1/plans', d),
  update:       (id, d)    => api.put(`/api/v1/plans/${id}`, d),
  toggleActive: (id, a)    => api.put(`/api/v1/plans/${id}/active?active=${a}`),
};

// ── Discount Offers (public listing + ADMIN management) ─────────────────────
export const offerApi = {
  listActive:   () => api.get('/api/v1/offers/public'),
  listAdmin:    () => api.get('/api/v1/offers'),
  create:       (d) => api.post('/api/v1/offers', d),
  update:       (id, d) => api.put(`/api/v1/offers/${id}`, d),
  toggleActive: (id, a) => api.put(`/api/v1/offers/${id}/active?active=${a}`),
  remove:       (id) => api.delete(`/api/v1/offers/${id}`),
};

// ── Notifications ────────────────────────────────────────────────────────────
export const notifApi = {
  getAll:    () => api.get('/api/v1/notifications'),
  getCount:  () => api.get('/api/v1/notifications/unread-count'),
  markRead:  (id) => api.put(`/api/v1/notifications/${id}/read`),
};

export default api;
