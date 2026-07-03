import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme/index.js';
const V = {
  success:{bg:Colors.primaryLight,text:Colors.primaryDark},
  error:  {bg:Colors.errorLight,  text:Colors.error},
  warning:{bg:Colors.warningLight, text:Colors.warning},
  info:   {bg:Colors.infoLight,   text:Colors.info},
  gray:   {bg:Colors.gray100,     text:Colors.gray600},
  purple: {bg:Colors.purpleLight, text:Colors.purple},
};
export function Badge({ label, variant='gray', style }) {
  const v=V[variant]||V.gray;
  return <View style={[ss.b,{backgroundColor:v.bg},style]}><Text style={[ss.t,{color:v.text}]}>{label}</Text></View>;
}
const ss=StyleSheet.create({b:{borderRadius:Radius.full,paddingVertical:2,paddingHorizontal:8,alignSelf:'flex-start'},t:{fontSize:11,fontWeight:'700'}});