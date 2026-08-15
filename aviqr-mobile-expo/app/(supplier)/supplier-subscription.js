import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Plan browsing/upgrading is web-only — the app never runs a subscription
// purchase flow. Brand accounts don't carry a subscriptionPlan field (unlike
// Shop/Hotel/Mall), so there's no "current plan" to look up here — just point
// to the web dashboard where supplier subscriptions are actually managed.
export default function SupplierSubscriptionScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Subscription" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <View style={ss.card}>
          <Text style={ss.name}>Manage your subscription on the web</Text>
          <Text style={ss.feature}>Sign in on the web and open Subscription from your dashboard to subscribe or change plans.</Text>
        </View>
        <TouchableOpacity style={ss.webLink} onPress={() => Linking.openURL('https://aviqr.com')}>
          <Text style={ss.webLinkTxt}>Manage subscription on web →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, marginBottom: 14, ...Shadow.sm },
  name: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  feature: { fontSize: FontSize.sm, color: Colors.gray600, marginTop: 6 },
  webLink: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  webLinkTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
});
