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
  w:{alignItems:'center',justifyContent:'center',padding:32,gap:6,backgroundColor:Colors.gray50,borderRadius:18,borderWidth:1,borderStyle:'dashed',borderColor:Colors.border,marginVertical:12},
  icon:{fontSize:32,marginBottom:12},
  title:{fontSize:FontSize.lg,fontWeight:'600',color:Colors.gray700,textAlign:'center'},
  sub:{fontSize:FontSize.sm,lineHeight:20,color:Colors.gray500,textAlign:'center',marginTop:6,marginBottom:10},
});
