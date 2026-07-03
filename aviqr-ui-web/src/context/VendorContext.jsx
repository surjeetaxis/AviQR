import { createContext, useContext, useEffect, useState } from 'react';
import { mallApi } from '../api/index.js';
import { setActiveOutlet, clearActiveOutlet } from '../api/outletContext.js';

const VendorContext = createContext(null);

// Wraps the reused shop-owner QR designer when a mall admin is managing a specific
// vendor's QR codes: mints a shop-scoped token for that vendor and keeps the same
// module-level active-outlet state OutletContext uses, so qrApi calls route to the
// vendor's linked shop instead of the logged-in mall admin's own (nonexistent) shop.
// mallApi.enterVendor already returns both shopId and accessToken in one call, so
// unlike OutletProvider this doesn't need a separate getById lookup.
export function VendorProvider({ vendorId, children }) {
  const [shopId, setShopId]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    mallApi.enterVendor(vendorId)
      .then((res) => {
        if (cancelled) return;
        const { shopId: sId, accessToken } = res.data.data;
        setShopId(sId);
        setActiveOutlet(vendorId, sId, accessToken);
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      clearActiveOutlet();
    };
  }, [vendorId]);

  return (
    <VendorContext.Provider value={{ shopId, loading, error }}>
      {children}
    </VendorContext.Provider>
  );
}

export const useVendor = () => useContext(VendorContext);
