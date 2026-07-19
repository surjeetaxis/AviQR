import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { orderApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const COLS = [
  { status: 'NEW',       label: 'New Orders',     next: 'ACCEPTED',  color: '#2563EB', bg: '#EFF6FF', icon: '🆕' },
  { status: 'ACCEPTED',  label: 'Cooking',        next: 'PREPARING', color: '#D97706', bg: '#FFFBEB', icon: '👨‍🍳' },
  { status: 'PREPARING', label: 'Finishing',      next: 'READY',     color: '#7C3AED', bg: '#F5F3FF', icon: '⏳' },
  { status: 'READY',     label: 'Ready to Serve', next: null,        color: '#1D9E75', bg: '#ECFDF5', icon: '🔔' },
];
const TYPE_LABEL = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' };
const { width } = Dimensions.get('window');

function elapsed(ts) {
  if (!ts) return '0m';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
function elapsedMin(ts) { return ts ? Math.floor((Date.now() - new Date(ts)) / 60000) : 0; }

// Same backend calls as the web KOT board (orderApi.getLive/updateStatus) —
// just a mobile-appropriate layout: horizontal swipeable columns instead of
// a 4-wide desktop grid.
export default function KotScreen() {
  const shopId = useActiveShopId();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);
  const prevNewCount = useRef(0);

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await orderApi.getLive(shopId);
      const active = (res.data.data || []).filter(o => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status));
      setOrders(active);
    } catch {}
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 8000);
    const tickTimer = setInterval(() => setTick(t => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(tickTimer); };
  }, [load]);

  const advance = async (order, next) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    try { await orderApi.updateStatus(order.id, next); } catch { load(); }
  };
  const complete = async (order) => {
    setOrders(prev => prev.filter(o => o.id !== order.id));
    try { await orderApi.updateStatus(order.id, 'COMPLETED'); } catch { load(); }
  };
  const cancel = (order) => {
    Alert.alert('Reject order', `Reject order #${order.orderNumber || order.id?.slice(-4)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        try { await orderApi.updateStatus(order.id, 'CANCELLED'); } catch { load(); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray900 }}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>👨‍🍳 Kitchen Display</Text>
        <View style={{ width: 44 }} />
      </View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={COLS}
        keyExtractor={c => c.status}
        renderItem={({ item: col }) => {
          const colOrders = orders.filter(o => o.status === col.status);
          return (
            <View style={[ss.column, { width }]}>
              <View style={[ss.colHeader, { backgroundColor: col.bg }]}>
                <Text style={[ss.colTitle, { color: col.color }]}>{col.icon} {col.label}</Text>
                <View style={[ss.colCount, { backgroundColor: col.color }]}><Text style={ss.colCountTxt}>{colOrders.length}</Text></View>
              </View>
              <FlatList
                data={colOrders}
                keyExtractor={o => o.id}
                contentContainerStyle={{ padding: Spacing.base, gap: 10 }}
                ListEmptyComponent={<Text style={ss.emptyTxt}>No orders here</Text>}
                renderItem={({ item: order }) => {
                  const wait = elapsedMin(order.createdAt);
                  const critical = wait > 25 && col.status !== 'READY';
                  const urgent = wait > 15 && col.status !== 'READY';
                  return (
                    <View style={[ss.card, { backgroundColor: critical ? '#FFF5F5' : col.bg, borderColor: critical ? '#DC2626' : col.color + '55' }]}>
                      <View style={ss.cardTop}>
                        <View>
                          <Text style={[ss.orderNum, { color: col.color }]}>#{order.orderNumber}</Text>
                          <View style={ss.metaRow}>
                            <Text style={[ss.typeTag, { color: col.color, borderColor: col.color }]}>{TYPE_LABEL[order.type] || order.type}</Text>
                            {order.tableNumber && <Text style={[ss.tableTag, { backgroundColor: col.color }]}>T-{order.tableNumber}</Text>}
                          </View>
                        </View>
                        <Text style={[ss.waitTxt, { color: critical ? '#DC2626' : urgent ? '#D97706' : '#6B7280' }]}>
                          🕐 {elapsed(order.createdAt)}{critical ? ' 🚨' : urgent ? ' ⚠️' : ''}
                        </Text>
                      </View>
                      <View style={ss.itemsBox}>
                        {(order.items || []).map((it, i) => (
                          <View key={i} style={ss.itemRow}>
                            <Text style={[ss.itemQty, { color: col.color }]}>{it.quantity}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={ss.itemName}>{it.itemName || it.name}</Text>
                              {it.notes ? <Text style={ss.itemNote}>⚠ {it.notes}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>
                      <View style={ss.actionRow}>
                        {(col.status === 'NEW' || col.status === 'ACCEPTED') && (
                          <TouchableOpacity style={ss.rejectBtn} onPress={() => cancel(order)}><Text style={ss.rejectTxt}>✕ Reject</Text></TouchableOpacity>
                        )}
                        {col.next ? (
                          <TouchableOpacity style={[ss.advBtn, { backgroundColor: col.color }]} onPress={() => advance(order, col.next)}>
                            <Text style={ss.advTxt}>
                              {col.status === 'NEW' && '✓ Accept & Start'}
                              {col.status === 'ACCEPTED' && '👨‍🍳 Mark Finishing'}
                              {col.status === 'PREPARING' && '🔔 Mark Ready'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={[ss.advBtn, { backgroundColor: '#1D9E75' }]} onPress={() => complete(order)}>
                            <Text style={ss.advTxt}>✅ Mark Done</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.gray900 },
  back: { fontSize: FontSize.base, color: Colors.white, fontWeight: '600' },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
  column: { flex: 1, backgroundColor: Colors.background },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  colTitle: { fontSize: FontSize.base, fontWeight: '800' },
  colCount: { minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  colCountTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.sm },
  emptyTxt: { textAlign: 'center', color: Colors.gray400, marginTop: 40 },
  card: { borderRadius: Radius.lg, borderWidth: 2, padding: 14, ...Shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderNum: { fontSize: FontSize.xl, fontWeight: '900', fontFamily: 'monospace' },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' },
  typeTag: { fontSize: 10, fontWeight: '700', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.white },
  tableTag: { fontSize: 11, fontWeight: '800', color: Colors.white, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  waitTxt: { fontSize: 12, fontWeight: '700' },
  itemsBox: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', borderStyle: 'dashed', paddingTop: 8, marginBottom: 8 },
  itemRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  itemQty: { fontWeight: '900', fontSize: FontSize.lg, minWidth: 24 },
  itemName: { fontWeight: '700', fontSize: FontSize.sm, color: Colors.gray900 },
  itemNote: { fontSize: 11, color: '#D97706', fontStyle: 'italic', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  rejectBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  rejectTxt: { color: '#DC2626', fontWeight: '700', fontSize: FontSize.xs },
  advBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  advTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
});
