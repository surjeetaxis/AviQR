import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share, StyleSheet, Alert } from 'react-native';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import { reportApi, invoiceApi, paymentApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { confirmAction } from '../../src/utils/confirmAction.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const REFUNDABLE_PAYMENT_STATUSES = ['PAID', 'CAPTURED'];

const TYPES = ['', 'DINE_IN', 'TAKEAWAY', 'DELIVERY'];
const STATUSES = ['', 'NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED'];
const STATUS_COLOR = { COMPLETED: '#1D9E75', CANCELLED: '#DC2626', REJECTED: '#DC2626', NEW: '#2563EB', PREPARING: '#7C3AED', READY: '#D97706' };

// Searchable order archive with invoice printing — the backend endpoint
// (report-service's raw SQL query) returns snake_case column names directly
// (order_number, customer_name, total_amount, created_at, ...), unlike the
// camelCase JSON everywhere else in the app.
export default function OrderHistoryScreen() {
  const shopId = useActiveShopId();
  const [orders, setOrders]   = useState([]);
  const [search, setSearch]   = useState('');
  const [typeF, setTypeF]     = useState('');
  const [statusF, setStatusF] = useState('');
  const [page, setPage]       = useState(0);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async (p = 0) => {
    if (!shopId) return;
    setLoading(true);
    try {
      const params = { page: p, size: 20 };
      if (typeF) params.type = typeF;
      if (statusF) params.status = statusF;
      const res = await reportApi.getHistory(shopId, params);
      const d = res.data.data || {};
      setOrders(d.content || []);
      setTotal(d.totalElements || 0);
      setPage(p);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [shopId, typeF, statusF]);

  useEffect(() => { load(0); }, [load]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q);
  });

  const printInvoice = async (orderId) => {
    try { const res = await invoiceApi.getInvoiceHtml(orderId); await Print.printAsync({ html: res.data }); }
    catch { Alert.alert('Print failed', 'Could not load the invoice.'); }
  };

  const refundOrder = () => confirmAction(
    'Refund this order?',
    `₹${Number(selected.total_amount || 0).toLocaleString('en-IN')} will be refunded to the customer via Razorpay.`,
    async () => {
      setRefunding(true);
      try {
        const res = await paymentApi.getByShop(shopId, { size: 200 });
        const list = res.data.data?.content || res.data.data || [];
        const payment = list.find(p => p.orderId === selected.id);
        if (!payment) { Alert.alert('No payment record found', 'Could not find a matching online payment for this order.'); return; }
        await paymentApi.refund(payment.paymentId);
        Alert.alert('Refund initiated', 'The customer will be refunded by Razorpay.');
        setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, payment_status: 'REFUNDED' } : o));
        setSelected(prev => prev ? { ...prev, payment_status: 'REFUNDED' } : prev);
      } catch { Alert.alert('Refund failed', 'Please try again or process it from the web dashboard.'); }
      finally { setRefunding(false); }
    },
    'Refund'
  );

  const exportCsv = async () => {
    const rows = [['Order #', 'Date', 'Customer', 'Phone', 'Type', 'Status', 'Payment', 'Amount'], ...orders.map(o => [o.order_number, o.created_at?.slice(0, 10), o.customer_name, o.customer_phone, o.type, o.status, o.payment_method, o.total_amount])];
    const csv = rows.map(r => r.join(',')).join('\n');
    try { await Share.share({ message: csv, title: 'Order History' }); } catch {}
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Order History</Text>
        <TouchableOpacity style={{ padding: 8 }} onPress={exportCsv}><Text style={{ fontSize: 16 }}>⬇️</Text></TouchableOpacity>
      </View>
      {offline && <OfflineBadge onRetry={() => load(page)} />}
      <View style={ss.controls}>
        <Input placeholder="Order #, customer, phone…" value={search} onChangeText={setSearch} style={{ marginBottom: 8 }} />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={TYPES} keyExtractor={t => t || 'all'} style={{ marginBottom: 8 }}
          renderItem={({ item: t }) => (
            <TouchableOpacity style={[ss.chip, typeF === t && ss.chipActive]} onPress={() => setTypeF(t)}>
              <Text style={[ss.chipTxt, typeF === t && ss.chipActiveTxt]}>{t || 'All Types'}</Text>
            </TouchableOpacity>
          )}
        />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={STATUSES} keyExtractor={s => s || 'all'}
          renderItem={({ item: s }) => (
            <TouchableOpacity style={[ss.chip, statusF === s && ss.chipActive]} onPress={() => setStatusF(s)}>
              <Text style={[ss.chipTxt, statusF === s && ss.chipActiveTxt]}>{s || 'All Status'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 20 }}
        ListEmptyComponent={!loading && <EmptyState icon="🧾" title="No orders found" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => setSelected(item)}>
            <View style={{ flex: 1 }}>
              <Text style={ss.orderNum}>#{item.order_number}</Text>
              <Text style={ss.sub}>{item.customer_name || 'Walk-in'} · {item.type}</Text>
              <Text style={ss.time}>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.total_amount || 0).toLocaleString('en-IN')}</Text>
              <View style={[ss.badge, { backgroundColor: (STATUS_COLOR[item.status] || '#6B7280') + '22' }]}><Text style={[ss.badgeTxt, { color: STATUS_COLOR[item.status] || '#6B7280' }]}>{item.status}</Text></View>
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={ss.pager}>
        <TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)} style={[ss.pageBtn, page === 0 && { opacity: 0.4 }]}><Text style={ss.pageBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <Text style={ss.pageLabel}>Page {page + 1} · {total} total</Text>
        <TouchableOpacity onPress={() => load(page + 1)} style={ss.pageBtn}><Text style={ss.pageBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>#{selected.order_number}</Text>
            {[
              ['Customer', selected.customer_name], ['Phone', selected.customer_phone], ['Table', selected.table_number || '—'],
              ['Type', selected.type], ['Status', selected.status], ['Payment', `${selected.payment_method || '—'} · ${selected.payment_status || '—'}`],
              ['Subtotal', `₹${Number(selected.subtotal || 0).toLocaleString('en-IN')}`], ['Tax', `₹${Number(selected.tax || 0).toLocaleString('en-IN')}`],
              ['Total', `₹${Number(selected.total_amount || 0).toLocaleString('en-IN')}`],
              ['Placed', selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'],
            ].map(([label, value]) => (
              <View key={label} style={ss.fieldRow}><Text style={ss.fieldLabel}>{label}</Text><Text style={ss.fieldValue} numberOfLines={1}>{String(value ?? '—')}</Text></View>
            ))}
            <TouchableOpacity style={ss.printBtn} onPress={() => printInvoice(selected.id)}><Text style={ss.printTxt}>🧾 Print Invoice</Text></TouchableOpacity>
            {selected.payment_method === 'ONLINE' && REFUNDABLE_PAYMENT_STATUSES.includes(selected.payment_status) && (
              <TouchableOpacity style={ss.refundBtn} disabled={refunding} onPress={refundOrder}>
                <Text style={ss.refundTxt}>{refunding ? 'Processing…' : '↩ Refund Order'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  controls: { padding: Spacing.base, paddingBottom: 0 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 6 },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, fontFamily: 'monospace' },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  time: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pageBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  pageLabel: { fontSize: FontSize.xs, color: Colors.gray500 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
  printBtn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  printTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  refundBtn: { marginTop: 10, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  refundTxt: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
});
