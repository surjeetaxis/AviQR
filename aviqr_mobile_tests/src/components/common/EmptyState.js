import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../theme/index.js';
export function EmptyState({ icon='📭', title, subtitle, action }) {
  return (
    <View style={ss.w}>
      <Text style={ss.icon}>{icon}</Text>
      <Text style={ss.title}>{title}</Text>
      {subtitle&&<Text style={ss.sub}>{subtitle}</Text>}
      {action}
    </View>
  );
}
const ss=StyleSheet.create({
  w:{alignItems:'center',justifyContent:'center',padding:48},
  icon:{fontSize:48,marginBottom:12},
  title:{fontSize:FontSize.lg,fontWeight:'700',color:Colors.gray700,textAlign:'center'},
  sub:{fontSize:FontSize.base,color:Colors.gray400,textAlign:'center',marginTop:6},
});