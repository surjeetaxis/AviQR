import { Alert, Platform } from 'react-native';

// Alert.alert's multi-button form (Cancel / destructive confirm) renders
// nothing at all on web — react-native-web has no equivalent for a
// button-array alert, so the callback wired to the confirming button (e.g.
// logout) can never fire there. window.confirm is the web equivalent;
// native platforms keep the real Alert.alert they already had.
export function confirmAction(title, message, onConfirm, confirmLabel = 'OK') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
