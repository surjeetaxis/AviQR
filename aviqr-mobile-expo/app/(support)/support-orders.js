import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { orderApi } from '../../src/api/index.js';
import { useShopNameMap } from '../../src/hooks/useShopNameMap.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUS_CLR = { PENDING: '#D97706', ACCEPTED: '#2563EB', PREPARING: '#7C3AED', READY: '#059669', DELIVERED: '#059669', CANCELLED: '#DC2626', COMPLETED: '#059669' };
const STATUS_BG  = { PENDING: '#FEF3C7', ACCEPTED: '#DBEAFE', PREPARING: '#EDE9FE', READY: '#DCFCE7', DELIVERED: '#DCFCE7', CANCELLED: '#FEE2E2', COMPLETED: '#DCFCE7' };
const PAY_CLR = { PAID: '#059669', PENDING: '#D97706', FAILED: '#DC2626', REFUNDED: '#6B7280', CASH: '#7C3AED' };

// Support's Orders view is read-only — investigating a ticket, not managing
// the platform (unlike Admin's Orders, which is the same view-only list plus
// no admin-only actions here either, matching web's OrdersPanel exactly).
export default function SupportOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef] = useState(false);
  const shopNames = useShopNameMap();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.listAll({ page: 0, size: 50 });
      const d = res.data.data;
      setOrders(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => !search || [o.orderNumber, o.customerName, o.customerPhone].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Orders · ${filtered.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <View style={ss.controls}><Input placeholder="Order #, shop, customer…" value={search} onChangeText={setSearch} /></View>
      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🧾" title="No orders found" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.orderNum}>#{item.orderNumber}</Text>
              <Text style={ss.sub}>{shopNames[item.shopId] || '—'} · {item.customerName || 'Walk-in'}</Text>
              <View style={ss.metaRow}>
                <View style={[ss.badge, { backgroundColor: STATUS_BG[item.status] || '#F3F4F6' }]}><Text style={[ss.badgeTxt, { color: STATUS_CLR[item.status] || '#6B7280' }]}>{item.status}</Text></View>
                <Text style={[ss.payTxt, { color: PAY_CLR[item.paymentStatus] || '#6B7280' }]}>{item.paymentStatus || '—'}</Text>
              </View>
            </View>
            <Text style={ss.amount}>₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  controls: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  payTxt: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
});
