import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../../theme/index.js';
export function Card({ children, style, padding=16 }) {
  return <View style={[ss.card,{padding},style]}>{children}</View>;
}
const ss = StyleSheet.create({
  card:{backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.border,...Shadow.sm},
});