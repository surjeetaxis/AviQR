import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext.js';
import { hotelOutletApi } from '../api/index.js';
import { setActiveOutlet, clearActiveOutlet } from '../api/outletContext.js';

// Resolves the shopId a reused shop-owner screen should operate on: when
// mounted under /(hotel)/outlets/[outletId]/*, resolves the outlet's linked
// shop; otherwise falls back to the logged-in shop owner's own shopId
// (unchanged behavior for the plain (owner) tabs).
export function useActiveShopId() {
  const { user } = useAuth();
  const { outletId } = useLocalSearchParams();
  const [outletShopId, setOutletShopId] = useState(null);

  useEffect(() => {
    if (!outletId) { clearActiveOutlet(); setOutletShopId(null); return; }
    let cancelled = false;
    hotelOutletApi.getById(outletId)
      .then((res) => {
        if (cancelled) return;
        const o = res.data.data;
        setActiveOutlet(o.id, o.shopId);
        setOutletShopId(o.shopId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearActiveOutlet();
    };
  }, [outletId]);

  return outletShopId || user?.shopId;
}
