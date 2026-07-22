import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { planApi, offerApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Read-only for support — plans/offers are ADMIN-managed, matching web's
// SupportBillingPanel exactly (no create/edit here).
export default function SupportBillingScreen() {
  const [plans, setPlans]     = useState([]);
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([planApi.listAdmin(), offerApi.listAdmin()])
      .then(([pRes, oRes]) => { setPlans(pRes.data.data || []); setOffers(oRes.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Billing" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.hint}>Plans & discount offers — read-only (managed by Admin)</Text>
        {loading ? <Text style={ss.loading}>Loading…</Text> : (
          <>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, marginBottom: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
