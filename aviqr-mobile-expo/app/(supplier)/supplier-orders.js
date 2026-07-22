import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { shopApi, orderApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUS_CLR = { PENDING: '#D97706', PREPARING: '#2563EB', READY: '#059669', DELIVERED: '#6B7280', CANCELLED: '#DC2626' };

export default function SupplierOrdersScreen() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [outletCount, setOutletCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await shopApi.getMyShops();
        const outlets = res.data.data || [];
        setOutletCount(outlets.length);
        const results = await Promise.all(outlets.map(o =>
          orderApi.getAll(o.id, { page: 0, size: 20 })
            .then(res => (res.data.data?.content || res.data.data || []).map(ord => ({ ...ord, outletName: o.name })))
            .catch(() => [])
        ));
        setOrders(results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setOffline(false);
      } catch { setOffline(true); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Orders · ${orders.length}`} />
      {offline && <OfflineBadge />}
      <Text style={ss.subheading}>{orders.length} orders across {outletCount} outlets</Text>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="🧾" title="No orders yet" subtitle="Orders from all your outlets will appear here" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.orderNum}>#{String(item.id).slice(-6)}</Text>
              <Text style={ss.sub}>{item.outletName} · Table {item.tableNumber || item.table || '—'}</Text>
              <Text style={ss.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.totalAmount || item.total || 0).toLocaleString('en-IN')}</Text>
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
