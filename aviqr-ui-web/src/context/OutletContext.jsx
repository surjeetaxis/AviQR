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

  // Every reused shop-owner page below this provider assumes a working
  // outlet+shop context and has no error handling of its own (useOutlet()
  // was previously read nowhere else in the codebase) — so a failed
  // enter() (e.g. an outlet with no linked shop yet) used to render those
  // pages anyway with every API call silently returning empty/zero data,
  // looking exactly like a real outlet that just has no activity yet
  // instead of a broken one. Block rendering here instead so the failure
  // is visible.
  if (loading) return null;
  if (error || !outlet) {
    return (
      <div style={{padding:40,textAlign:'center',color:'var(--gray-500)'}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:'var(--gray-700)'}}>Can't open this outlet</div>
        <div style={{fontSize:13}}>
          {error?.response?.data?.message || error?.message || 'This outlet has no linked shop yet — contact support to finish setting it up.'}
        </div>
      </div>
    );
  }

  return (
    <OutletContext.Provider value={{ outlet, loading, error }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useOutlet = () => useContext(OutletContext);
