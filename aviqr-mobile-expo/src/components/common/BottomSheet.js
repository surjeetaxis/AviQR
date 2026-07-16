import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme/index.js';

// menu.js referenced this component (and a "BottomSheet replaced with
// Modal" comment) without it ever existing anywhere in src/ — an
// unconditionally-rendered undefined JSX tag, so the customer menu screen
// crashed on every mount. This is the Modal-based implementation the
// comment describes.
export function BottomSheet({ visible, onClose, height = 400, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.gray300, alignSelf: 'center', marginBottom: 12 },
});
