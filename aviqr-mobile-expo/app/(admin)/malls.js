import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { mallApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function AdminMallsScreen() {
  const [malls, setMalls]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [vendors, setVendors] = useState(null);
  const [viewLoad, setViewLoad] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mallApi.listAll();
      setMalls(Array.isArray(res.data.data) ? res.data.data : []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openView = async (m) => {
    setSelected(m); setVendors(null); setViewLoad(true);
    try {
      const res = await mallApi.getVendors(m.id);
      setVendors(res.data.data || []);
    } catch { setVendors([]); }
    finally { setViewLoad(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Malls · ${malls.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={malls}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏬" title="No malls registered" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openView(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.name}</Text>
              <Text style={ss.sub}>{item.city || '—'} · {item.phone || '—'}</Text>
              <Text style={ss.commission}>{item.commissionPercent != null ? `${item.commissionPercent}% commission` : 'No commission set'}</Text>
            </View>
            <Text style={ss.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.name}</Text>
            <Text style={ss.sectionLabel}>ACTIVITY</Text>
            <View style={ss.statGrid}>
              {[
                ['Total vendors', vendors?.length],
                ['Active', vendors?.filter(v => (v.status || '').toUpperCase() === 'ACTIVE').length],
                ['Pending', vendors?.filter(v => (v.status || '').toUpperCase() === 'PENDING').length],
              ].map(([label, value]) => (
                <View key={label} style={ss.statCard}>
                  <Text style={ss.statVal}>{viewLoad ? '…' : (value ?? '—')}</Text>
                  <Text style={ss.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {vendors && vendors.length > 0 && (
              <>
                <Text style={ss.sectionLabel}>VENDORS</Text>
                {vendors.map(v => (
                  <View key={v.id} style={ss.vendorRow}>
                    <Text style={ss.vendorName}>{v.name || v.shopName || v.id?.slice(0, 8)}</Text>
                    <Text style={[ss.vendorStatus, { color: (v.status || '').toUpperCase() === 'ACTIVE' ? Colors.primary : Colors.gray500 }]}>{v.status}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={ss.sectionLabel}>REGISTRATION</Text>
            {[
              ['Mall ID', selected.id], ['Admin ID', selected.adminId], ['Phone', selected.phone],
              ['City', selected.city], ['Address', selected.address],
              ['Commission', selected.commissionPercent != null ? `${selected.commissionPercent}%` : '—'],
              ['Created', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  commission: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  chevron: { fontSize: 18, color: Colors.gray300 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.gray400, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '31%', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 10 },
  statVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  vendorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  vendorName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  vendorStatus: { fontSize: 11, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
});
