import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { authApi, reportApi, shopApi } from '../../src/api/index.js';
import { useShopNameMap } from '../../src/hooks/useShopNameMap.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function AdminSuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [offline, setOffline]     = useState(false);
  const [refreshing, setRef]      = useState(false);
  const [selected, setSelected]   = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad]   = useState(false);
  const shopNames = useShopNameMap();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers({ size: 200 });
      const d = res.data.data;
      const all = Array.isArray(d) ? d : d?.content || [];
      setSuppliers(all.filter(u => u.role?.toUpperCase() === 'SUPPLIER'));
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (u) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setSuppliers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
    try { await authApi.updateStatus(u.id, next); } catch { load(); }
  };

  const deleteSupplier = (u) => {
    Alert.alert('Delete supplier', `Permanently delete ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await authApi.deleteUser(u.id);
          setSuppliers(prev => prev.filter(x => x.id !== u.id));
          setSelected(null);
        } catch { Alert.alert('Failed to delete supplier'); }
      }}
    ]);
  };

  const openView = async (u) => {
    setSelected(u); setViewStats(null);
    if (!u.shopId) return;
    setViewLoad(true);
    try {
      const [rev, daily, staff] = await Promise.allSettled([
        reportApi.getRevenue(u.shopId, 7), reportApi.getDaily(u.shopId), shopApi.getStaff(u.shopId),
      ]);
      const revDays = rev.status === 'fulfilled' ? (rev.value.data.data || []) : [];
      const rev7d = revDays.reduce((sum, d) => sum + Number(d.revenue || d.total || 0), 0);
      const dailyData = daily.status === 'fulfilled' ? (daily.value.data.data || {}) : {};
      const staffList = staff.status === 'fulfilled' ? (staff.value.data.data || []) : [];
      setViewStats({ todayOrders: dailyData.totalOrders ?? 0, todayRevenue: dailyData.totalRevenue ?? 0, rev7d, staffCount: Array.isArray(staffList) ? staffList.length : 0 });
    } catch { setViewStats({ todayOrders: 0, todayRevenue: 0, rev7d: 0, staffCount: 0 }); }
    finally { setViewLoad(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Suppliers · ${suppliers.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={suppliers}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="📦" title="No suppliers registered" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openView(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.name}</Text>
              <Text style={ss.sub}>{item.email} · {item.phone || '—'}</Text>
              <Text style={ss.shop}>{item.shopId ? (shopNames[item.shopId] || `${item.shopId.slice(0, 8)}…`) : 'No shop linked'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleStatus(item)} style={[ss.badge, { backgroundColor: item.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[ss.badgeTxt, { color: item.status === 'ACTIVE' ? '#059669' : '#DC2626' }]}>{item.status === 'ACTIVE' ? '● Active' : '○ ' + (item.status || '—')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.name}</Text>
            {selected.shopId ? (
              <>
                <Text style={ss.sectionLabel}>LINKED SHOP ACTIVITY</Text>
                <View style={ss.statGrid}>
                  {[
                    ["Today's orders", viewStats?.todayOrders], ["Today's revenue", viewStats ? `₹${Number(viewStats.todayRevenue || 0).toLocaleString('en-IN')}` : null],
                    ['7-day revenue', viewStats ? `₹${Number(viewStats.rev7d || 0).toLocaleString('en-IN')}` : null], ['Staff', viewStats?.staffCount],
                  ].map(([label, value]) => (
                    <View key={label} style={ss.statCard}>
                      <Text style={ss.statVal}>{viewLoad ? '…' : (value ?? '—')}</Text>
                      <Text style={ss.statLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : <Text style={ss.noShop}>No shop linked to this supplier account yet.</Text>}
            <Text style={ss.sectionLabel}>PROFILE</Text>
            {[
              ['User ID', selected.id], ['Email', selected.email], ['Phone', selected.phone],
              ['Shop ID', selected.shopId], ['Status', selected.status],
              ['Created', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
            ].map(([label, value]) => (
              <View key={label} style={ss.fieldRow}>
                <Text style={ss.fieldLabel}>{label}</Text>
                <Text style={ss.fieldValue} numberOfLines={1}>{String(value ?? '—')}</Text>
              </View>
            ))}
            <Button title="🗑 Delete supplier" onPress={() => deleteSupplier(selected)} variant="danger" style={{ marginTop: 16 }} />
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
  shop: { fontSize: FontSize.xs, color: Colors.gray600, marginTop: 4, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.gray400, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  noShop: { fontSize: FontSize.sm, color: Colors.gray400, marginTop: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47%', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 10 },
  statVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
});
