import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing } from '../../theme/index.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PageHeader({ title, subtitle, showBack = true, action }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ss.header,{paddingTop:Math.max(insets.top,12)+12}]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn} accessibilityLabel="Go back">
          <Text style={ss.backTxt}>←</Text>
        </TouchableOpacity>
      ) : null}
      <View style={ss.heading}><Text accessibilityRole="header" style={ss.title}>{title}</Text>{subtitle ? <Text style={ss.subtitle}>{subtitle}</Text> : null}</View>
      {action}
    </View>
  );
}

const ss = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap:12, paddingHorizontal: Spacing.lg, paddingBottom: 18, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border },
  heading:{flex:1,minWidth:0},
  backBtn: { width: 44, height: 44, borderRadius:12, backgroundColor:Colors.white, borderWidth:1,borderColor:Colors.border, alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 20, color: Colors.gray700 },
  title: { fontSize: FontSize['2xl'], fontWeight: '600', letterSpacing:-0.5, color: Colors.gray900 },
  subtitle:{fontSize:FontSize.sm,color:Colors.gray500,marginTop:4},
});
