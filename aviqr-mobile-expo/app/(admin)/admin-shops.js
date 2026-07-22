import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { shopApi, reportApi, qrApi } from '../../src/api/index.js';
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
  const [planF, setPlanF] = useState('all');
  const [statF, setStatF] = useState('all');
  const [page, setPage] = useState(0);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const res = await shopApi.listAll({ page: pg, size: PAGE_SIZE, search: search || undefined });
      const d = res.data.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
      setPage(pg);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(0); }, [load]);

  const openView = async (shop) => {
    setSelected(shop); setViewStats(null); setViewLoading(true);
    try {
      const [rev, daily, staff, codes] = await Promise.allSettled([
        reportApi.getRevenue(shop.id, 7), reportApi.getDaily(shop.id),
        shopApi.getStaff(shop.id), qrApi.getByShop(shop.id),
      ]);
      const revDays = rev.status === 'fulfilled' ? (rev.value.data?.data || []) : [];
      const rev7d = revDays.reduce((sum, d) => sum + Number(d.revenue || d.total || 0), 0);
      const dailyData = daily.status === 'fulfilled' ? (daily.value.data?.data || {}) : {};
      const staffList = staff.status === 'fulfilled' ? (staff.value.data?.data || []) : [];
      const codesList = codes.status === 'fulfilled' ? (codes.value.data?.data || []) : [];
      setViewStats({
        todayOrders: dailyData.totalOrders ?? '—',
        todayRevenue: dailyData.totalRevenue ?? 0,
        rev7d, staffCount: staffList.length, qrCount: codesList.length,
      });
    } catch { setViewStats({ todayOrders: '—', todayRevenue: 0, rev7d: 0, staffCount: 0, qrCount: 0 }); }
    finally { setViewLoading(false); }
  };

  const toggleStatus = async (shop) => {
    const next = shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setShops(prev => prev.map(s => s.id === shop.id ? { ...s, status: next } : s));
    setSelected(prev => prev && prev.id === shop.id ? { ...prev, status: next } : prev);
    try { await shopApi.updateStatus(shop.id, next); } catch { load(); }
  };

  const filtered = shops
    .filter(s => statF === 'all' || s.status === statF)
    .filter(s => planF === 'all' || (s.subscriptionPlan || 'STARTER').toUpperCase() === planF);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Shops · ${shops.length}`} />
      {offline && <OfflineBadge onRetry={() => load(page)} />}
      <View style={ss.controls}>
        <Input placeholder="Search shops…" value={search} onChangeText={setSearch} />
        <View style={ss.filterRow}>
          {['all', ...Object.keys(PLANS)].map(p => (
            <TouchableOpacity key={p} style={[ss.filterChip, planF === p && ss.filterChipActive]} onPress={() => setPlanF(p)}>
              <Text style={[ss.filterChipTxt, planF === p && ss.filterChipTxtActive]}>{p === 'all' ? 'All plans' : planInfo(p).label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={ss.filterRow}>
          {['all', 'ACTIVE', 'SUSPENDED', 'PENDING'].map(s => (
            <TouchableOpacity key={s} style={[ss.filterChip, statF === s && ss.filterChipActive]} onPress={() => setStatF(s)}>
              <Text style={[ss.filterChipTxt, statF === s && ss.filterChipTxtActive]}>{s === 'all' ? 'All status' : s.charAt(0) + s.slice(1).toLowerCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(page); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏪" title="No shops found" />}
        renderItem={({ item }) => {
          const pi = planInfo(item.subscriptionPlan);
          return (
            <TouchableOpacity style={ss.card} onPress={() => openView(item)} activeOpacity={0.8}>
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
      <View style={ss.pager}>
        <TouchableOpacity disabled={page === 0} onPress={() => load(page - 1)} style={[ss.pageBtn, page === 0 && { opacity: 0.4 }]}><Text style={ss.pageBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <Text style={ss.pageLabel}>Page {page + 1}</Text>
        <TouchableOpacity onPress={() => load(page + 1)} style={ss.pageBtn}><Text style={ss.pageBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} height={560}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.name}</Text>

            <Text style={ss.sectionLabel}>ACTIVITY</Text>
            {viewLoading ? <Text style={ss.fieldLabel}>Loading…</Text> : viewStats && (
              <View style={ss.statGrid}>
                <View style={ss.statCard}><Text style={ss.statVal}>{viewStats.todayOrders}</Text><Text style={ss.statLabel}>Today's Orders</Text></View>
                <View style={ss.statCard}><Text style={[ss.statVal, { color: '#059669' }]}>₹{Number(viewStats.todayRevenue).toLocaleString('en-IN')}</Text><Text style={ss.statLabel}>Today's Revenue</Text></View>
                <View style={ss.statCard}><Text style={[ss.statVal, { color: '#7C3AED' }]}>₹{Number(viewStats.rev7d).toLocaleString('en-IN')}</Text><Text style={ss.statLabel}>7-Day Revenue</Text></View>
                <View style={ss.statCard}><Text style={[ss.statVal, { color: '#2563EB' }]}>{viewStats.staffCount}</Text><Text style={ss.statLabel}>Staff</Text></View>
                <View style={ss.statCard}><Text style={[ss.statVal, { color: '#D97706' }]}>{viewStats.qrCount}</Text><Text style={ss.statLabel}>QR Codes</Text></View>
              </View>
            )}

            <Text style={ss.sectionLabel}>REGISTRATION</Text>
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
  controls: { paddingHorizontal: Spacing.base, paddingTop: 8, gap: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  filterChipTxt: { fontSize: 11, fontWeight: '600', color: Colors.gray600 },
  filterChipTxtActive: { color: Colors.white },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pageBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  pageLabel: { fontSize: FontSize.xs, color: Colors.gray500 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statCard: { flexGrow: 1, minWidth: '30%', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingVertical: 10 },
  statVal: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 10, color: Colors.gray500, marginTop: 2, textAlign: 'center' },
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
