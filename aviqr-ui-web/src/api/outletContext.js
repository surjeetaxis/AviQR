// Tracks which hotel outlet (if any) the current session is "inside" so that
// reused shop-owner API calls can be scoped to that outlet's shop instead of
// the logged-in user's own shop. Plain module state (not React state) so it
// can be read from plain api wrapper functions and the axios interceptor
// outside the component tree.
//
// activeToken is a short-lived JWT (minted by hotel-service after verifying
// outlet access) carrying the outlet's real shopId — used INSTEAD of the
// user's own login token while in outlet mode, so every backend service that
// authorizes off the gateway-derived X-Shop-Id header (order/menu/report/
// qr/payment/shop-service) works correctly instead of 403ing.
let activeOutletId = null;
let activeShopId = null;
let activeToken = null;

export const setActiveOutlet = (outletId, shopId, token) => {
  activeOutletId = outletId;
  activeShopId = shopId;
  activeToken = token;
};

export const clearActiveOutlet = () => {
  activeOutletId = null;
  activeShopId = null;
  activeToken = null;
};

export const getActiveOutletId = () => activeOutletId;
export const getActiveShopId = () => activeShopId;
export const getActiveToken = () => activeToken;
