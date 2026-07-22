import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { mallApi, orderApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUS_CLR = { NEW: '#2563EB', PREPARING: '#D97706', READY: '#059669', COMPLETED: '#6B7280', CANCELLED: '#DC2626' };

// Cross-vendor order feed. The mall admin's own login has no shopId, so a
// direct order-service call would 403 — mint a vendor-scoped token per vendor
// via mallApi.enterVendor first, same pattern the web app uses.
export default function MallOrdersScreen() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [vendorCount, setVendorCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mallsRes = await mallApi.getMyMalls();
      const malls = mallsRes.data.data || [];
      if (!malls.length) { setOrders([]); setOffline(false); return; }
      const vendorsRes = await mallApi.getVendors(malls[0].id);
      const vendors = (vendorsRes.data.data || []).filter(v => v.shopId);
      setVendorCount(vendors.length);
      const results = await Promise.all(vendors.map(v =>
        mallApi.enterVendor(v.id)
          .then(res => orderApi.getAll(v.shopId, { page: 0, size: 20 }, res.data.data.accessToken))
          .then(res => (res.data.data?.content || res.data.data || []).map(o => ({ ...o, vendorName: v.name })))
          .catch(() => [])
      ));
      setOrders(results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Orders · ${orders.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <Text style={ss.subheading}>{orders.length} orders across {vendorCount} linked vendors</Text>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🧾" title="No orders yet" subtitle="Orders from your vendors' shops will appear here" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.orderNum}>#{String(item.id).slice(-6)}</Text>
              <Text style={ss.sub}>{item.vendorName} · Table {item.tableNumber || '—'}</Text>
              <Text style={ss.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</Text>
              <View style={[ss.badge, { backgroundColor: (STATUS_CLR[item.status] || '#6B7280') + '22' }]}><Text style={[ss.badgeTxt, { color: STATUS_CLR[item.status] || '#6B7280' }]}>{item.status}</Text></View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  subheading: { fontSize: FontSize.xs, color: Colors.gray400, paddingHorizontal: Spacing.base, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, fontFamily: 'monospace' },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  time: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
