import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing } from '../../theme/index.js';

export function PageHeader({ title }) {
  return (
    <View style={ss.header}>
      <TouchableOpacity onPress={() => router.back()} style={ss.backBtn} accessibilityLabel="Go back">
        <Text style={ss.backTxt}>←</Text>
      </TouchableOpacity>
      <Text style={ss.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

const ss = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 20, color: Colors.gray700 },
  title: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
});
