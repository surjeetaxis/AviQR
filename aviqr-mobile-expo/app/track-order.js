import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { orderApi } from '../src/api/index.js';
import { OrderCodePanel } from '../src/components/common/OrderCodePanel.js';
import { PageHeader } from '../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../src/theme/index.js';

const STATUS_COLOR = { PENDING_PAYMENT: '#D97706', NEW: '#F59E0B', ACCEPTED: '#2563EB', PREPARING: '#2563EB', READY: '#059669', COMPLETED: '#6B7280', CANCELLED: '#DC2626', REJECTED: '#DC2626' };
const PROGRESS_STEPS = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

// Ungrouped top-level screen (like about.js/contact.js) — reachable without
// being in any role folder, for a guest who ordered without an account and
// wants to check status again after closing the app.
export default function TrackOrderScreen() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async () => {
    if (!orderNumber.trim() || !phone.trim()) { setError('Enter both your order number and phone number.'); return; }
    setLoading(true); setError('');
    try {
      const res = await orderApi.lookupPublic(orderNumber.trim(), phone.trim());
      setOrder(res.data.data);
    } catch {
      setOrder(null);
      setError("We couldn't find that order — check your order number and phone number and try again.");
    } finally { setLoading(false); }
  };

  const statusColor = order ? (STATUS_COLOR[order.status] || '#6B7280') : null;
  const stepIndex = order ? PROGRESS_STEPS.indexOf(order.status) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Track your order" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <View style={ss.card}>
          <Text style={ss.label}>Order number</Text>
          <TextInput
            style={ss.input}
            placeholder="ORD-1785085857568"
            placeholderTextColor={Colors.gray400}
            value={orderNumber}
            onChangeText={setOrderNumber}
            autoCapitalize="characters"
          />
          <Text style={[ss.label, { marginTop: 12 }]}>Phone number used at checkout</Text>
          <TextInput
            style={ss.input}
            placeholder="9876543210"
            placeholderTextColor={Colors.gray400}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {!!error && <Text style={ss.error}>{error}</Text>}
          <TouchableOpacity style={ss.submitBtn} onPress={lookup} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={ss.submitBtnTxt}>Check status</Text>}
          </TouchableOpacity>
        </View>

        {order && (
          <>
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
              <View style={[ss.itemRow, { borderBottomWidth: 0 }]}>
                <Text style={ss.totalLabel}>Total</Text>
                <Text style={ss.totalLabel}>₹{order.totalAmount}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 16, ...Shadow.sm },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md, padding: 12, fontSize: FontSize.base, color: Colors.gray900 },
  error: { color: '#DC2626', fontSize: FontSize.sm, marginTop: 10 },
  submitBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 14, marginTop: 16, height: 48 },
  submitBtnTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.md, padding: 14, marginBottom: 16 },
  statusTxt: { fontSize: FontSize.base, fontWeight: '800' },
  placedAt: { fontSize: FontSize.xs, color: Colors.gray500 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gray200, marginBottom: 4 },
  progressLabel: { fontSize: 9, color: Colors.gray400, textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  itemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  itemMeta: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  totalLabel: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
});
