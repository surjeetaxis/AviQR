import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { paymentApi } from '../../src/api/index.js';
import { useShopNameMap } from '../../src/hooks/useShopNameMap.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUSES = ['', 'PENDING', 'CAPTURED', 'PAID', 'FAILED', 'REFUNDED', 'CASH'];
const STATUS_CLR = { PENDING: '#D97706', CAPTURED: '#059669', PAID: '#059669', FAILED: '#DC2626', REFUNDED: '#6B7280', CASH: '#7C3AED' };
const STATUS_BG  = { PENDING: '#FEF3C7', CAPTURED: '#DCFCE7', PAID: '#DCFCE7', FAILED: '#FEE2E2', REFUNDED: '#F3F4F6', CASH: '#EDE9FE' };

export default function AdminPaymentsScreen() {
  const [payments, setPayments] = useState([]);
  const [statF, setStatF]       = useState('');
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [offline, setOffline]   = useState(false);
  const [refreshing, setRef]    = useState(false);
  const shopNames = useShopNameMap();

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const res = await paymentApi.listAll({ page: pg, size: 30 });
      const d = res.data.data;
      setPayments(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const filtered = statF ? payments.filter(p => p.status === statF) : payments;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Payments · ${filtered.length}`} />
      {offline && <OfflineBadge onRetry={() => load(page)} />}
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={STATUSES} keyExtractor={s => s || 'all'}
        style={ss.chipList}
        renderItem={({ item: s }) => (
          <TouchableOpacity style={[ss.chip, statF === s && ss.chipActive]} onPress={() => setStatF(s)}>
            <Text style={[ss.chipTxt, statF === s && ss.chipActiveTxt]}>{s || 'All'}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(0); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="💳" title="No payments found" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.paymentId}>{item.paymentId || item.id?.slice(0, 12)}</Text>
              <Text style={ss.sub}>{shopNames[item.shopId] || '—'} · {item.gateway || 'RAZORPAY'}</Text>
              <Text style={ss.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
              <View style={[ss.badge, { backgroundColor: STATUS_BG[item.status] || '#F3F4F6' }]}>
                <Text style={[ss.badgeTxt, { color: STATUS_CLR[item.status] || '#6B7280' }]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
      <View style={ss.pager}>
        <TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)} style={[ss.pageBtn, page === 0 && { opacity: 0.4 }]}><Text style={ss.pageBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <Text style={ss.pageLabel}>Page {page + 1}</Text>
        <TouchableOpacity onPress={() => load(page + 1)} style={ss.pageBtn}><Text style={ss.pageBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  chipList: { paddingHorizontal: Spacing.base, paddingVertical: 8 },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 6 },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  paymentId: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pageBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  pageLabel: { fontSize: FontSize.xs, color: Colors.gray500 },
});
