import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PageHeader } from '../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../src/theme/index.js';

const FEATURES = [
  { emoji: '🔳', tag: 'Order confirmation', title: 'A code and QR your customer can show at the counter', desc: 'After a pay-at-counter order is placed, the customer\'s confirmation screen shows a short 6-digit code and a scannable QR — proof of their order before it\'s ever paid for. The same code works twice: once to confirm payment, and again at pickup or delivery handover to close the order.', example: 'Table 6 orders butter chicken and chooses "Cash at counter." They see code 608305 with a QR on screen. The kitchen never sees the ticket until staff scans or types that code in at the counter and confirms payment.' },
  { emoji: '📷', tag: 'POS · Billing', title: 'Confirm codes without leaving the billing screen', desc: 'Counter staff get a "Confirm code" button right on the POS/Billing screen — scan the QR or type the code, see the order and amount due, and confirm payment or pickup in one tap.', example: 'A cashier at Billing clicks "Confirm code", scans the customer\'s QR, and taps "Confirm payment." The order is released to the kitchen queue immediately.' },
  { emoji: '📡', tag: 'Live tracking', title: 'Live status, not just at checkout — everywhere', desc: 'The Confirmed → Preparing → Ready → Served progress track follows the order into order history too, auto-refreshing every few seconds.', example: 'A customer places an order, closes the tab, and reopens their order history 10 minutes later — the tracker already shows "Preparing," kept live without them touching refresh.' },
  { emoji: '🧾', tag: 'Billing counter', title: 'Discounts and service charges, itemized on the bill', desc: 'Apply a discount or add a service charge right at the billing counter — the bill recalculates tax on the adjusted amount automatically.', example: 'A regular gets a ₹20 discount, and a 10% service charge is added for dine-in. The POS bill summary itemizes Subtotal, Discount, Service Charge, Tax, and Total.' },
  { emoji: '🖨️', tag: 'Receipts', title: 'Receipts that carry your logo, not a generic template', desc: 'Printed and shared receipts pull your restaurant\'s logo, address, and GSTIN straight from your shop profile — along with the full discount/service-charge/tax break-up.', example: 'A dine-in bill is closed and the printed receipt shows the restaurant\'s own logo at the top, the itemized bill, and GST details — ready to hand over as-is.' },
];

export default function FeaturesScreen() {
  return (
    <View style={ss.screen}>
      <PageHeader title="What's new" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.eyebrow}>WHAT'S NEW</Text>
        <Text style={ss.h1}>Built from real counter workflows</Text>
        <Text style={ss.sub}>These are the newest additions to AviQR — order confirmation codes, live tracking, and billing-counter tools.</Text>

        {FEATURES.map(f => (
          <View key={f.title} style={ss.card}>
            <Text style={ss.cardEmoji}>{f.emoji}</Text>
            <Text style={ss.cardTag}>{f.tag}</Text>
            <Text style={ss.cardTitle}>{f.title}</Text>
            <Text style={ss.cardDesc}>{f.desc}</Text>
            <View style={ss.example}>
              <Text style={ss.exampleLabel}>EXAMPLE</Text>
              <Text style={ss.exampleTxt}>{f.example}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={ss.cta} onPress={() => router.push('/register')}>
          <Text style={ss.ctaTxt}>Create your free account →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  eyebrow: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  h1: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 8 },
  sub: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 21, marginBottom: 20 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm },
  cardEmoji: { fontSize: 24, marginBottom: 6 },
  cardTag: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 6 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 20, marginBottom: 10 },
  example: { backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 10 },
  exampleLabel: { fontSize: 10, fontWeight: '800', color: Colors.gray400, letterSpacing: 0.6, marginBottom: 4 },
  exampleTxt: { fontSize: FontSize.xs, color: Colors.gray600, lineHeight: 17 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  ctaTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.base },
});
