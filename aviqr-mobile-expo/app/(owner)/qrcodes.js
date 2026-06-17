import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
// Icon not needed — using emoji
// Toast replaced with Alert
import { qrApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
// Header removed - expo-router handles navigation
import { Button } from '../../src/components/common/Button.js';
import { Card } from '../../src/components/common/Card.js';
// BottomSheet replaced with Modal
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function QRCodesScreen() {
  const { user } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';
  const [codes, setCodes]     = useState([]);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    try {
      const res = await qrApi.getByShop(shopId);
      setCodes(res.data.data || []);
    } catch {}
  };

  const createQR = async (type, group, label) => {
    setCreating(true);
    try {
      await qrApi.create(shopId, { type, group, label });
      await loadCodes();
      Toast.show({ type: 'success', text1: 'QR Code created!' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to create QR' }); }
    finally { setCreating(false); }
  };

  const shareQR = async (code) => {
    try {
      await Share.share({ message: `Scan this QR to order from our restaurant: ${code.targetUrl}`, url: code.targetUrl, title: code.label });
    } catch {}
  };

  const QRCard = ({ code }) => (
    <Card style={styles.qrCard}>
      <TouchableOpacity onPress={() => setPreview(code)} style={styles.qrLeft}>
        <QRCode value={code.targetUrl || 'https://aviqr.in'} size={72} color={Colors.gray900} backgroundColor="transparent" />
      </TouchableOpacity>
      <View style={styles.qrInfo}>
        <Text style={styles.qrLabel}>{code.label || 'QR Code'}</Text>
        <View style={styles.qrTypeBadge}>
          <Text style={styles.qrTypeText}>{code.type}</Text>
        </View>
        <Text style={styles.qrScans}>👁 {code.scanCount || 0} scans</Text>
        <Text style={styles.qrUrl} numberOfLines={1}>{code.targetUrl}</Text>
      </View>
      <View style={styles.qrActions}>
        <TouchableOpacity onPress={() => shareQR(code)} style={styles.qrActionBtn}>
          <Icon name="share-2" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.qrActionBtn}>
          <Icon name="download" size={16} color={Colors.gray500} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Header title="QR Codes" subtitle={`${codes.length} codes`} />

      <FlatList
        data={codes}
        keyExtractor={c => c.id}
        renderItem={({ item }) => <QRCard code={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={styles.createRow}>
            {[
              { type: 'SHOP',  label: 'Shop QR',  emoji: '🏪' },
              { type: 'TABLE', label: 'Table QR',  emoji: '🪑' },
              { type: 'GROUP', label: 'Group QR',  emoji: '📋' },
            ].map(t => (
              <TouchableOpacity key={t.type} style={styles.createBtn} onPress={() => createQR(t.type, null, t.label)} disabled={creating}>
                <Text style={styles.createEmoji}>{t.emoji}</Text>
                <Text style={styles.createLabel}>{creating ? '...' : `+ ${t.label}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      {/* Preview modal */}
      <BottomSheet visible={!!preview} onClose={() => setPreview(null)} height={400}>
        {preview && (
          <View style={styles.previewSheet}>
            <Text style={styles.previewTitle}>{preview.label}</Text>
            <View style={styles.previewQR}>
              <QRCode value={preview.targetUrl} size={200} color={Colors.gray900} backgroundColor="white" />
            </View>
            <Text style={styles.previewUrl}>{preview.targetUrl}</Text>
            <View style={styles.previewActions}>
              <Button title="Share" onPress={() => shareQR(preview)} variant="outline" style={{ flex: 1 }} />
              <Button title="Download PNG" onPress={() => {}} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  createRow:     { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  createBtn:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  createEmoji:   { fontSize: 22 },
  createLabel:   { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  qrCard:        { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  qrLeft:        { backgroundColor: Colors.gray50, padding: 8, borderRadius: Radius.md },
  qrInfo:        { flex: 1, gap: 4 },
  qrLabel:       { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  qrTypeBadge:   { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  qrTypeText:    { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },
  qrScans:       { fontSize: FontSize.xs, color: Colors.gray500 },
  qrUrl:         { fontSize: FontSize.xs, color: Colors.gray400, fontFamily: 'monospace' },
  qrActions:     { gap: 8 },
  qrActionBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  previewSheet:  { alignItems: 'center', gap: 16 },
  previewTitle:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  previewQR:     { backgroundColor: Colors.white, padding: 20, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border },
  previewUrl:    { fontSize: FontSize.xs, color: Colors.gray400, fontFamily: 'monospace' },
  previewActions:{ flexDirection: 'row', gap: 10, width: '100%' },
});