import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const FEATURES = [
  { key: 'recommendations', emoji: '⭐', label: 'Recommendations',    desc: 'People also ordered, trending, personalized picks' },
  { key: 'search',          emoji: '🔍', label: 'Smart menu search',  desc: 'Natural language: "veg under ₹300", "jain food"' },
  { key: 'chatbot',         emoji: '💬', label: 'Support chatbot',    desc: 'Orders, refunds, FAQs — always on' },
  { key: 'analytics',       emoji: '📊', label: 'AI analytics',       desc: 'Revenue summaries, growth insights' },
  { key: 'descriptions',    emoji: '✨', label: 'Description writer', desc: 'Generate SEO-friendly menu copy instantly' },
  { key: 'sentiment',       emoji: '📈', label: 'Review sentiment',   desc: 'Analyse customer feedback, spot issues' },
  { key: 'fraud',           emoji: '🛡️', label: 'Fraud detection',   desc: 'Fake orders, risk scores' },
  { key: 'forecast',        emoji: '🔮', label: 'Demand forecast',    desc: 'Predict peak hours, inventory needs' },
  { key: 'pricing',         emoji: '⚡', label: 'Dynamic pricing',    desc: 'AI-generated promotions based on demand' },
  { key: 'assistant',       emoji: '🤖', label: 'Admin assistant',    desc: 'Ask anything about your business' },
  { key: 'voice',           emoji: '🎙️', label: 'Voice ordering',    desc: 'Hands-free ordering by transcript' },
];

export default function AiHubScreen() {
  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>✨ AI Hub</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={ss.hint}>11 features, powered by Claude — each falls back to rule-based logic if AI is offline</Text>
      <FlatList
        data={FEATURES}
        keyExtractor={f => f.key}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => router.push(`/(owner)/ai/${item.key}`)}>
            <Text style={ss.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.label}>{item.label}</Text>
              <Text style={ss.desc}>{item.desc}</Text>
            </View>
            <Text style={ss.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400, paddingHorizontal: Spacing.base, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 12, ...Shadow.sm },
  emoji: { fontSize: 26 },
  label: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  desc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  chevron: { fontSize: 18, color: Colors.gray300 },
});
