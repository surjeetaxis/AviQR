import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PageHeader } from '../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../src/theme/index.js';

const VALUES = [
  { emoji: '🌏', title: 'Built for India', desc: '9 Indian languages, GST-ready billing and Razorpay payments — designed around how Indian food businesses actually run, not a US template.' },
  { emoji: '💰', title: 'Fair, transparent pricing', desc: 'A genuinely free Starter plan, flat monthly pricing with no hidden per-order commission, and no lock-in contracts.' },
  { emoji: '🛡️', title: 'Privacy by default', desc: "We don't sell data. Card details never touch our servers. Every claim we make about security is written into our own Privacy Policy." },
  { emoji: '🤝', title: 'One platform, every scale', desc: 'The same product that runs a single tea stall also runs a multi-outlet hotel chain — no "enterprise-only" features held back.' },
];

const SERVES = ['🍛 Restaurants', '☕ Cafés & Bakeries', '🏢 Food Courts', '🏨 Hotels & Resorts', '🏬 Malls', '🛵 Cloud Kitchens'];

export default function AboutScreen() {
  return (
    <View style={ss.screen}>
      <PageHeader title="About AviQR" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.eyebrow}>ABOUT AVIQR</Text>
        <Text style={ss.h1}>The restaurant OS we wished existed</Text>
        <Text style={ss.sub}>AviQR started from a simple observation: most Indian food businesses were choosing between expensive, foreign-built POS systems and a printed menu taped to the table. We built the middle path — one QR code that runs the whole operation.</Text>

        <Text style={ss.body}>
          A QR code on a table should do more than open a PDF. It should let a customer order in their own
          language, let the kitchen see the ticket the second it's placed, let the owner watch today's revenue
          update live, and let all of that keep working whether the business is a single tea stall or a hotel
          chain with a dozen outlets.
        </Text>
        <Text style={ss.body}>
          That's the platform we built: one permanent QR code per venue that never needs reprinting, an OCR
          pipeline that turns a photo of an existing printed menu into a digital one in minutes, and the
          operational tooling — kitchen display, inventory, staff roles, loyalty, analytics — that a business
          actually needs to run day to day, not just take orders.
        </Text>
        <Text style={ss.body}>
          We also built dedicated modules for businesses that don't fit the single-restaurant mould: hotels
          running room service, housekeeping and spa requests off one in-room QR; malls and food courts
          onboarding many vendors under one roof; and multi-outlet brands managing every location's menu and
          orders from a single login.
        </Text>

        <Text style={ss.h2}>What we believe</Text>
        {VALUES.map(v => (
          <View key={v.title} style={ss.card}>
            <Text style={ss.cardEmoji}>{v.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.cardTitle}>{v.title}</Text>
              <Text style={ss.cardDesc}>{v.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={ss.h2}>Who we build for</Text>
        <View style={ss.chipWrap}>
          {SERVES.map(s => <View key={s} style={ss.chip}><Text style={ss.chipTxt}>{s}</Text></View>)}
        </View>

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
  h1: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 10 },
  h2: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, marginTop: 20, marginBottom: 12 },
  sub: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 21, marginBottom: 16 },
  body: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 21, marginBottom: 12 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 10, ...Shadow.sm },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  cardDesc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, lineHeight: 17 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  chipTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  ctaTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.base },
});
