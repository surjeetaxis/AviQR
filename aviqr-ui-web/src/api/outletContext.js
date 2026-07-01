// Tracks which hotel outlet (if any) the current session is "inside" so that
// reused shop-owner API calls can be scoped to that outlet's shop instead of
// the logged-in user's own shop. Plain module state (not React state) so it
// can be read from plain api wrapper functions outside the component tree.
let activeOutletId = null;
let activeShopId = null;

export const setActiveOutlet = (outletId, shopId) => {
  activeOutletId = outletId;
  activeShopId = shopId;
};

export const clearActiveOutlet = () => {
  activeOutletId = null;
  activeShopId = null;
};

export const getActiveOutletId = () => activeOutletId;
export const getActiveShopId = () => activeShopId;
