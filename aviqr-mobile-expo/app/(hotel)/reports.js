import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { hotelApi, hotelOutletApi, reportApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Outlet comparison — the hotel owner's own login has no shopId, so a direct
// report-service call would 403; mint an outlet-scoped token per outlet first
// via hotelOutletApi.enter, same pattern used for mall vendor revenue.
export default function HotelReportsScreen() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hRes = await hotelApi.getMyHotels();
      const hotel = (hRes.data.data || [])[0];
      if (!hotel) { setRows([]); setOffline(false); return; }
      const outletsRes = await hotelOutletApi.list(hotel.id);
      const outlets = outletsRes.data.data || [];
      const results = await Promise.all(outlets.map(o => {
        if (!o.shopId) return Promise.resolve({ name: o.name, total: 0 });
        return hotelOutletApi.enter(o.id)
          .then(res => reportApi.getRevenue(o.shopId, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a, d) => a + (d.revenue || d.totalRevenue || 0), 0) : 0;
            return { name: o.name, total };
          })
          .catch(() => ({ name: o.name, total: 0 }));
      }));
      setRows(results.sort((a, b) => b.total - a.total));
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grandTotal = rows.reduce((a, r) => a + r.total, 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Reports" />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={rows}
        keyExtractor={r => r.name}
        ListHeaderComponent={
          <>
            <Text style={ss.subheading}>Outlet comparison · last 7 days</Text>
            <View style={ss.kpiGrid}>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>₹{grandTotal.toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Total revenue (7 days)</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{rows.length}</Text><Text style={ss.kpiLabel}>Outlets tracked</Text></View>
            </View>
          </>
        }
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="📊" title="No outlets yet" />}
        renderItem={({ item }) => {
          const pct = grandTotal ? (item.total / grandTotal) * 100 : 0;
          return (
            <View style={ss.card}>
              <View style={ss.rowTop}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.value}>₹{item.total.toLocaleString('en-IN')}</Text>
              </View>
              <View style={ss.barTrack}><View style={[ss.barFill, { width: `${pct}%` }]} /></View>
              <Text style={ss.pct}>{pct.toFixed(1)}%</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  subheading: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  kpiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  value: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  barTrack: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 3 },
  pct: { fontSize: 11, fontWeight: '700', color: Colors.gray500, marginTop: 6, textAlign: 'right' },
});
