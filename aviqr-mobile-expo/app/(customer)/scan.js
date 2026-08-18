import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Colors, FontSize, Radius } from '../../src/theme/index.js';
import { resolveTarget } from '../../src/utils/deepLink.js';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const lockRef = useRef(false);

  const onScanned = ({ data }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const target = resolveTarget(data);
    if (!target) {
      Alert.alert('Not an AviQR code', "That QR code isn't an AviQR restaurant code.", [
        { text: 'Try again', onPress: () => { lockRef.current = false; } },
      ]);
      return;
    }
    router.replace(target);
  };

  if (!permission) return <View style={ss.screen} />;

  if (!permission.granted) {
    return (
      <View style={ss.screen}>
        <Text style={ss.icon}>📷</Text>
        <Text style={ss.title}>Camera access needed</Text>
        <Text style={ss.sub}>AviQR needs your camera to scan restaurant QR codes.</Text>
        <TouchableOpacity style={ss.primaryBtn} onPress={requestPermission}>
          <Text style={ss.primaryBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.closeBtn} onPress={() => router.back()}>
          <Text style={ss.closeBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={ss.overlay} pointerEvents="box-none">
        <TouchableOpacity style={ss.backBtn} onPress={() => router.back()}>
          <Text style={ss.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={ss.frame} />
        <Text style={ss.hint}>Point your camera at an AviQR code</Text>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30, backgroundColor: Colors.background },
  icon: { fontSize: 40 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, textAlign: 'center' },
  sub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 19 },
  primaryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, height: 46, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  closeBtn: { paddingVertical: 10 },
  closeBtnText: { color: Colors.gray500, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  frame: { width: 240, height: 240, borderRadius: Radius.xl, borderWidth: 3, borderColor: Colors.white },
  hint: { color: '#fff', marginTop: 20, fontSize: FontSize.base, fontWeight: '600' },
});
