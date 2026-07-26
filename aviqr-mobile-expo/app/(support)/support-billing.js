import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { planApi, offerApi, shopApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const SUB_STATUS_CFG = {
  ACTIVE:        { label: 'Active',        color: '#059669', bg: '#DCFCE7' },
  TRIALING:      { label: 'Trialing',      color: '#2563EB', bg: '#DBEAFE' },
  TRIAL_EXPIRED: { label: 'Trial expired', color: '#DC2626', bg: '#FEE2E2' },
  CANCELED:      { label: 'Canceled',      color: '#6B7280', bg: '#F3F4F6' },
};

// Plans/offers stay read-only for support (ADMIN-managed), but shop
// subscription status is a day-to-day support action (confirm manual
// payment, process a cancellation) — same split as web's SupportBillingPanel.
export default function SupportBillingScreen() {
  const [plans, setPlans]     = useState([]);
  const [offers, setOffers]   = useState([]);
  const [shops, setShops]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, oRes, sRes] = await Promise.all([planApi.listAdmin(), offerApi.listAdmin(), shopApi.listAll({ size: 200 })]);
      setPlans(pRes.data.data || []);
      setOffers(oRes.data.data || []);
      const d = sRes.data.data;
      setShops(Array.isArray(d) ? d : d?.content || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setSubStatus = async (shop, status) => {
    try {
      await shopApi.updateSubscription(shop.id, status);
      setShops(prev => prev.map(s => s.id !== shop.id ? s : { ...s, subscriptionStatus: status, ...(status === 'CANCELED' ? { subscriptionPlan: 'STARTER', trialEndsAt: null } : {}) }));
    } catch { Alert.alert('Failed to update subscription'); }
  };

  const pendingCancellations = shops.filter(s => s.cancelRequestedAt && s.subscriptionStatus !== 'CANCELED').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Billing" />
      <ScrollView
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
      >
        <Text style={ss.hint}>Plans read-only (managed by Admin) — shop subscriptions manageable here</Text>
        {loading ? <Text style={ss.loading}>Loading…</Text> : (
          <>
            {pendingCancellations > 0 && (
              <View style={ss.alertBanner}>
                <Text style={ss.alertTxt}>⚠ {pendingCancellations} shop{pendingCancellations > 1 ? 's' : ''} requested subscription cancellation.</Text>
              </View>
            )}

            <Text style={ss.sectionTitle}>Shop subscriptions</Text>
            {shops.length === 0 && <Text style={ss.empty}>No shops found.</Text>}
            {shops.map(item => {
              const subStatus = item.subscriptionStatus || 'ACTIVE';
              const sc = SUB_STATUS_CFG[subStatus] || SUB_STATUS_CFG.ACTIVE;
              const daysLeft = subStatus === 'TRIALING' && item.trialEndsAt
                ? Math.ceil((new Date(item.trialEndsAt) - new Date()) / 86400000) : null;
              return (
                <View key={item.id} style={ss.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.name}>{item.name}</Text>
                    <Text style={ss.sub}>{item.subscriptionPlan || 'STARTER'}</Text>
                    <View style={[ss.badge, { backgroundColor: sc.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
                      <Text style={[ss.badgeTxt, { color: sc.color }]}>{sc.label}{daysLeft != null ? ` · ${daysLeft}d left` : ''}</Text>
                    </View>
                    {item.cancelRequestedAt && <Text style={{ fontSize: 10.5, color: '#D97706', marginTop: 4 }}>Cancel requested</Text>}
                  </View>
                  <View style={{ gap: 6 }}>
                    {subStatus !== 'ACTIVE' && (
                      <TouchableOpacity onPress={() => setSubStatus(item, 'ACTIVE')}><Text style={[ss.linkTxt, { color: '#059669' }]}>Mark Active</Text></TouchableOpacity>
                    )}
                    {subStatus !== 'CANCELED' && (
                      <TouchableOpacity onPress={() => setSubStatus(item, 'CANCELED')}><Text style={[ss.linkTxt, { color: Colors.error }]}>Cancel</Text></TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            <Text style={ss.sectionTitle}>Plans</Text>
            {plans.length === 0 && <Text style={ss.empty}>No plans configured.</Text>}
            {plans.map(p => (
              <View key={p.id} style={ss.card}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.name}>{p.label}</Text>
                  <Text style={ss.sub}>{p.vertical} · ₹{p.price}</Text>
                </View>
                <View style={[ss.badge, { backgroundColor: p.active ? '#DCFCE7' : '#F3F4F6' }]}><Text style={[ss.badgeTxt, { color: p.active ? '#059669' : '#6B7280' }]}>{p.active ? 'Active' : 'Hidden'}</Text></View>
              </View>
            ))}

            <Text style={ss.sectionTitle}>Discount Offers</Text>
            {offers.length === 0 && <Text style={ss.empty}>No offers configured.</Text>}
            {offers.map(o => (
              <View key={o.id} style={ss.card}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.name}>{o.title || o.code}</Text>
                  <Text style={ss.sub}>{o.startsAt ? new Date(o.startsAt).toLocaleDateString('en-IN') : '—'} → {o.endsAt ? new Date(o.endsAt).toLocaleDateString('en-IN') : '—'}</Text>
                </View>
                <View style={[ss.badge, { backgroundColor: o.active ? '#DCFCE7' : '#F3F4F6' }]}><Text style={[ss.badgeTxt, { color: o.active ? '#059669' : '#6B7280' }]}>{o.active ? 'Active' : 'Hidden'}</Text></View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  hint: { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 16 },
  loading: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginTop: 16, marginBottom: 10 },
  empty: { fontSize: FontSize.sm, color: Colors.gray400 },
  alertBanner: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D', borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  alertTxt: { fontSize: FontSize.xs, color: '#92400E', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, marginBottom: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  linkTxt: { fontSize: 11, fontWeight: '700' },
});
