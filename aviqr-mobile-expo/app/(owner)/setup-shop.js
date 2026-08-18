import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { shopApi, menuApi, qrApi, planApi, ocrApi } from '../../src/api/index.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const STEPS = ['Choose plan', 'Create shop', 'Add menu', 'Get QR code', 'Go live!'];
// Mobile onboarding only ever offers the free Starter plan — Growth/Business/
// Enterprise are web-only, so new shops created in-app always start free and
// upgrade later on the web (aviqr.com), same as web's Onboarding.jsx which
// still offers the full KNOWN_PLAN_KEYS set.
const KNOWN_PLAN_KEYS = ['STARTER'];

// Mobile has no shop-creation wizard today — owners who register in-app have
// no path to create their first shop. This mirrors the web's real, API-wired
// Onboarding.jsx (choose plan → create shop → add menu → QR → done).
export default function SetupShopScreen() {
  const { user, linkShop } = useAuth();
  const { ref: refParam } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [shopId, setShopId] = useState(null);

  // Step 1
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('STARTER');

  // Step 2
  const [shop, setShop] = useState({ name: '', phone: '', city: '', address: '' });
  // Pre-fills from a ?ref= deep link if the app was opened that way; otherwise
  // the owner can paste in a code another shop shared with them.
  const [referralCode, setReferralCode] = useState(refParam ? String(refParam).toUpperCase() : '');
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  // Step 3
  const [menuMode, setMenuMode] = useState('ocr'); // 'ocr' | 'manual'
  const [item, setItem] = useState({ categoryName: '', name: '', price: '' });
  const [asset, setAsset] = useState(null);
  const [ocrJob, setOcrJob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const pollRef = useRef(null);

  // Step 4
  const [qrDone, setQrDone] = useState(false);

  useEffect(() => {
    planApi.listPublic('SHOP').then(res => {
      const all = (res.data?.data || []).filter(p => KNOWN_PLAN_KEYS.includes(p.planKey));
      all.sort((a, b) => a.sortOrder - b.sortOrder);
      setPlans(all);
    }).catch(() => setPlans([]));
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow location access to auto-fill your coordinates.'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch { Alert.alert('Could not get your location'); }
    finally { setLocating(false); }
  };

  const handleCreateShop = async () => {
    if (!shop.name.trim()) return Alert.alert('Required', 'Restaurant name is required');
    setBusy(true);
    try {
      const res = await shopApi.create({
        name: shop.name.trim(), phone: shop.phone.trim(), city: shop.city.trim(), address: shop.address.trim(),
        latitude: coords?.latitude, longitude: coords?.longitude,
        subscriptionPlan: selectedPlan,
        referredByCode: referralCode.trim() || undefined,
      });
      const newShopId = res.data?.data?.id;
      if (!newShopId) throw new Error('Shop created but no ID returned');
      setShopId(newShopId);
      await linkShop(newShopId);
      setStep(3);
    } catch (e) {
      Alert.alert('Failed to create shop', e.response?.data?.message || e.message);
    } finally { setBusy(false); }
  };

  const pickFrom = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access.`);
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setAsset(result.assets[0]);
    setOcrJob(null);
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const handleScan = async () => {
    if (!asset || !shopId) return;
    setUploading(true);
    try {
      const res = await ocrApi.upload(shopId, asset);
      const job = res.data.data;
      setOcrJob(job);
      pollRef.current = setInterval(async () => {
        try {
          const r = await ocrApi.getJob(job.id);
          const j = r.data.data;
          setOcrJob(j);
          if (j.status === 'COMPLETED' || j.status === 'FAILED') stopPolling();
        } catch { stopPolling(); }
      }, 2000);
    } catch (e) {
      Alert.alert('Scan failed', e.response?.data?.message || 'Could not start OCR scan.');
    } finally { setUploading(false); }
  };

  const handleApproveOcr = async () => {
    if (!ocrJob) return;
    setApproving(true);
    try {
      await ocrApi.approve(ocrJob.id);
      setAddedCount(ocrJob.extractedItems?.length || 0);
      setOcrDone(true);
    } catch (e) {
      Alert.alert('Failed to add items', e.response?.data?.message);
    } finally { setApproving(false); }
  };

  const handleAddItem = async () => {
    if (!item.name.trim() || !item.price) return Alert.alert('Required', 'Item name and price are required');
    setBusy(true);
    try {
      let catId;
      if (item.categoryName.trim()) {
        const catRes = await menuApi.createCategory({ shopId, name: item.categoryName.trim() });
        catId = catRes.data?.data?.id;
      }
      await menuApi.createItem({ shopId, categoryId: catId || null, name: item.name.trim(), price: Number(item.price), available: true });
      setStep(4);
    } catch (e) {
      Alert.alert('Failed to add item', e.response?.data?.message);
    } finally { setBusy(false); }
  };

  const handleGenerateQR = async () => {
    setBusy(true);
    try {
      await qrApi.create(shopId, { type: 'TABLE', label: 'Table 1' });
      setQrDone(true);
      setStep(5);
    } catch (e) {
      Alert.alert('Failed to generate QR', e.response?.data?.message);
    } finally { setBusy(false); }
  };

  const selectedPlanObj = plans.find(p => p.planKey === selectedPlan);
  const isPaidPlan = selectedPlanObj && selectedPlanObj.price > 0;

  const groupedItems = (ocrJob?.extractedItems || []).reduce((acc, it) => {
    const cat = it.category || 'Uncategorised';
    (acc[cat] ||= []).push(it);
    return acc;
  }, {});

  return (
    <View style={ss.screen}>
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 60 }}>
        <View style={ss.progressRow}>
          {STEPS.map((label, i) => (
            <View key={label} style={ss.progressItem}>
              <View style={[ss.dot, step > i + 1 ? ss.dotDone : step === i + 1 ? ss.dotActive : ss.dotFuture]}>
                <Text style={{ color: step >= i + 1 ? '#fff' : Colors.gray400, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={ss.progressLabel} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={ss.card}>
          {step === 1 && (
            <>
              <Text style={ss.h2}>Choose your plan</Text>
              <Text style={ss.sub}>You start free on Starter. Upgrade to Growth or Business anytime from the web.</Text>
              {plans.map(p => {
                const isFree = p.price === 0;
                const selected = selectedPlan === p.planKey;
                return (
                  <TouchableOpacity key={p.planKey} style={[ss.planCard, selected && ss.planCardActive]} onPress={() => setSelectedPlan(p.planKey)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={ss.planName}>{p.label}</Text>
                      <Text style={ss.planPrice}>{p.planKey === 'ENTERPRISE' ? 'Contact sales' : isFree ? 'Free forever' : `₹${p.price}/mo`}</Text>
                    </View>
                    {!isFree && p.planKey !== 'ENTERPRISE' && <Text style={ss.planTrial}>3 months free trial</Text>}
                  </TouchableOpacity>
                );
              })}
              <Button title={`Continue with ${selectedPlanObj?.label || selectedPlan}`} onPress={() => setStep(2)} style={{ marginTop: 12 }} />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={ss.h2}>Set up your restaurant</Text>
              <Text style={ss.sub}>This takes 30 seconds. You can always update details later.</Text>
              <Input label="Restaurant name *" placeholder="e.g. Spice Garden" value={shop.name} onChangeText={v => setShop(s => ({ ...s, name: v }))} />
              <Input label="Phone number" placeholder="9900112233" keyboardType="phone-pad" value={shop.phone} onChangeText={v => setShop(s => ({ ...s, phone: v }))} />
              <Input label="City" placeholder="Bengaluru" value={shop.city} onChangeText={v => setShop(s => ({ ...s, city: v }))} />
              <Input label="Address" placeholder="123 MG Road" value={shop.address} onChangeText={v => setShop(s => ({ ...s, address: v }))} />
              <Input label="Referral code (optional)" placeholder="e.g. AB12CD" value={referralCode} onChangeText={v => setReferralCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} />
              <Button title={locating ? 'Getting location…' : coords ? 'Location captured ✓' : 'Use current location'} variant="outline" size="sm" onPress={useCurrentLocation} disabled={locating} style={{ marginBottom: 12 }} />
              <Button title={busy ? 'Creating…' : 'Create my restaurant'} onPress={handleCreateShop} loading={busy} />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={ss.h2}>Add your menu</Text>
              <Text style={ss.sub}>Scan a photo of your printed menu, or add your first dish by hand.</Text>
              <View style={ss.modeRow}>
                <TouchableOpacity style={[ss.modeTab, menuMode === 'ocr' && ss.modeTabActive]} onPress={() => setMenuMode('ocr')}>
                  <Text style={[ss.modeTabTxt, menuMode === 'ocr' && ss.modeTabTxtActive]}>📷 Scan photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ss.modeTab, menuMode === 'manual' && ss.modeTabActive]} onPress={() => setMenuMode('manual')}>
                  <Text style={[ss.modeTabTxt, menuMode === 'manual' && ss.modeTabTxtActive]}>✍️ Add manually</Text>
                </TouchableOpacity>
              </View>

              {menuMode === 'ocr' ? (
                ocrDone ? (
                  <Text style={ss.successBox}>✓ {addedCount} item{addedCount === 1 ? '' : 's'} added to your menu.</Text>
                ) : (
                  <>
                    <TouchableOpacity style={ss.uploadBox} onPress={() => pickFrom('library')}>
                      {asset ? <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} /> : <Text style={{ color: Colors.gray400, fontSize: 12 }}>No photo selected</Text>}
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      <Button title="Take Photo" variant="outline" size="sm" onPress={() => pickFrom('camera')} style={{ flex: 1 }} />
                      <Button title="Choose Photo" variant="outline" size="sm" onPress={() => pickFrom('library')} style={{ flex: 1 }} />
                    </View>
                    <Button title={uploading ? 'Uploading…' : 'Scan Menu'} onPress={handleScan} loading={uploading} disabled={!asset || ocrJob?.status === 'PROCESSING'} style={{ marginBottom: 10 }} />
                    {ocrJob?.status === 'PROCESSING' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <ActivityIndicator color={Colors.primary} size="small" />
                        <Text style={{ fontSize: FontSize.sm, color: Colors.gray500 }}>Extracting items…</Text>
                      </View>
                    )}
                    {ocrJob?.status === 'COMPLETED' && (
                      <>
                        {Object.entries(groupedItems).map(([cat, items]) => (
                          <View key={cat} style={{ marginBottom: 8 }}>
                            <Text style={ss.categoryLabel}>{cat}</Text>
                            {items.map((it, idx) => (
                              <View key={idx} style={ss.ocrItemRow}>
                                <Text style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '600' }}>{it.name}</Text>
                                <Text style={{ fontSize: FontSize.sm, fontWeight: '700' }}>₹{it.price}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                        <Button title={approving ? 'Adding…' : 'Approve & add to menu'} onPress={handleApproveOcr} loading={approving} style={{ marginTop: 8 }} />
                      </>
                    )}
                  </>
                )
              ) : (
                <>
                  <Input label="Category (optional)" placeholder="e.g. Starters" value={item.categoryName} onChangeText={v => setItem(i => ({ ...i, categoryName: v }))} />
                  <Input label="Dish name *" placeholder="e.g. Butter Chicken" value={item.name} onChangeText={v => setItem(i => ({ ...i, name: v }))} />
                  <Input label="Price (₹) *" placeholder="280" keyboardType="decimal-pad" value={item.price} onChangeText={v => setItem(i => ({ ...i, price: v }))} />
                  <Button title={busy ? 'Adding…' : 'Add dish'} onPress={handleAddItem} loading={busy} />
                </>
              )}
              <Button title={ocrDone || item.name.trim() ? 'Continue' : 'Skip for now'} variant="ghost" onPress={() => setStep(4)} style={{ marginTop: 10 }} />
            </>
          )}

          {step === 4 && (
            <>
              <Text style={ss.h2}>Generate your QR code</Text>
              <Text style={ss.sub}>Customers scan this at their table to view your menu and order.</Text>
              <View style={ss.qrBox}><Text style={{ fontSize: 40 }}>📱</Text></View>
              <Text style={{ fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', marginBottom: 16 }}>
                Your QR menu link: aviqr.com/menu/{shopId?.slice(0, 8)}…
              </Text>
              <Button title="Skip for now" variant="ghost" onPress={() => setStep(5)} style={{ marginBottom: 8 }} />
              <Button title={busy ? 'Generating…' : 'Generate QR'} onPress={handleGenerateQR} loading={busy} />
            </>
          )}

          {step === 5 && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
              <Text style={[ss.h2, { textAlign: 'center' }]}>You're all set!</Text>
              <Text style={[ss.sub, { textAlign: 'center', marginBottom: 16 }]}>
                Your restaurant <Text style={{ fontWeight: '700' }}>{shop.name}</Text> is live on AviQR.
              </Text>
              {isPaidPlan && (
                <Text style={ss.trialBanner}>🎁 Your {selectedPlanObj.label} plan's 3-month free trial has started — no payment needed until it ends.</Text>
              )}
              <Button title="Open Dashboard" onPress={() => router.replace('/(owner)/dashboard')} style={{ width: '100%', marginTop: 16 }} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingTop: 12 },
  progressItem: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Colors.primary }, dotActive: { backgroundColor: Colors.gray900 }, dotFuture: { backgroundColor: Colors.gray100, borderWidth: 1.5, borderColor: Colors.border },
  progressLabel: { fontSize: 9.5, color: Colors.gray500, textAlign: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.sm },
  h2: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginBottom: 4 },
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 16, lineHeight: 18 },
  planCard: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, marginBottom: 10 },
  planCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  planName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  planPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  planTrial: { fontSize: 10.5, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, alignSelf: 'flex-start' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.gray100, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  modeTabActive: { backgroundColor: Colors.gray900 },
  modeTabTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700 },
  modeTabTxtActive: { color: Colors.white },
  uploadBox: { height: 140, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  categoryLabel: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray700, marginBottom: 4 },
  ocrItemRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  successBox: { fontSize: FontSize.sm, color: '#166534', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: Radius.md, padding: 12 },
  qrBox: { width: 100, height: 100, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  trialBanner: { fontSize: FontSize.sm, color: '#0F6E56', backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 10, textAlign: 'center' },
});
