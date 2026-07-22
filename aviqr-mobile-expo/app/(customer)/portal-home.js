import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

// Mirrors web's PortalHome.jsx — shown when the app is opened with no shop/table/room
// context (i.e. the customer hasn't scanned a QR code yet this session).
export default function PortalHomeScreen() {
  return (
    <View style={ss.screen}>
      <View style={ss.iconWrap}>
        <Text style={ss.icon}>📱</Text>
      </View>
      <Text style={ss.title}>Scan a QR to get started</Text>
      <Text style={ss.sub}>Scan a table, room, or food-court QR code to see a menu, order, and track it here.</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30, backgroundColor: Colors.background },
  iconWrap: { width: 64, height: 64, borderRadius: Radius.xl, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 30 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, textAlign: 'center' },
  sub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 19 },
});
