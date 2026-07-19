import { useState, useEffect } from 'react';
import { shopApi } from '../api/index.js';

// Resolves shopId → shop name once per mount, so admin Orders/Payments/Suppliers
// screens can show "Spice Route" instead of a meaningless truncated UUID.
// Mirrors aviqr-ui-web's AdminDashboard.jsx useShopNameMap().
export function useShopNameMap() {
  const [names, setNames] = useState({});
  useEffect(() => {
    shopApi.listAll({ page: 0, size: 500 }).then(res => {
      const d = res.data.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setNames(Object.fromEntries(list.map(s => [s.id, s.name])));
    }).catch(() => {});
  }, []);
  return names;
}
