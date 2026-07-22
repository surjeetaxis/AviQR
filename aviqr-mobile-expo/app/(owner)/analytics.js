import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { reportApi, rawMaterialApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const RANGES = [7, 30, 90];
const TABS = [
  { key: 'overview',    label: '📊 Overview' },
  { key: 'orders',      label: '📦 Order Types' },
  { key: 'aggregators', label: '🛵 Aggregators' },
  { key: 'items',       label: '🏆 Items' },
  { key: 'food-cost',   label: '🍽️ Food Cost' },
  { key: 'peak',        label: '⏰ Peak Hours' },
];

function Bar({ label, value, pct, color }) {
  return (
    <View style={ss.barRow}>
      <View style={ss.barTop}><Text style={ss.barLabel}>{label}</Text><Text style={ss.barValue}>{value}</Text></View>
      <View style={ss.barTrack}><View style={[ss.barFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const shopId = useActiveShopId();
  const [range, setRange]     = useState(30);
  const [tab, setTab]         = useState('overview');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [revenue, setRevenue] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [peakHrs, setPeakHrs] = useState([]);
  const [rawMats, setRawMats] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);
  const [aggBreak, setAggBreak] = useState([]);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [rR, tR, pR, mR, oR, aR] = await Promise.allSettled([
        reportApi.getRevenue(shopId, range),
        reportApi.getTopItems(shopId),
        reportApi.getPeakHours(shopId),
        rawMaterialApi.getByShop(shopId),
        reportApi.getOrderTypes(shopId, range),
        reportApi.getAggregatorBreakdown(shopId, range),
      ]);
      if (rR.status === 'fulfilled') setRevenue((rR.value.data.data || []).map(x => ({ date: String(x.date || '').slice(5), revenue: Number(x.revenue || 0), orders: Number(x.orders || 0) })));
      if (tR.status === 'fulfilled') setTopItems(tR.value.data.data || []);
      if (pR.status === 'fulfilled') setPeakHrs((pR.value.data.data || []).map(x => ({ hour: x.hour, orders: Number(x.order_count || x.orders || 0), revenue: Number(x.revenue || 0) })));
      if (mR.status === 'fulfilled') setRawMats(mR.value.data.data || []);
      if (oR.status === 'fulfilled') setOrderTypes(oR.value.data.data || []);
      if (aR.status === 'fulfilled') setAggBreak(aR.value.data.data || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [shopId, range]);

  useEffect(() => { load(); }, [load]);

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [
        ['Date', 'Revenue', 'Orders'],
        ...revenue.map(r => [r.date, r.revenue, r.orders]),
        [],
        ['Top Items'],
        ['Name', 'Sold', 'Revenue'],
        ...topItems.map(i => [i.name, i.qty_sold ?? i.qty ?? 0, i.revenue ?? 0]),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const path = `${FileSystem.cacheDirectory}analytics_${range}d_${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch { Alert.alert('Export failed', 'Could not generate the CSV.'); }
    finally { setExporting(false); }
  };

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalOrders  = revenue.reduce((s, r) => s + r.orders, 0);
  const avgOrder     = totalOrders ? totalRevenue / totalOrders : 0;
  const invValue     = rawMats.reduce((s, m) => s + parseFloat(m.currentStock || 0) * parseFloat(m.costPerUnit || 0), 0);
  const lowStockCount = rawMats.filter(m => parseFloat(m.currentStock || 0) <= parseFloat(m.minStockLevel || 0)).length;
  const estFoodCostPct = totalRevenue > 0 ? Math.min((invValue * 0.3 / totalRevenue) * 100, 45) : 0;
  const grossMargin  = 100 - estFoodCostPct;
  const maxRevDay    = Math.max(1, ...revenue.map(r => r.revenue));
  const maxPeak       = Math.max(1, ...peakHrs.map(p => p.orders));
  const maxOrderType   = Math.max(1, ...orderTypes.map(o => Number(o.revenue || 0)));
  const maxAgg         = Math.max(1, ...aggBreak.map(a => Number(a.revenue || 0)));
  const maxItemRev      = Math.max(1, ...topItems.map(i => Number(i.revenue || 0)));

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Analytics</Text>
        <TouchableOpacity onPress={exportCsv} disabled={exporting}><Text style={ss.exportBtn}>{exporting ? '…' : '⬇ CSV'}</Text></TouchableOpacity>
      </View>
      {offline && <OfflineBadge onRetry={load} />}

      <View style={ss.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity key={r} style={[ss.rangeChip, range === r && ss.rangeChipActive]} onPress={() => setRange(r)}>
            <Text style={[ss.rangeTxt, range === r && ss.rangeTxtActive]}>{r}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList horizontal showsHorizontalScrollIndicator={false} data={TABS} keyExtractor={t => t.key} style={ss.tabList}
        renderItem={({ item: t }) => (
          <TouchableOpacity style={[ss.tabChip, tab === t.key && ss.tabChipActive]} onPress={() => setTab(t.key)}>
            <Text style={[ss.tabChipTxt, tab === t.key && ss.tabChipTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        )}
      />

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {tab === 'overview' && (
          <>
            <View style={ss.kpiGrid}>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>₹{totalRevenue.toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Revenue ({range}d)</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{totalOrders}</Text><Text style={ss.kpiLabel}>Orders</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>₹{avgOrder.toFixed(0)}</Text><Text style={ss.kpiLabel}>Avg Order</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{grossMargin.toFixed(0)}%</Text><Text style={ss.kpiLabel}>Est. Margin</Text></View>
            </View>
            <Text style={ss.sectionTitle}>Revenue trend</Text>
            {revenue.map(r => <Bar key={r.date} label={r.date} value={`₹${r.revenue.toLocaleString('en-IN')}`} pct={(r.revenue / maxRevDay) * 100} color={Colors.primary} />)}
            {revenue.length === 0 && <Text style={ss.empty}>No revenue data yet</Text>}
          </>
        )}

        {tab === 'orders' && (
          <>
            <Text style={ss.sectionTitle}>Orders by type</Text>
            {orderTypes.map(o => <Bar key={o.type} label={o.type} value={`₹${Number(o.revenue).toLocaleString('en-IN')} · ${o.orders}`} pct={(Number(o.revenue) / maxOrderType) * 100} color="#2563EB" />)}
            {orderTypes.length === 0 && <Text style={ss.empty}>No data yet</Text>}
          </>
        )}

        {tab === 'aggregators' && (
          <>
            <Text style={ss.sectionTitle}>Revenue by channel</Text>
            {aggBreak.map(a => <Bar key={a.source} label={a.source} value={`₹${Number(a.revenue).toLocaleString('en-IN')} · ${a.orders}`} pct={(Number(a.revenue) / maxAgg) * 100} color="#7C3AED" />)}
            {aggBreak.length === 0 && <Text style={ss.empty}>No data yet</Text>}
          </>
        )}

        {tab === 'items' && (
          <>
            <Text style={ss.sectionTitle}>Top selling items</Text>
            {topItems.map((i, idx) => <Bar key={idx} label={`${i.name} (${i.qty_sold || i.qty || 0} sold)`} value={`₹${Number(i.revenue || 0).toLocaleString('en-IN')}`} pct={(Number(i.revenue || 0) / maxItemRev) * 100} color="#D97706" />)}
            {topItems.length === 0 && <Text style={ss.empty}>No items sold yet</Text>}
          </>
        )}

        {tab === 'food-cost' && (
          <>
            <View style={ss.kpiGrid}>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>₹{invValue.toLocaleString('en-IN')}</Text><Text style={ss.kpiLabel}>Inventory Value</Text></View>
              <View style={ss.kpiCard}><Text style={ss.kpiVal}>{estFoodCostPct.toFixed(1)}%</Text><Text style={ss.kpiLabel}>Est. Food Cost</Text></View>
              <View style={ss.kpiCard}><Text style={[ss.kpiVal, lowStockCount > 0 && { color: '#DC2626' }]}>{lowStockCount}</Text><Text style={ss.kpiLabel}>Low Stock Items</Text></View>
            </View>
            <Text style={ss.hint}>Estimate based on current raw-material inventory value vs. revenue — a rough gauge, not a precise costing report.</Text>
          </>
        )}

        {tab === 'peak' && (
          <>
            <Text style={ss.sectionTitle}>Orders by hour</Text>
            {peakHrs.map(p => <Bar key={p.hour} label={`${p.hour}:00`} value={`${p.orders} orders`} pct={(p.orders / maxPeak) * 100} color="#059669" />)}
            {peakHrs.length === 0 && <Text style={ss.empty}>No data yet</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  exportBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  rangeRow: { flexDirection: 'row', gap: 8, padding: Spacing.base, paddingBottom: 0 },
  rangeChip: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  rangeChipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  rangeTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray600 },
  rangeTxtActive: { color: Colors.white },
  tabList: { paddingHorizontal: Spacing.base, paddingVertical: 10 },
  tabChip: { height: 32, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 8 },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  tabChipTxtActive: { color: Colors.white },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  empty: { fontSize: FontSize.sm, color: Colors.gray400, textAlign: 'center', paddingVertical: 20 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400, lineHeight: 18 },
  barRow: { marginBottom: 12 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, flex: 1 },
  barValue: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray900 },
  barTrack: { height: 8, backgroundColor: Colors.gray100, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
