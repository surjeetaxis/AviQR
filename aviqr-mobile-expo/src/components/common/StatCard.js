import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, FontSize } from '../../theme/index.js';
export function StatCard({ emoji, value, label, color, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.8} style={ss.card}>
      <View style={[ss.icon, { backgroundColor: (color||Colors.primary) + '18' }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <Text style={[ss.value, { color: color || Colors.gray900 }]}>{value}</Text>
      <Text style={ss.label}>{label}</Text>
    </Wrap>
  );
}
const ss = StyleSheet.create({
  card:  { flex:1, backgroundColor:Colors.white, borderRadius:Radius.lg, padding:14, borderWidth:1, borderColor:Colors.border, ...Shadow.sm },
  icon:  { width:40, height:40, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', marginBottom:8 },
  value: { fontSize:FontSize['3xl'], fontWeight:'800', letterSpacing:-0.5 },
  label: { fontSize:FontSize.xs, color:Colors.gray400, marginTop:3 },
});
