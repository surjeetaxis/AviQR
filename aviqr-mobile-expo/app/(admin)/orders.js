import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { orderApi } from '../../src/api/index.js';
import { useShopNameMap } from '../../src/hooks/useShopNameMap.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STATUSES = ['', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const STATUS_CLR = { PENDING: '#D97706', ACCEPTED: '#2563EB', PREPARING: '#7C3AED', READY: '#059669', DELIVERED: '#059669', CANCELLED: '#DC2626', COMPLETED: '#059669' };
const STATUS_BG  = { PENDING: '#FEF3C7', ACCEPTED: '#DBEAFE', PREPARING: '#EDE9FE', READY: '#DCFCE7', DELIVERED: '#DCFCE7', CANCELLED: '#FEE2E2', COMPLETED: '#DCFCE7' };

export default function AdminOrdersScreen() {
  const [orders, setOrders]   = useState([]);
  const [search, setSearch]   = useState('');
  const [statF, setStatF]     = useState('');
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewLoad, setViewLoad] = useState(false);
  const shopNames = useShopNameMap();

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const res = await orderApi.listAll({ page: pg, size: 30 });
      const d = res.data.data;
      setOrders(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const openView = async (o) => {
    setSelected(o); setViewLoad(true);
    try {
      const res = await orderApi.getById(o.id);
      setSelected(res.data.data || o);
    } catch {}
    finally { setViewLoad(false); }
  };

  const filtered = orders.filter(o => {
    if (statF && o.status !== statF) return false;
    if (search) {
      const q = search.toLowerCase();
      return [o.orderNumber, o.customerName, o.customerPhone].some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Orders · ${filtered.length}`} />
      {offline && <OfflineBadge onRetry={() => load(page)} />}
      <View style={ss.controls}>
        <Input placeholder="Order #, customer…" value={search} onChangeText={setSearch} />
      </View>
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
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(0); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🧾" title="No orders found" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openView(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={ss.orderNum}>#{item.orderNumber}</Text>
              <Text style={ss.sub}>{shopNames[item.shopId] || '—'} · {item.customerName || 'Walk-in'}</Text>
              <Text style={ss.type}>{item.type || '—'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={ss.amount}>₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</Text>
              <View style={[ss.badge, { backgroundColor: STATUS_BG[item.status] || '#F3F4F6' }]}>
                <Text style={[ss.badgeTxt, { color: STATUS_CLR[item.status] || '#6B7280' }]}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={ss.pager}>
        <TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)} style={[ss.pageBtn, page === 0 && { opacity: 0.4 }]}><Text style={ss.pageBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <Text style={ss.pageLabel}>Page {page + 1}</Text>
        <TouchableOpacity onPress={() => load(page + 1)} style={ss.pageBtn}><Text style={ss.pageBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={560}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>#{selected.orderNumber}</Text>
            {viewLoad && <Text style={{ color: Colors.gray400, fontSize: FontSize.xs, marginBottom: 8 }}>Loading full order…</Text>}
            {[
              ['Shop', shopNames[selected.shopId] || selected.shopId], ['Customer', selected.customerName], ['Phone', selected.customerPhone],
              ['Table', selected.tableNumber || '—'], ['Type', selected.type], ['Status', selected.status],
              ['Payment', `${selected.paymentMethod || '—'} · ${selected.paymentStatus || '—'}`],
              ['Subtotal', `₹${Number(selected.subtotal || 0).toLocaleString('en-IN')}`],
              ['Tax', `₹${Number(selected.tax || 0).toLocaleString('en-IN')}`],
              ['Total', `₹${Number(selected.totalAmount || 0).toLocaleString('en-IN')}`],
              ['Placed', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
            ].map(([label, value]) => (
              <View key={label} style={ss.fieldRow}>
                <Text style={ss.fieldLabel}>{label}</Text>
                <Text style={ss.fieldValue} numberOfLines={1}>{String(value ?? '—')}</Text>
              </View>
            ))}
            <Text style={ss.sectionLabel}>ITEMS</Text>
            {Array.isArray(selected.items) && selected.items.length > 0 ? selected.items.map((it, i) => (
              <View key={i} style={ss.itemRow}>
                <Text style={ss.itemName}>{it.itemName || it.name} ×{it.quantity}</Text>
                <Text style={ss.itemPrice}>₹{Number(it.totalPrice || 0).toLocaleString('en-IN')}</Text>
              </View>
            )) : <Text style={ss.noShop}>No items on this order.</Text>}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  controls: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  chipList: { paddingHorizontal: Spacing.base, paddingVertical: 8 },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 6 },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  type: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pageBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  pageLabel: { fontSize: FontSize.xs, color: Colors.gray500 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.gray400, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  noShop: { fontSize: FontSize.sm, color: Colors.gray400 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { fontSize: FontSize.sm, color: Colors.gray700 },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
});
