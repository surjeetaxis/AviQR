import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, FontSize } from '../../theme/index.js';
export function StatCard({ emoji, icon, value, label, color, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.8} style={ss.card}>
      <View style={[ss.icon, { backgroundColor: (color||Colors.primary) + '18' }]}>
        {icon || <Text style={{ fontSize: 20 }}>{emoji}</Text>}
      </View>
      <Text style={ss.label}>{label}</Text>
      <Text style={[ss.value, { color: color || Colors.primary }]}>{value}</Text>
    </Wrap>
  );
}
const ss = StyleSheet.create({
  card:  { flex:1, minWidth:0, backgroundColor:Colors.white, borderRadius:Radius.lg, padding:18, borderWidth:1, borderColor:Colors.border, ...Shadow.sm },
  icon:  { width:40, height:40, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', marginBottom:8 },
  value: { fontSize:FontSize['3xl'], fontWeight:'700', letterSpacing:-0.5,marginTop:6,fontVariant:['tabular-nums'] },
  label: { fontSize:FontSize.sm, color:Colors.gray600, marginTop:3 },
});
