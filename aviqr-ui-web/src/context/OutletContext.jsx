import { createContext, useContext, useEffect, useState } from 'react';
import { hotelOutletApi } from '../api/index.js';
import { setActiveOutlet, clearActiveOutlet } from '../api/outletContext.js';

const OutletContext = createContext(null);

// Wraps the reused shop-owner pages when a hotel owner is managing a specific
// outlet: resolves the outlet once (giving its linked shopId) and keeps the
// module-level active-outlet state in sync so shopApi/loyaltyApi calls route
// to that outlet's shop instead of the logged-in user's own shop.
export function OutletProvider({ outletId, children }) {
  const [outlet, setOutlet]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([hotelOutletApi.getById(outletId), hotelOutletApi.enter(outletId)])
      .then(([outletRes, enterRes]) => {
        if (cancelled) return;
        const o = outletRes.data.data;
        const { accessToken } = enterRes.data.data;
        setOutlet(o);
        setActiveOutlet(o.id, o.shopId, accessToken);
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      clearActiveOutlet();
    };
  }, [outletId]);

  return (
    <OutletContext.Provider value={{ outlet, loading, error }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useOutlet = () => useContext(OutletContext);
