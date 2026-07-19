import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PageHeader } from '../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../src/theme/index.js';

const FAQ_GROUPS = [
  { title: 'Getting started', items: [
    { q: 'How long does it take to go live?', a: 'Most businesses are live in under 10 minutes: register, add your menu (manually or by photographing your printed menu with OCR), and your permanent QR code is ready to print.' },
    { q: 'Do I need to buy any hardware?', a: 'No. Customers scan with their own phone camera — no app, no dedicated scanner, no tablet required.' },
    { q: 'Can I upload a photo of my existing printed menu?', a: 'Yes — OCR menu upload reads a photo of your printed menu and builds a structured digital menu automatically in under 5 minutes, which you can then edit.' },
    { q: 'What if my QR code gets damaged or I need a new print?', a: "The QR code itself never changes — it's permanent per venue/table. Reprint it any time from QR Codes → Print Designer." },
  ]},
  { title: 'Pricing & billing', items: [
    { q: 'Is the Starter plan really free?', a: 'Yes — no credit card required, no trial expiry. It supports up to 20 menu items, 50 orders/day and 1 QR code.' },
    { q: 'How does billing work for paid plans?', a: 'Growth and Business plans are billed monthly in advance in INR through Razorpay, with GST-compliant invoices. Cancel any time from Settings → Subscription.' },
    { q: 'Do you take a commission on every order?', a: 'No. Pricing is a flat monthly subscription — there is no per-order commission on top.' },
    { q: "What's your refund policy?", a: 'Paid subscription fees are non-refundable for the current billing cycle once charged, but you keep access until the cycle ends. Full details in our Refund & Cancellation Policy.' },
  ]},
  { title: 'Features', items: [
    { q: 'Which languages does the customer menu support?', a: '9 Indian languages, selectable by the customer from the menu itself.' },
    { q: 'What is dynamic pricing?', a: 'Rules that automatically change prices by time and date — weekend surcharges, festival pricing, happy-hour discounts.' },
    { q: 'Can customers see a video or 3D preview of a dish?', a: "Yes, if you've added one — any menu item can carry a short video or a rotatable 3D model." },
    { q: 'Does AviQR handle kitchen operations, not just ordering?', a: 'Yes — Kitchen Display (KOT) pushes orders to the kitchen screen instantly, and Inventory & Recipes tracks raw material stock and cost per dish.' },
    { q: 'Is there a version for hotels and malls?', a: 'Yes — hotels get room service, housekeeping, laundry and spa requests off one in-room QR; malls get vendor onboarding and revenue-share tracking.' },
  ]},
  { title: 'Payments & security', items: [
    { q: 'Who processes payments?', a: "Razorpay — the same gateway used by thousands of Indian businesses. Card details are never stored on AviQR's own servers." },
    { q: 'Is my data encrypted?', a: 'Yes — TLS 1.2/1.3 in transit, bcrypt-hashed passwords, databases never publicly reachable, short-lived rotating JWT tokens.' },
    { q: 'Do you sell customer data to advertisers?', a: "No. We don't sell data, and we don't share it with advertising or marketing platforms." },
  ]},
];

export default function FAQScreen() {
  const [open, setOpen] = useState('Getting started-0');
  return (
    <View style={ss.screen}>
      <PageHeader title="FAQ" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.eyebrow}>FAQ</Text>
        <Text style={ss.h1}>Frequently asked questions</Text>
        <TouchableOpacity onPress={() => router.push('/contact')}>
          <Text style={ss.sub}>Can't find what you need? <Text style={ss.link}>Contact us</Text> directly.</Text>
        </TouchableOpacity>

        {FAQ_GROUPS.map(group => (
          <View key={group.title} style={{ marginTop: 20 }}>
            <Text style={ss.groupTitle}>{group.title}</Text>
            {group.items.map((item, i) => {
              const key = `${group.title}-${i}`;
              const isOpen = open === key;
              return (
                <TouchableOpacity key={key} style={ss.item} onPress={() => setOpen(isOpen ? null : key)}>
                  <View style={ss.qRow}>
                    <Text style={ss.q}>{item.q}</Text>
                    <Text style={ss.chevron}>{isOpen ? '−' : '+'}</Text>
                  </View>
                  {isOpen && <Text style={ss.a}>{item.a}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  eyebrow: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  h1: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 8 },
  sub: { fontSize: FontSize.sm, color: Colors.gray600 },
  link: { color: Colors.primary, fontWeight: '700' },
  groupTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  item: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 8, ...Shadow.sm },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  q: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  chevron: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  a: { fontSize: FontSize.sm, color: Colors.gray600, marginTop: 10, lineHeight: 20 },
});
