import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { ocrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Button } from '../../src/components/common/Button.js';
import { MenuItemModal, EMPTY_MENU_ITEM } from '../../src/components/common/MenuItemModal.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// OcrJob.ExtractedItem (backend) <-> MenuItemModal's form shape.
function extractedItemToForm(item) {
  return {
    ...EMPTY_MENU_ITEM,
    name: item.name || '',
    description: item.description || '',
    price: String(item.price ?? ''),
    veg: item.veg !== false,
    spicy: !!item.spicy,
    popular: !!item.popular,
    nameHi: item.nameHi || '', nameTa: item.nameTa || '', nameTe: item.nameTe || '',
    imageUrl: item.imageUrl || '', videoUrl: item.videoUrl || '', modelUrl: item.modelUrl || '',
    mediaType: item.mediaType || 'NONE',
  };
}

function formToExtractedItem(form, original) {
  return {
    ...original,
    name: form.name, description: form.description, price: String(form.price),
    veg: form.veg, spicy: !!form.spicy, popular: !!form.popular,
    nameHi: form.nameHi, nameTa: form.nameTa, nameTe: form.nameTe,
    imageUrl: form.imageUrl, videoUrl: form.videoUrl, modelUrl: form.modelUrl,
    mediaType: form.mediaType,
  };
}

const STATUS_CFG = {
  COMPLETED:  { color: '#059669', bg: '#DCFCE7', label: 'Completed' },
  FAILED:     { color: '#DC2626', bg: '#FEE2E2', label: 'Failed' },
  PROCESSING: { color: '#2563EB', bg: '#DBEAFE', label: 'Processing' },
  PENDING:    { color: '#2563EB', bg: '#DBEAFE', label: 'Pending' },
};

export default function ScanMenuScreen() {
  const shopId = useActiveShopId();
  const pollRef = useRef(null);

  const [asset, setAsset]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [job, setJob]         = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved]   = useState(false);

  // Seed the editable copy once a scan lands on COMPLETED — polling stops right after,
  // so this doesn't re-run and clobber in-progress edits on later ticks.
  useEffect(() => {
    if (job?.status === 'COMPLETED') setEditedItems(job.extractedItems || []);
  }, [job?.id, job?.status]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await ocrApi.getJob(jobId);
        const j = res.data.data;
        setJob(j);
        if (j.status === 'COMPLETED' || j.status === 'FAILED') stopPolling();
      } catch { stopPolling(); }
    }, 2000);
  };

  const pickFrom = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access to scan a menu.`);
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setAsset(result.assets[0]);
    setJob(null);
    setApproved(false);
  };

  const handleScan = async () => {
    if (!asset || !shopId) return;
    setUploading(true);
    try {
      const res = await ocrApi.upload(shopId, asset);
      const startedJob = res.data.data;
      setJob(startedJob);
      startPolling(startedJob.id);
    } catch (err) {
      Alert.alert('Scan failed', err.response?.data?.message || 'Could not start OCR scan. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;
    setApproving(true);
    try {
      await ocrApi.approve(job.id, editedItems);
      setApproved(true);
    } catch (err) {
      Alert.alert('Approve failed', err.response?.data?.message || 'Could not add items to your menu.');
    } finally {
      setApproving(false);
    }
  };

  const saveEditedItem = (form) => {
    setEditedItems(prev => prev.map((it, i) => (i === editIdx ? formToExtractedItem(form, it) : it)));
    setEditIdx(null);
  };

  const groupedItems = editedItems.reduce((acc, item, idx) => {
    const cat = item.category || 'Uncategorised';
    (acc[cat] ||= []).push({ ...item, _idx: idx });
    return acc;
  }, {});

  return (
    <View style={ss.screen}>
      <PageHeader title="Scan Menu (OCR)" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.hint}>Take a photo of your printed menu or choose one from your gallery — AviQR will read it and suggest menu items.</Text>

        <TouchableOpacity style={ss.uploadBox} onPress={() => pickFrom('library')}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={ss.preview} />
          ) : (
            <View style={ss.placeholder}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={ss.placeholderTxt}>No photo selected</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={ss.pickRow}>
          <Button title="Take Photo" onPress={() => pickFrom('camera')} variant="outline" size="sm" style={{ flex: 1 }} />
          <Button title="Choose from Gallery" onPress={() => pickFrom('library')} variant="outline" size="sm" style={{ flex: 1 }} />
        </View>

        <Button
          title={uploading ? 'Uploading…' : 'Scan Menu'}
          onPress={handleScan}
          loading={uploading}
          disabled={!asset || uploading || job?.status === 'PROCESSING'}
          style={{ marginTop: 14 }}
        />

        {job && (
          <View style={ss.resultCard}>
            <View style={ss.resultHeader}>
              <Text style={ss.resultTitle}>Scan result</Text>
              <View style={[ss.badge, { backgroundColor: (STATUS_CFG[job.status] || STATUS_CFG.PENDING).bg }]}>
                <Text style={[ss.badgeTxt, { color: (STATUS_CFG[job.status] || STATUS_CFG.PENDING).color }]}>
                  {(STATUS_CFG[job.status] || STATUS_CFG.PENDING).label}
                </Text>
              </View>
            </View>

            {job.status === 'PROCESSING' && (
              <View style={ss.processingRow}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={ss.processingTxt}>Extracting items from your menu photo…</Text>
              </View>
            )}

            {job.status === 'FAILED' && (
              <Text style={ss.errorTxt}>⚠ {job.errorMessage || 'OCR extraction failed. Please try a clearer photo.'}</Text>
            )}

            {job.status === 'COMPLETED' && (
              approved ? (
                <View>
                  <Text style={ss.successTxt}>✓ Items added to your menu.</Text>
                  <Button title="Go to Menu" onPress={() => router.back()} variant="ghost" style={{ marginTop: 8 }} />
                </View>
              ) : (
                <>
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <View key={category} style={{ marginBottom: 12 }}>
                      <Text style={ss.categoryLabel}>{category}</Text>
                      {items.map((item) => (
                        <View key={item._idx} style={ss.itemRow}>
                          <View style={[ss.vegDot, { backgroundColor: item.veg !== false ? '#1D9E75' : '#DC2626' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={ss.itemName}>{item.name}</Text>
                            {!!item.description && <Text style={ss.itemDesc}>{item.description}</Text>}
                          </View>
                          <Text style={ss.confidence}>{Math.round((item.confidence || 0) * 100)}%</Text>
                          <Text style={ss.itemPrice}>₹{item.price}</Text>
                          <TouchableOpacity onPress={() => setEditIdx(item._idx)}>
                            <Text style={{ color: Colors.gray400, fontSize: 16 }}>✏️</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                  <Button
                    title={approving ? 'Adding to menu…' : 'Approve & Add to Menu'}
                    onPress={handleApprove}
                    loading={approving}
                    style={{ marginTop: 8 }}
                  />
                </>
              )
            )}
          </View>
        )}
      </ScrollView>

      {editIdx !== null && (
        <MenuItemModal
          visible={editIdx !== null}
          title="Edit scanned item"
          submitLabel="Save changes"
          initialForm={extractedItemToForm(editedItems[editIdx])}
          onSave={saveEditedItem}
          onClose={() => setEditIdx(null)}
        />
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hint: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14, lineHeight: 18 },
  uploadBox: { height: 200, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { alignItems: 'center', gap: 8 },
  placeholderTxt: { fontSize: FontSize.sm, color: Colors.gray400 },
  pickRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  resultCard: { marginTop: 20, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  processingTxt: { fontSize: FontSize.sm, color: Colors.gray500 },
  errorTxt: { fontSize: FontSize.sm, color: Colors.error },
  successTxt: { fontSize: FontSize.sm, color: '#059669', fontWeight: '700' },
  categoryLabel: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray700, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  vegDot: { width: 10, height: 10, borderRadius: 2, flexShrink: 0 },
  itemName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  itemDesc: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  confidence: { fontSize: 10, fontWeight: '700', color: Colors.gray400, backgroundColor: Colors.gray100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  itemPrice: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, minWidth: 50, textAlign: 'right' },
});
