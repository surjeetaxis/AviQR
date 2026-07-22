import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderApi } from '../../../../src/api/index.js';
import { PageHeader } from '../../../../src/components/common/PageHeader.js';
import { OrderCodePanel } from '../../../../src/components/common/OrderCodePanel.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../../src/theme/index.js';

const STATUS_COLOR = { PENDING_PAYMENT: '#D97706', NEW: '#F59E0B', ACCEPTED: '#2563EB', PREPARING: '#2563EB', READY: '#059669', COMPLETED: '#6B7280', CANCELLED: '#DC2626', REJECTED: '#DC2626' };
const PROGRESS_STEPS = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

export default function CustomerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(() => {
    return orderApi.getById(orderId)
      .then(res => { setOrder(res.data.data); setError(''); })
      .catch(() => setError('Could not load this order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Order" />
      <Text style={ss.center}>Loading order…</Text>
    </View>
  );
  if (error || !order) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Order" />
      <Text style={[ss.center, { color: '#DC2626' }]}>{error || 'Order not found.'}</Text>
    </View>
  );

  const statusColor = STATUS_COLOR[order.status] || '#6B7280';
  const stepIndex = PROGRESS_STEPS.indexOf(order.status);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`#${order.orderNumber || order.id?.slice(0, 8)}`} />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <View style={[ss.statusBanner, { backgroundColor: statusColor + '18' }]}>
          <Text style={[ss.statusTxt, { color: statusColor }]}>{order.status}</Text>
          <Text style={ss.placedAt}>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
        </View>

        {stepIndex >= 0 && (
          <View style={ss.progressRow}>
            {PROGRESS_STEPS.map((step, i) => (
              <View key={step} style={ss.progressStep}>
                <View style={[ss.progressDot, i <= stepIndex && { backgroundColor: Colors.primary }]} />
                <Text style={[ss.progressLabel, i <= stepIndex && { color: Colors.primary, fontWeight: '700' }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginBottom: 16 }}><OrderCodePanel order={order} /></View>

        <Text style={ss.sectionTitle}>Items</Text>
        <View style={ss.card}>
          {(order.items || []).map((it, i) => (
            <View key={it.id || i} style={ss.itemRow}>
              <View>
                <Text style={ss.itemName}>{it.itemName}</Text>
                <Text style={ss.itemMeta}>Qty {it.quantity} · ₹{it.unitPrice}</Text>
              </View>
              <Text style={ss.itemPrice}>₹{it.totalPrice}</Text>
            </View>
          ))}
        </View>

        <Text style={ss.sectionTitle}>Bill Summary</Text>
        <View style={ss.card}>
          <View style={ss.billRow}><Text style={ss.billLabel}>Subtotal</Text><Text style={ss.billVal}>₹{order.subtotal}</Text></View>
          <View style={ss.billRow}><Text style={ss.billLabel}>Tax</Text><Text style={ss.billVal}>₹{order.tax}</Text></View>
          <View style={[ss.billRow, ss.billTotal]}><Text style={ss.totalLabel}>Total</Text><Text style={ss.totalVal}>₹{order.totalAmount}</Text></View>
        </View>

        <TouchableOpacity style={ss.menuLink} onPress={() => router.push({ pathname: '/(customer)/shop/menu', params: { shopId: order.shopId } })}>
          <Text style={ss.menuLinkTxt}>View shop menu</Text>
          <Text style={{ fontSize: 16, color: Colors.gray400 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  center: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.md, padding: 14, marginBottom: 16 },
  statusTxt: { fontSize: FontSize.base, fontWeight: '800' },
  placedAt: { fontSize: FontSize.xs, color: Colors.gray500 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gray200, marginBottom: 4 },
  progressLabel: { fontSize: 9, color: Colors.gray400, textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 8, ...Shadow.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  itemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  itemMeta: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  billLabel: { fontSize: FontSize.sm, color: Colors.gray600 },
  billVal: { fontSize: FontSize.sm, color: Colors.gray900 },
  billTotal: { borderTopWidth: 1, borderTopColor: Colors.gray100, marginTop: 6, paddingTop: 8 },
  totalLabel: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  totalVal: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  menuLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginTop: 12, ...Shadow.sm },
  menuLinkTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
});
