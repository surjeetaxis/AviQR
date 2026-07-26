import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { orderApi, reviewApi } from '../../../../src/api/index.js';
import { useAuth } from '../../../../src/context/AuthContext.js';
import { PageHeader } from '../../../../src/components/common/PageHeader.js';
import { OrderCodePanel } from '../../../../src/components/common/OrderCodePanel.js';
import { BottomSheet } from '../../../../src/components/common/BottomSheet.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../../src/theme/index.js';

const STATUS_COLOR = { PENDING_PAYMENT: '#D97706', NEW: '#F59E0B', ACCEPTED: '#2563EB', PREPARING: '#2563EB', READY: '#059669', COMPLETED: '#6B7280', CANCELLED: '#DC2626', REJECTED: '#DC2626' };
const PROGRESS_STEPS = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

export default function CustomerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [rateOpen, setRateOpen]   = useState(false);
  const [rating, setRating]       = useState(0);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview]   = useState(null); // { rating } once submitted this session

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

  const submitReview = async () => {
    if (rating < 1) return Alert.alert('Pick a rating', 'Tap a star to rate your order.');
    setSubmitting(true);
    try {
      await reviewApi.submit({
        shopId: order.shopId,
        orderId: order.id,
        customerName: user?.name || 'Guest',
        rating,
        comment: comment.trim() || undefined,
      });
      setMyReview({ rating });
      setRateOpen(false);
    } catch (e) {
      Alert.alert('Could not submit rating', e.response?.data?.message || 'Please try again.');
    } finally { setSubmitting(false); }
  };

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

        {order.type === 'DINE_IN' && order.tableNumber && (
          <TouchableOpacity style={ss.menuLink} onPress={() => router.push({ pathname: `/(customer)/shop/bill/${order.tableNumber}`, params: { shopId: order.shopId } })}>
            <Text style={ss.menuLinkTxt}>View & pay table bill</Text>
            <Text style={{ fontSize: 16, color: Colors.gray400 }}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={ss.menuLink} onPress={() => router.push({ pathname: '/(customer)/shop/menu', params: { shopId: order.shopId } })}>
          <Text style={ss.menuLinkTxt}>View shop menu</Text>
          <Text style={{ fontSize: 16, color: Colors.gray400 }}>›</Text>
        </TouchableOpacity>

        {order.status === 'COMPLETED' && (
          myReview ? (
            <View style={ss.ratedBanner}>
              <Text style={ss.ratedTxt}>Thanks for your feedback — you rated this order {'★'.repeat(myReview.rating)}{'☆'.repeat(5 - myReview.rating)}</Text>
            </View>
          ) : (
            <TouchableOpacity style={ss.rateBtn} onPress={() => setRateOpen(true)}>
              <Text style={ss.rateBtnTxt}>⭐ Rate this order</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <BottomSheet visible={rateOpen} onClose={() => setRateOpen(false)} height={340}>
        <Text style={ss.sheetTitle}>Rate your order</Text>
        <View style={ss.starRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Text style={ss.starIcon}>{n <= rating ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={ss.commentInput}
          placeholder="Tell us more (optional)…"
          placeholderTextColor={Colors.gray400}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <TouchableOpacity style={ss.submitBtn} onPress={submitReview} disabled={submitting}>
          <Text style={ss.submitBtnTxt}>{submitting ? 'Submitting…' : 'Submit rating'}</Text>
        </TouchableOpacity>
      </BottomSheet>
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
  rateBtn: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 14, marginTop: 12 },
  rateBtnTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  ratedBanner: { backgroundColor: '#F0FDF4', borderRadius: Radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  ratedTxt: { fontSize: FontSize.sm, fontWeight: '600', color: '#166534', textAlign: 'center' },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, marginBottom: 16, textAlign: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
  starIcon: { fontSize: 34, color: '#F59E0B' },
  commentInput: { height: 80, borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md, padding: 12, fontSize: FontSize.sm, color: Colors.gray900, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 14 },
  submitBtnTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
