import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { mallApi, reportApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Real per-vendor revenue (7-day), not the Vendor entity's revenue/commission
// fields — those don't exist on the backend and would always read as ₹0.
// Commission is computed from the mall's own real commissionPercent field.
export default function MallRevenueScreen() {
  const [rows, setRows]       = useState([]);
  const [commissionPct, setCommissionPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mallsRes = await mallApi.getMyMalls();
      const malls = mallsRes.data.data || [];
      if (!malls.length) { setRows([]); setOffline(false); return; }
      const mall = malls[0];
      setCommissionPct(mall.commissionPercent || 0);
      const vendorsRes = await mallApi.getVendors(mall.id);
      const vendors = vendorsRes.data.data || [];
      const results = await Promise.all(vendors.map(v => {
        if (!v.shopId) return Promise.resolve({ id: v.id, name: v.name, revenue: 0 });
        return mallApi.enterVendor(v.id)
          .then(res => reportApi.getRevenue(v.shopId, 7, res.data.data.accessToken))
          .then(res => {
            const data = res.data.data || [];
            const total = Array.isArray(data) ? data.reduce((a, d) => a + (d.revenue || d.totalRevenue || 0), 0) : 0;
            return { id: v.id, name: v.name, revenue: total };
          })
          .catch(() => ({ id: v.id, name: v.name, revenue: 0 }));
      }));
      setRows(results.sort((a, b) => b.revenue - a.revenue));
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalGmv = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = totalGmv * (commissionPct / 100);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Revenue Share" />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        ListHeaderComponent={
          <View style={ss.kpiGrid}>
            {[['Total GMV (7d)', `₹${totalGmv.toLocaleString('en-IN')}`], [`Commission (${commissionPct}%)`, `₹${Math.round(totalCommission).toLocaleString('en-IN')}`], ['Vendors', rows.length]].map(([label, value]) => (
              <View key={label} style={ss.kpiCard}>
                <Text style={ss.kpiVal}>{value}</Text>
                <Text style={ss.kpiLabel}>{label}</Text>
              </View>
            ))}
          </View>
        }
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="💰" title="No vendors yet" />}
        renderItem={({ item }) => {
          const commission = item.revenue * (commissionPct / 100);
          return (
            <View style={ss.card}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>Revenue: ₹{item.revenue.toLocaleString('en-IN')} · {commissionPct}%</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={ss.commission}>₹{Math.round(commission).toLocaleString('en-IN')}</Text>
                <View style={ss.pendingBadge}><Text style={ss.pendingTxt}>Pending</Text></View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  kpiCard: { width: '31%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  commission: { fontSize: FontSize.base, fontWeight: '800', color: '#059669' },
  pendingBadge: { backgroundColor: '#DCFCE7', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pendingTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },
});
