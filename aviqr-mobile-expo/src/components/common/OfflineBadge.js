import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius } from '../../theme/index.js';
export function OfflineBadge({ onRetry }) {
  return (
    <View style={ss.wrap}>
      <Text style={ss.txt}>📡 Demo mode — backend offline</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={ss.retry}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const ss = StyleSheet.create({
  wrap: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:Colors.warningLight, padding:10, paddingHorizontal:14, margin:12, borderRadius:Radius.md, borderWidth:1, borderColor:'#FCD34D' },
  txt:  { fontSize:12, color:'#92400E', fontWeight:'600', flex:1 },
  retry:{ fontSize:12, color:'#92400E', fontWeight:'700', textDecorationLine:'underline' },
});
