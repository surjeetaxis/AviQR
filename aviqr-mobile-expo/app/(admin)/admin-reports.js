import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { reportApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const fmt = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
// Crore-only formatting rounded down to lakhs/crores for large platform revenue figures.
const fmtC = n => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
  return `₹${fmt(v)}`;
};

export default function AdminReportsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    reportApi.getPlatform()
      .then(r => { setStats(r.data.data); setOffline(false); })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  const CARDS = stats ? [
    { label: 'Active shops',          value: fmt(stats.activeShops) },
    { label: 'Total orders (all time)', value: fmt(stats.totalOrders) },
    { label: 'Total revenue',         value: fmtC(stats.totalRevenue) },
    { label: "Today's orders",        value: fmt(stats.todayOrders) },
    { label: "Today's revenue",       value: `₹${fmt(stats.todayRevenue)}` },
    { label: 'Avg order value',       value: `₹${fmt(stats.avgOrderValue)}` },
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Platform Reports" />
      {offline && <OfflineBadge />}
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {loading ? (
          <Text style={ss.loading}>Loading…</Text>
        ) : stats ? (
          <View style={ss.grid}>
            {CARDS.map(c => (
              <View key={c.label} style={ss.card}>
                <Text style={ss.value}>{c.value}</Text>
                <Text style={ss.label}>{c.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={ss.loading}>Connect backend to see live platform analytics.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { textAlign: 'center', color: Colors.gray400, paddingVertical: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, alignItems: 'center', ...Shadow.sm },
  value: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 },
  label: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 4, textAlign: 'center' },
});
