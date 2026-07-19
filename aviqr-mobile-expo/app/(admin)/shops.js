import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { shopApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const PLANS = {
  STARTER:    { label: 'Starter',    color: '#6B7280', bg: '#F3F4F6' },
  GROWTH:     { label: 'Growth',     color: '#059669', bg: '#DCFCE7' },
  BUSINESS:   { label: 'Business',   color: '#7C3AED', bg: '#EDE9FE' },
  ENTERPRISE: { label: 'Enterprise', color: '#D97706', bg: '#FEF3C7' },
};
const planInfo = p => PLANS[(p || 'STARTER').toUpperCase()] || PLANS.STARTER;
const STATUS_CLR = { ACTIVE: '#059669', SUSPENDED: '#DC2626', PENDING: '#D97706', CLOSED: '#6B7280', INACTIVE: '#6B7280' };

export default function AdminShopsScreen() {
  const [shops, setShops]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopApi.listAll({ page: 0, size: 100, search: search || undefined });
      const d = res.data.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (shop) => {
    const next = shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setShops(prev => prev.map(s => s.id === shop.id ? { ...s, status: next } : s));
    setSelected(prev => prev && prev.id === shop.id ? { ...prev, status: next } : prev);
    try { await shopApi.updateStatus(shop.id, next); } catch { load(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Shops · ${shops.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <View style={ss.controls}>
        <Input placeholder="Search shops…" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={shops}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏪" title="No shops found" />}
        renderItem={({ item }) => {
          const pi = planInfo(item.subscriptionPlan);
          return (
            <TouchableOpacity style={ss.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>{item.city || '—'} · {item.phone || item.email || '—'}</Text>
                <View style={ss.metaRow}>
                  <View style={[ss.badge, { backgroundColor: pi.bg }]}><Text style={[ss.badgeTxt, { color: pi.color }]}>{pi.label}</Text></View>
                  <TouchableOpacity onPress={() => toggleStatus(item)} style={[ss.badge, { backgroundColor: (STATUS_CLR[item.status] || '#6B7280') + '20' }]}>
                    <Text style={[ss.badgeTxt, { color: STATUS_CLR[item.status] || '#6B7280' }]}>{item.status === 'ACTIVE' ? '● Active' : '○ ' + (item.status || 'Unknown')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={ss.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.name}</Text>
            {[
              ['Shop ID', selected.id], ['Owner ID', selected.ownerId], ['Phone', selected.phone],
              ['Email', selected.email], ['City', selected.city], ['Address', selected.address],
              ['Plan', planInfo(selected.subscriptionPlan).label], ['Tables', selected.tableCount],
              ['Min Order', selected.minOrderAmount ? `₹${selected.minOrderAmount}` : '—'],
              ['Status', selected.status], ['Created', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
            ].map(([label, value]) => (
              <View key={label} style={ss.fieldRow}>
                <Text style={ss.fieldLabel}>{label}</Text>
                <Text style={ss.fieldValue} numberOfLines={1}>{String(value ?? '—')}</Text>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  controls: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 18, color: Colors.gray300 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
});
