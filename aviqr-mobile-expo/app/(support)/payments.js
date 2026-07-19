import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { paymentApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const PAY_CLR = { CAPTURED: '#059669', PENDING: '#D97706', FAILED: '#DC2626', REFUNDED: '#6B7280' };
const PAY_BG  = { CAPTURED: '#DCFCE7', PENDING: '#FEF3C7', FAILED: '#FEE2E2', REFUNDED: '#F3F4F6' };

// Support agents don't have platform-wide payment visibility (only ADMIN does);
// they look up a specific customer's payment history to investigate a ticket —
// same scoping as web's SupportPaymentsPanel.
export default function SupportPaymentsScreen() {
  const [customerId, setCustomerId] = useState('');
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!customerId.trim()) return;
    setLoading(true); setError(''); setPayments(null);
    try {
      const res = await paymentApi.getByCustomer(customerId.trim(), { size: 50 });
      const d = res.data.data;
      setPayments(Array.isArray(d) ? d : d?.content || []);
    } catch (e) { setError(e.response?.data?.message || 'Could not load payments for this customer.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Payments" />
      <View style={ss.searchBox}>
        <Text style={ss.hint}>Look up a customer's payment history to investigate a ticket</Text>
        <Input placeholder="Customer ID (from the ticket)…" value={customerId} onChangeText={setCustomerId} />
        <Button title={loading ? 'Searching…' : '🔍 Look up'} onPress={search} loading={loading} />
      </View>

      {error ? <Text style={ss.error}>⚠ {error}</Text> : null}

      <FlatList
        data={payments || []}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={payments && !loading ? <EmptyState icon="💳" title="No payments found for this customer" /> : null}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.paymentId}>{item.paymentId || item.id?.slice(0, 12)}</Text>
              <Text style={ss.sub}>Order {item.orderId?.slice(0, 8)}… · {item.gateway || 'RAZORPAY'}</Text>
              <Text style={ss.date}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
              <View style={[ss.badge, { backgroundColor: PAY_BG[item.status] || '#F3F4F6' }]}><Text style={[ss.badgeTxt, { color: PAY_CLR[item.status] || '#6B7280' }]}>{item.status}</Text></View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  searchBox: { padding: Spacing.base, gap: 4 },
  hint: { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 8 },
  error: { color: '#DC2626', fontSize: FontSize.sm, paddingHorizontal: Spacing.base, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  paymentId: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
