import { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Linking, StyleSheet, Alert } from 'react-native';
import { shopApi, qrApi, brandApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function SupplierQrCodesScreen() {
  const [brand, setBrand]     = useState(null);
  const [brandQr, setBrandQr] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [saving, setSaving]   = useState(false);
  const [codes, setCodes]     = useState([]);
  const [outletCount, setOutletCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [brandRes, shopsRes] = await Promise.allSettled([brandApi.getMine(), shopApi.getMyShops()]);
      let brandRow = null;
      if (brandRes.status === 'fulfilled') brandRow = brandRes.value.data.data;
      setBrand(brandRow);
      if (brandRow) {
        try { const qrRes = await brandApi.createQr(brandRow.id); setBrandQr(qrRes.data.data); } catch {}
      }
      const outlets = shopsRes.status === 'fulfilled' ? (shopsRes.value.data.data || []) : [];
      setOutletCount(outlets.length);
      const results = await Promise.all(outlets.map(o =>
        qrApi.getByShop(o.id).then(res => (res.data.data || []).map(c => ({ ...c, outletName: o.name }))).catch(() => [])
      ));
      setCodes(results.flat());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createBrand = async () => {
    if (!brandName.trim()) return;
    setSaving(true);
    try {
      const res = await brandApi.save({ name: brandName.trim() });
      setBrand(res.data.data);
      const qrRes = await brandApi.createQr(res.data.data.id);
      setBrandQr(qrRes.data.data);
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="QR Codes" />
      <FlatList
        data={codes}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <Text style={ss.subheading}>{codes.length} QR codes across {outletCount} outlets</Text>
            {brand ? (
              brandQr && (
                <View style={ss.brandCard}>
                  <Text style={ss.brandTitle}>Main Brand QR</Text>
                  <Image source={{ uri: qrApi.imageUrl(brandQr.qrCode) }} style={ss.qrImage} />
                  <Text style={ss.targetUrl} numberOfLines={2}>{brandQr.targetUrl}</Text>
                  <TouchableOpacity style={ss.downloadBtn} onPress={() => Linking.openURL(qrApi.imageUrl(brandQr.qrCode))}>
                    <Text style={ss.downloadTxt}>⬇ Download</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={ss.setupCard}>
                <Text style={ss.brandTitle}>Set up your Brand QR</Text>
                <Text style={ss.setupHint}>Name your brand once to get one QR that lists all your outlets to customers.</Text>
                <Input placeholder="e.g. Spice Route Group" value={brandName} onChangeText={setBrandName} />
                <Button title={saving ? 'Saving…' : 'Create Brand QR'} onPress={createBrand} loading={saving} disabled={!brandName.trim()} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={!loading && <EmptyState icon="📱" title="No QR codes" subtitle="Go to an outlet to generate QR codes" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.label || item.tableLabel || `Table ${item.tableNumber}`}</Text>
              <Text style={ss.sub}>{item.outletName} · {item.scanCount || 0} scans</Text>
            </View>
            <View style={[ss.badge, { backgroundColor: item.active ? '#DCFCE7' : '#F3F4F6' }]}>
              <Text style={[ss.badgeTxt, { color: item.active ? '#059669' : '#6B7280' }]}>{item.active ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  subheading: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 12 },
  brandCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, alignItems: 'center', marginBottom: 16, ...Shadow.sm },
  setupCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, marginBottom: 16, ...Shadow.sm },
  brandTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  setupHint: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 12 },
  qrImage: { width: 180, height: 180, borderRadius: Radius.md, marginBottom: 10 },
  targetUrl: { fontSize: 11, color: Colors.gray400, textAlign: 'center', marginBottom: 10 },
  downloadBtn: { backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  downloadTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
