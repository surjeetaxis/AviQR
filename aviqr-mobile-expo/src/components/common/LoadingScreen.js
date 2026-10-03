import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '../../theme/index.js';

export function LoadingScreen({ message = 'Restoring your workspace…' }) {
  return (
    <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>This usually takes a moment.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  screen:{flex:1,minHeight:240,alignItems:'center',justifyContent:'center',gap:Spacing.md,backgroundColor:Colors.background,padding:Spacing.xl},
  message:{fontSize:FontSize.md,fontWeight:'600',color:Colors.gray900},
  hint:{fontSize:FontSize.sm,color:Colors.gray500},
});
