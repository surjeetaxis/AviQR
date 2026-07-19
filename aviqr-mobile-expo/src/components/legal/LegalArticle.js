import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { PageHeader } from '../common/PageHeader.js';
import { Colors, FontSize, Spacing } from '../../theme/index.js';

// Shared renderer for the three static legal pages (Terms/Privacy/Refund) —
// same section-by-section structure as the web's Legal.css pages, just
// data-driven so each screen file is only its own copy, not repeated layout.
export function LegalArticle({ title, meta, sections, updated }) {
  return (
    <View style={ss.screen}>
      <PageHeader title={title} />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.h1}>{title}</Text>
        <Text style={ss.meta}>{meta}</Text>
        {sections.map(s => (
          <View key={s.h} style={{ marginTop: 16 }}>
            <Text style={ss.h2}>{s.h}</Text>
            <Text style={ss.body}>{s.p}</Text>
          </View>
        ))}
        <Text style={ss.updated}>Last updated: {updated}</Text>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  h1: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 },
  meta: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 4 },
  h2: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, marginBottom: 6 },
  body: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 21 },
  updated: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 24, textAlign: 'center' },
});
