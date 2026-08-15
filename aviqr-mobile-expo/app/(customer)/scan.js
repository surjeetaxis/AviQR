import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Colors, FontSize, Radius } from '../../src/theme/index.js';

function parseQuery(qs) {
  const out = {};
  if (!qs) return out;
  qs.split('&').forEach(pair => {
    const [k, v = ''] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
}

// Mirrors QrService.buildUrl on the backend (order-qr-service/QrService.java)
// — the URL shapes a shop/table/mall/brand/hotel QR code actually encodes
// (https://aviqr.com/menu/{shopId}?table=…, /food-court/{mallId}, /brand/{brandId},
// /hotel-services/{hotelId}?room=…). Parsed by hand rather than the URL global
// to avoid depending on a Hermes polyfill that may not be present.
function resolveTarget(raw) {
  const m = /^https?:\/\/[^/]+(\/[^?#]*)(?:\?([^#]*))?/.exec((raw || '').trim());
  if (!m) return null;
  const [, path, qs] = m;
  const q = parseQuery(qs);
  let mm;
  if ((mm = /^\/menu\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/(customer)/shop/menu', params: { shopId: mm[1], tableNumber: q.table } };
  }
  if ((mm = /^\/food-court\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/food-court/[mallId]', params: { mallId: mm[1] } };
  }
  if ((mm = /^\/brand\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/brand/[brandId]', params: { brandId: mm[1] } };
  }
  if ((mm = /^\/hotel-services\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/(customer)/hotel-services', params: { hotelId: mm[1], room: q.room, area: q.area } };
  }
  return null;
}

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
