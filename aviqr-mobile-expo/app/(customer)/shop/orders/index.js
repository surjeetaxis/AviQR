import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderApi } from '../../../../src/api/index.js';
import { useAuth } from '../../../../src/context/AuthContext.js';
import { PageHeader } from '../../../../src/components/common/PageHeader.js';
import { EmptyState } from '../../../../src/components/common/EmptyState.js';
import { CustomerBottomNav } from '../../../../src/components/common/CustomerBottomNav.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../../src/theme/index.js';

const STATUS_COLOR = { PENDING_PAYMENT: '#D97706', NEW: '#F59E0B', ACCEPTED: '#2563EB', PREPARING: '#2563EB', READY: '#059669', COMPLETED: '#6B7280', CANCELLED: '#DC2626', REJECTED: '#DC2626' };

// Wires the backend's GET /api/v1/orders/customer/history — keyed by the
// customer's own login (X-User-Id from their JWT), across every shop they've
// ordered from. Auto-refreshes every 5s so a status change made by the shop
// (accepted/preparing/ready) shows up without leaving and re-entering.
export default function CustomerOrdersScreen() {
  const { user } = useAuth();
  const { shopId } = useLocalSearchParams();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Bottom nav is shared across every customer screen (menu/orders/profile)
  // so it doesn't disappear just because you're not on the menu screen —
  // it previously only rendered on menu.js.
  const handleTabChange = (key) => {
    if (key === 'orders') return; // already here
    if (key === 'profile') return router.push(shopId ? { pathname: '/(customer)/shop/profile', params: { shopId } } : '/(customer)/shop/profile');
    // home/search/cart all live on the menu screen — this screen has no
    // shop context of its own beyond whichever shop the customer arrived
    // from (if any).
    router.push(shopId ? { pathname: '/(customer)/shop/menu', params: { shopId } } : '/(customer)/shop/menu');
  };

  const load = useCallback(() => {
    return orderApi.getHistory({ page: 0, size: 20 })
      .then(res => { setOrders(res.data.data?.content || res.data.data || []); setError(''); })
      .catch(() => setError('Could not load your orders.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <PageHeader title="My Orders" />
        <EmptyState icon="🔑" title="Log in to see your orders" subtitle="Order history is tied to your account" />
        <CustomerBottomNav activeTab="orders" onChangeTab={handleTabChange} cartCount={0} pageBackground={Colors.background} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="My Orders" />
      {loading ? (
        <Text style={ss.loading}>Loading orders…</Text>
      ) : error ? (
        <Text style={ss.error}>{error}</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon="📦" title="No orders yet" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={ss.card} onPress={() => router.push(`/(customer)/shop/orders/${item.id}`)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={ss.orderNum}>#{item.orderNumber || item.id?.slice(0, 8)}</Text>
                <Text style={ss.sub}>{(item.items || []).length} item{(item.items || []).length !== 1 ? 's' : ''} · ₹{item.totalAmount}</Text>
                <Text style={ss.time}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </View>
              <View style={[ss.badge, { backgroundColor: (STATUS_COLOR[item.status] || '#6B7280') + '22' }]}>
                <Text style={[ss.badgeTxt, { color: STATUS_COLOR[item.status] || '#6B7280' }]}>{item.status}</Text>
              </View>
              <Text style={ss.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <CustomerBottomNav activeTab="orders" onChangeTab={handleTabChange} cartCount={0} pageBackground={Colors.background} />
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  error: { textAlign: 'center', color: '#DC2626', paddingVertical: 40, paddingHorizontal: 30 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  time: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 18, color: Colors.gray300 },
});
