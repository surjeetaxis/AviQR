import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { shopApi, planApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const FALLBACK_PLANS = {
  STARTER:    { label: 'Starter',    color: '#6B7280', bg: '#F3F4F6', price: 0 },
  GROWTH:     { label: 'Growth',     color: '#059669', bg: '#DCFCE7', price: 999 },
  BUSINESS:   { label: 'Business',   color: '#7C3AED', bg: '#EDE9FE', price: 2499 },
  ENTERPRISE: { label: 'Enterprise', color: '#D97706', bg: '#FEF3C7', price: 0 },
};

// Mobile port of AdminSubscriptionManagement's "Shop Assignments" sub-tab —
// the actual day-to-day admin workflow (Manage Plans / Discount Offers CRUD
// are a separate follow-up, same phasing the web build itself uses).
export default function AdminSubscriptionScreen() {
  const [shops, setShops]     = useState([]);
  const [plans, setPlans]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [changePlan, setChangePlan] = useState(null); // shop being re-assigned
  const [saving, setSaving] = useState(false);

  const planInfo = (key) => {
    const k = (key || 'STARTER').toUpperCase();
    const live = plans.find(p => p.planKey === k);
    const fallback = FALLBACK_PLANS[k];
    return { label: live?.label || fallback?.label || k, price: live ? live.price : (fallback?.price || 0), color: fallback?.color || '#6B7280', bg: fallback?.bg || '#F3F4F6' };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shopsRes, plansRes] = await Promise.allSettled([shopApi.listAll({ size: 200 }), planApi.listAdmin()]);
      if (shopsRes.status === 'fulfilled') {
        const d = shopsRes.value.data.data;
        setShops(Array.isArray(d) ? d : d?.content || []);
        setOffline(false);
      } else setOffline(true);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.data || []);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePlan = async (planKey) => {
    if (!changePlan) return;
    setSaving(true);
    try {
      await shopApi.update(changePlan.id, { subscriptionPlan: planKey });
      setShops(prev => prev.map(s => s.id === changePlan.id ? { ...s, subscriptionPlan: planKey } : s));
      setChangePlan(null);
    } catch { Alert.alert('Failed to update plan'); }
    finally { setSaving(false); }
  };

  const filtered = shops.filter(s => !search || [s.name, s.city, s.email, s.phone].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const planChoices = plans.filter(p => p.vertical === 'SHOP' && p.active).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const choices = planChoices.length > 0 ? planChoices.map(p => ({ key: p.planKey, ...planInfo(p.planKey) })) : Object.keys(FALLBACK_PLANS).map(key => ({ key, ...planInfo(key) }));

  const total = shops.length;
  const paid  = shops.filter(s => planInfo(s.subscriptionPlan).price > 0).length;
  const free  = total - paid;
  const mrr   = shops.reduce((acc, s) => acc + (planInfo(s.subscriptionPlan).price || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Subscriptions" />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        ListHeaderComponent={
          <>
            <View style={ss.kpiGrid}>
              {[['Total shops', total], ['Paid subscribers', paid], ['Free (Starter)', free], ['MRR (est.)', `₹${mrr.toLocaleString('en-IN')}`]].map(([label, value]) => (
                <View key={label} style={ss.kpiCard}>
                  <Text style={ss.kpiVal}>{value}</Text>
                  <Text style={ss.kpiLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={{ paddingHorizontal: Spacing.base }}>
              <Input placeholder="Search shops…" value={search} onChangeText={setSearch} />
            </View>
          </>
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="⭐" title="No shops found" />}
        renderItem={({ item }) => {
          const pi = planInfo(item.subscriptionPlan);
          return (
            <TouchableOpacity style={ss.card} onPress={() => setChangePlan(item)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>{item.city || '—'} · {item.email || item.phone || '—'}</Text>
              </View>
              <View style={[ss.badge, { backgroundColor: pi.bg }]}><Text style={[ss.badgeTxt, { color: pi.color }]}>{pi.label}</Text></View>
            </TouchableOpacity>
          );
        }}
      />

      <BottomSheet visible={!!changePlan} onClose={() => setChangePlan(null)}>
        {changePlan && (
          <View>
            <Text style={ss.sheetTitle}>Change plan — {changePlan.name}</Text>
            <Text style={ss.currentPlan}>Current: {planInfo(changePlan.subscriptionPlan).label}</Text>
            {choices.map(c => (
              <TouchableOpacity key={c.key} style={[ss.planRow, c.key === (changePlan.subscriptionPlan || 'STARTER').toUpperCase() && ss.planRowActive]} onPress={() => savePlan(c.key)} disabled={saving}>
                <Text style={ss.planLabel}>{c.label}</Text>
                <Text style={ss.planPrice}>{c.price > 0 ? `₹${c.price}/mo` : 'Free'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.base, paddingBottom: 4 },
  kpiCard: { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  kpiVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 4 },
  currentPlan: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 16 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  planRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  planLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  planPrice: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray600 },
});
