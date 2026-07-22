import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { planApi, offerApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Read-only plan browser — web's upgrade/cancel buttons on this tab are
// demo-only (confirm() + local state, no backend call), so there's nothing
// real to wire up beyond browsing live plan data.
export default function MallSubscriptionScreen() {
  const [plans, setPlans]     = useState([]);
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([planApi.listPublic('MALL'), offerApi.listActive()])
      .then(([pRes, oRes]) => { setPlans(pRes.data.data || []); setOffers(oRes.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Subscription" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {loading ? <Text style={ss.loading}>Loading…</Text> : plans.length === 0 ? (
          <Text style={ss.loading}>No mall plans configured yet.</Text>
        ) : plans.map(plan => {
          const offer = offers.find(o => o.applicablePlans === 'ALL' || (o.applicablePlans || '').split(',').map(s => s.trim()).includes(plan.planKey));
          const discounted = offer ? Math.round(plan.price * (1 - offer.discountPercent / 100)) : null;
          return (
            <View key={plan.id} style={ss.card}>
              <Text style={ss.name}>{plan.label}</Text>
              <Text style={ss.price}>{plan.price === 0 ? 'Free' : offer ? `₹${discounted?.toLocaleString('en-IN')}/mo` : `₹${plan.price.toLocaleString('en-IN')}/mo`}</Text>
              {offer && <Text style={ss.offer}>🎉 {offer.discountPercent}% off — {offer.title}</Text>}
              {(plan.features || '').split('\n').filter(Boolean).map(f => <Text key={f} style={ss.feature}>✓ {f.trim()}</Text>)}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 14, ...Shadow.sm },
  name: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  price: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 4 },
  offer: { fontSize: FontSize.xs, color: '#DC2626', fontWeight: '700', marginBottom: 8 },
  feature: { fontSize: FontSize.sm, color: Colors.gray600, marginBottom: 4 },
});
