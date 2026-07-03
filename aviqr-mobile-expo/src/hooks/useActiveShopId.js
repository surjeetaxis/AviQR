import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext.js';
import { hotelOutletApi } from '../api/index.js';
import { setActiveOutlet, clearActiveOutlet } from '../api/outletContext.js';

// Resolves the shopId a reused shop-owner screen should operate on:
// - mounted under /(hotel)/outlets/[outletId]/*    -> resolves the outlet's linked shop
// - mounted under /(supplier)/shops/[shopId]/*      -> uses the shopId route param directly
// - otherwise (the plain (owner) tabs)              -> the logged-in shop owner's own shopId
export function useActiveShopId() {
  const { user } = useAuth();
  const { outletId, shopId: routeShopId } = useLocalSearchParams();
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

  return outletShopId || routeShopId || user?.shopId;
}
