import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { planApi, offerApi, hotelApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Plan browsing/upgrading is web-only — the app never runs a subscription
// purchase flow. Mobile just shows whatever plan the hotel is actually on
// (assigned via web/admin) and points elsewhere to change it.
export default function HotelSubscriptionScreen() {
  const [hotel, setHotel]     = useState(null);
  const [plans, setPlans]     = useState([]);
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hotelApi.getMyHotels(), planApi.listPublic('HOTEL'), offerApi.listActive()])
      .then(([hRes, pRes, oRes]) => {
        setHotel((hRes.data.data || [])[0] || null);
        setPlans(pRes.data.data || []);
        setOffers(oRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPlan = plans.find(p => p.planKey === hotel?.subscriptionPlan);
  const offer = currentPlan && offers.find(o => o.applicablePlans === 'ALL' || (o.applicablePlans || '').split(',').map(s => s.trim()).includes(currentPlan.planKey));
  const discounted = offer && currentPlan ? Math.round(currentPlan.price * (1 - offer.discountPercent / 100)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Subscription" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {loading ? <Text style={ss.loading}>Loading…</Text> : currentPlan ? (
          <View style={ss.card}>
            <Text style={ss.eyebrow}>YOUR CURRENT PLAN</Text>
            <Text style={ss.name}>{currentPlan.label}</Text>
            <Text style={ss.price}>{currentPlan.price === 0 ? 'Free' : offer ? `₹${discounted?.toLocaleString('en-IN')}/mo` : `₹${currentPlan.price.toLocaleString('en-IN')}/mo`}</Text>
            {offer && <Text style={ss.offer}>🎉 {offer.discountPercent}% off — {offer.title}</Text>}
            {(currentPlan.features || '').split('\n').filter(Boolean).map(f => <Text key={f} style={ss.feature}>✓ {f.trim()}</Text>)}
          </View>
        ) : (
          <View style={ss.card}>
            <Text style={ss.name}>No active plan</Text>
            <Text style={ss.feature}>Subscribe on the web to unlock the hotel module.</Text>
          </View>
        )}
        <Text style={ss.hint}>Plans are managed on the web — sign in there and open Subscription from your dashboard to subscribe or change plans.</Text>
        <TouchableOpacity style={ss.webLink} onPress={() => Linking.openURL('https://aviqr.in')}>
          <Text style={ss.webLinkTxt}>Manage subscription on web →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 14, ...Shadow.sm },
  eyebrow: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginBottom: 6, letterSpacing: 0.5 },
  name: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  price: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 4 },
  offer: { fontSize: FontSize.xs, color: '#DC2626', fontWeight: '700', marginBottom: 8 },
  feature: { fontSize: FontSize.sm, color: Colors.gray600, marginBottom: 4 },
  hint: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 4 },
  webLink: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  webLinkTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
});
