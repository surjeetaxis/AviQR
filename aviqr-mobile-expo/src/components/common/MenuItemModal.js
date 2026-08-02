import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Modal, ScrollView } from 'react-native';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Colors, FontSize, Radius } from '../../theme/index.js';

export const EMPTY_MENU_ITEM = {
  name: '', price: '', description: '', veg: true, spicy: false, popular: false,
  imageUrl: '', videoUrl: '', modelUrl: '', mediaType: 'NONE',
  nameHi: '', nameTa: '', nameTe: '',
};

// Add/Edit Item modal, shared by the normal Menu screen (menu.js) and the OCR
// scan-result review screen (scan-menu.js) so editing a scanned item looks and
// behaves exactly like editing a regular menu item. The caller owns persistence —
// onSave just receives the finished form (menuApi call, or a local array update
// for OCR review, which only sends the edited item to the backend on final approve).
export function MenuItemModal({ visible, title, submitLabel, initialForm, onSave, onClose }) {
  const [form, setForm] = useState(initialForm || EMPTY_MENU_ITEM);
  const [saving, setSaving] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  useEffect(() => {
    if (visible) { setForm(initialForm || EMPTY_MENU_ITEM); setShowTranslations(false); }
  }, [visible]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.price) { Alert.alert('Required', 'Name and price are required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={ss.modal} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={ss.modalHeader}>
          <Text style={ss.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
        </View>

        <Input label="Item Name *" placeholder="Paneer Tikka" value={form.name} onChangeText={v => set('name', v)} />
        <Input label="Price (₹) *" placeholder="280" value={form.price} onChangeText={v => set('price', v)} keyboardType="decimal-pad" />
        <Input label="Description" placeholder="Brief description" value={form.description} onChangeText={v => set('description', v)} multiline />
        <View style={ss.switches}>
          {[['Vegetarian', 'veg'], ['Spicy', 'spicy'], ['Popular', 'popular']].map(([l, k]) => (
            <View key={k} style={ss.switchRow}>
              <Text style={ss.switchLabel}>{l}</Text>
              <Switch value={!!form[k]} onValueChange={v => set(k, v)} trackColor={{ true: Colors.primary }} />
            </View>
          ))}
        </View>

        <Text style={ss.sectionLabel}>Media</Text>
        <View style={ss.mediaTypeRow}>
          {['NONE', 'VIDEO', 'MODEL_3D'].map(mt => (
            <TouchableOpacity key={mt} style={[ss.mediaChip, form.mediaType === mt && ss.mediaChipActive]} onPress={() => set('mediaType', mt)}>
              <Text style={[ss.mediaChipTxt, form.mediaType === mt && ss.mediaChipTxtActive]}>{mt === 'NONE' ? 'Photo' : mt === 'VIDEO' ? 'Video' : '3D Model'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Image URL" placeholder="https://…jpg" value={form.imageUrl} onChangeText={v => set('imageUrl', v)} autoCapitalize="none" />
        {form.mediaType === 'VIDEO' && <Input label="Video URL" placeholder="https://…mp4 or YouTube link" value={form.videoUrl} onChangeText={v => set('videoUrl', v)} autoCapitalize="none" />}
        {form.mediaType === 'MODEL_3D' && <Input label="3D Model URL (.glb/.gltf)" placeholder="https://…glb" value={form.modelUrl} onChangeText={v => set('modelUrl', v)} autoCapitalize="none" />}

        <TouchableOpacity onPress={() => setShowTranslations(s => !s)}>
          <Text style={ss.translationsToggle}>{showTranslations ? '▾' : '▸'} Translated names (optional)</Text>
        </TouchableOpacity>
        {showTranslations && (
          <>
            <Input label="Hindi name" value={form.nameHi} onChangeText={v => set('nameHi', v)} />
            <Input label="Tamil name" value={form.nameTa} onChangeText={v => set('nameTa', v)} />
            <Input label="Telugu name" value={form.nameTe} onChangeText={v => set('nameTe', v)} />
          </>
        )}

        <Button title={saving ? 'Saving…' : submitLabel} onPress={handleSave} loading={saving} style={{ marginTop: 16 }} />
        <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
      </ScrollView>
    </Modal>
  );
}

const ss = StyleSheet.create({
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  switches: { flexDirection: 'row', gap: 10, marginTop: 4 },
  switchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 10 },
  switchLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginTop: 12, marginBottom: 8 },
  mediaTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  mediaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.gray100, borderWidth: 1.5, borderColor: 'transparent' },
  mediaChipActive: { backgroundColor: Colors.primary },
  mediaChipTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  mediaChipTxtActive: { color: Colors.white },
  translationsToggle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, marginTop: 14, marginBottom: 8 },
});
