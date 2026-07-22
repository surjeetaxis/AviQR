import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { brandApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const GROUPS = [['outlet', 'By outlet'], ['city', 'By city'], ['zone', 'By zone']];

// Real head-office rollup — one aggregate call (brandApi.getOverview) instead
// of an enter()+getRevenue loop per outlet, since the backend already
// computes this server-side.
export default function SupplierReportsScreen() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [offline, setOffline]   = useState(false);
  const [groupBy, setGroupBy]   = useState('outlet');

  const load = () => {
    setLoading(true);
    brandApi.getOverview(7)
      .then(res => { setOverview(res.data.data); setOffline(false); })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Reports" />
    </View>
  );

  const grandTotal = overview?.totalRevenue || 0;
  const rows = groupBy === 'outlet' ? overview?.byOutlet : groupBy === 'city' ? overview?.byCity : overview?.byZone;
  const rowLabel = (r) => groupBy === 'outlet' ? r.name : (r[groupBy] || 'Unassigned');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Reports" />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={rows || []}
        keyExtractor={(r, i) => String(i)}
        ListHeaderComponent={
          <>
            <Text style={ss.subheading}>Last 7 days · all outlets · one head-office rollup</Text>
            <View style={ss.kpiGrid}>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>₹{grandTotal.toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Total revenue (7d)</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{overview?.outletCount ?? 0}</Text><Text style={ss.kpiLabel}>Outlets</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{overview?.totalOrders || 0}</Text><Text style={ss.kpiLabel}>Orders (7d)</Text></View>
            </View>
            <View style={ss.groupRow}>
              {GROUPS.map(([key, label]) => (
                <TouchableOpacity key={key} style={[ss.groupChip, groupBy === key && ss.groupChipActive]} onPress={() => setGroupBy(key)}>
                  <Text style={[ss.groupChipTxt, groupBy === key && ss.groupChipTxtActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!overview ? <Text style={ss.empty}>Could not load the head-office overview.</Text> : <Text style={ss.empty}>No data yet</Text>}
        renderItem={({ item }) => {
          const revenue = item.revenue || 0;
          const pct = grandTotal ? (revenue / grandTotal) * 100 : 0;
          return (
            <View style={ss.card}>
              <View style={ss.rowTop}>
                <Text style={ss.name}>{rowLabel(item)}{groupBy !== 'outlet' ? ` · ${item.outletCount} outlets` : ''}</Text>
                <Text style={ss.value}>₹{revenue.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={ss.orders}>{item.orders || 0} orders</Text>
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
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2 },
  groupRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  groupChip: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  groupChipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  groupChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  groupChipTxtActive: { color: Colors.white },
  empty: { textAlign: 'center', color: Colors.gray400, paddingVertical: 30 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, flex: 1 },
  value: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  orders: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 6 },
  barTrack: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },
  pct: { fontSize: 11, fontWeight: '700', color: Colors.gray500, marginTop: 6, textAlign: 'right' },
});
