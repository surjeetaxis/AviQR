import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { shopApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const PLANS = { STARTER: { label: 'Starter', color: '#6B7280', bg: '#F3F4F6' }, GROWTH: { label: 'Growth', color: '#059669', bg: '#DCFCE7' }, BUSINESS: { label: 'Business', color: '#7C3AED', bg: '#EDE9FE' }, ENTERPRISE: { label: 'Enterprise', color: '#D97706', bg: '#FEF3C7' } };
const planInfo = p => PLANS[(p || 'STARTER').toUpperCase()] || PLANS.STARTER;

// View-only — no status toggle here (that's ADMIN-only), matching web's ShopsPanel.
export default function SupportShopsScreen() {
  const [shops, setShops]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopApi.listAll({ page: 0, size: 100 });
      const d = res.data.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Shops · ${shops.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={shops}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏪" title="No shops registered" />}
        renderItem={({ item }) => {
          const pi = planInfo(item.subscriptionPlan);
          return (
            <View style={ss.card}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>{item.city || '—'} · {item.tableCount || 0} tables</Text>
              </View>
              <View style={[ss.badge, { backgroundColor: pi.bg }]}><Text style={[ss.badgeTxt, { color: pi.color }]}>{pi.label}</Text></View>
              <View style={[ss.statusDot, { backgroundColor: item.status === 'ACTIVE' ? '#059669' : '#DC2626' }]} />
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
