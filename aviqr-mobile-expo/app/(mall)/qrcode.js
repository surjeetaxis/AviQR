import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { mallApi, qrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// One QR for the whole food court — scan lands on the public food-court
// restaurant list (aviqr-ui-web's /food-court/:mallId route). The server
// renders the actual QR image (qrApi.imageUrl), so this is a real, working
// code — not a mockup.
export default function MallQrScreen() {
  const [qr, setQr] = useState(null);
  const [mallName, setMallName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const mallsRes = await mallApi.getMyMalls();
        const mall = (mallsRes.data.data || [])[0];
        if (!mall) return;
        setMallName(mall.name);
        const res = await mallApi.createMallQr(mall.id);
        setQr(res.data.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Food Court QR" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Food Court QR" />
      <View style={ss.body}>
        <Text style={ss.hint}>One QR for the whole food court — scan lands on the restaurant list</Text>
        {qr ? (
          <View style={ss.card}>
            <Image source={{ uri: qrApi.imageUrl(qr.qrCode) }} style={ss.qrImage} />
            <Text style={ss.mallName}>{mallName}</Text>
            <Text style={ss.targetUrl} numberOfLines={2}>{qr.targetUrl}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
              <TouchableOpacity style={ss.actionBtn} onPress={() => Linking.openURL(qrApi.imageUrl(qr.qrCode))}>
                <Text style={ss.actionTxt}>⬇ Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.actionBtn} onPress={() => Linking.openURL(qr.targetUrl)}>
                <Text style={ss.actionTxt}>↗ Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : <Text style={ss.hint}>Could not load the food court QR. Pull to retry later.</Text>}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  body: { padding: Spacing.lg, alignItems: 'center' },
  hint: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, alignItems: 'center', width: '100%', maxWidth: 340, ...Shadow.sm },
  qrImage: { width: 220, height: 220, borderRadius: Radius.md },
  mallName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, marginTop: 14 },
  targetUrl: { fontSize: 11, color: Colors.gray400, marginTop: 6, textAlign: 'center' },
  actionBtn: { flex: 1, backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  actionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
});
