import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors, Radius } from '../../theme/index.js';
export function Button({ title, onPress, variant='primary', loading, disabled, size='md', style, accessibilityLabel }) {
  const bg = variant==='primary'?Colors.primary:variant==='danger'?Colors.error:variant==='outline'?Colors.white:Colors.gray100;
  const tc = variant==='outline'?Colors.primary:variant==='ghost'?Colors.gray700:Colors.white;
  const h  = size==='sm'?44:50;
  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityState={{ disabled:!!(disabled||loading), busy:!!loading }}
      style={[ss.btn,{backgroundColor:bg,borderColor:variant==='outline'?Colors.border:'transparent',borderWidth:variant==='outline'?1:0,minHeight:h,opacity:(disabled||loading) ? 0.6 : 1},style]}
      onPress={onPress} disabled={disabled||loading} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color={tc} size="small"/>
               : <Text style={[ss.txt,{color:tc,fontSize:size==='sm'?13:15}]}>{title}</Text>}
    </TouchableOpacity>
  );
}
const ss = StyleSheet.create({
  btn:{borderRadius:Radius.md,justifyContent:'center',alignItems:'center',paddingHorizontal:20,paddingVertical:12},
  txt:{fontWeight:'600',textAlign:'center'},
});
