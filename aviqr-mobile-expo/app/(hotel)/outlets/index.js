import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, RefreshControl, Switch } from 'react-native';
import { router } from 'expo-router';
import { hotelApi, hotelOutletApi } from '../../../src/api/index.js';
import { confirmAction } from '../../../src/utils/confirmAction.js';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../../src/theme/index.js';

const OUTLET_TYPES = ['RESTAURANT','BAR','SPA','GYM','POOL','SHOP','ACTIVITY','BANQUET','KIDS_CLUB','BUSINESS_CENTER','LAUNDRY','CONCIERGE','OTHER'];

export default function OutletsScreen() {
  const [hotelId, setHotelId]   = useState(null);
  const [outlets, setOutlets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRef]    = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [name, setName]         = useState('');
  const [outletType, setType]   = useState('RESTAURANT');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const hRes = await hotelApi.getMyHotels();
      const hid = (hRes.data.data || [])[0]?.id;
      if (!hid) { setLoading(false); return; }
      setHotelId(hid);
      const oRes = await hotelOutletApi.list(hid);
      setOutlets(oRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim() || !hotelId) return;
    setSaving(true);
    try {
      await hotelOutletApi.create({ hotelId, name, outletType });
      setName(''); setType('RESTAURANT'); setShowAdd(false);
      await load();
    } catch { Alert.alert('Error', 'Could not create outlet'); }
    finally { setSaving(false); }
  };

  const toggleOutlet = async (item) => {
    setOutlets(prev => prev.map(o => o.id === item.id ? { ...o, active: !o.active } : o));
    try { await hotelOutletApi.toggleStatus(item.id, !item.active); }
    catch { Alert.alert('Failed to update outlet'); await load(); }
  };

  const deleteOutlet = (item) => confirmAction(
    'Delete outlet?', `"${item.name}" will be permanently removed.`,
    async () => {
      try { await hotelOutletApi.delete(item.id); setOutlets(prev => prev.filter(o => o.id !== item.id)); }
      catch { Alert.alert('Failed to delete outlet'); }
    }, 'Delete'
  );

  const createQr = async (item) => {
    try {
      await hotelOutletApi.createQr(item.id);
      Alert.alert('QR created', `A QR code for ${item.name} is ready — find it under QR Management.`);
    } catch { Alert.alert('Failed to create QR code'); }
  };

  const OutletCard = ({ item }) => (
    <View style={s.card}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/(hotel)/outlets/${item.id}/dashboard`)}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.meta}>{item.outletType?.replace('_',' ')}{item.location ? ` · ${item.location}` : ''}</Text>
      </TouchableOpacity>
      <View style={s.cardActions}>
        <TouchableOpacity onPress={() => createQr(item)}><Text style={s.actionIcon}>📱</Text></TouchableOpacity>
        <Switch value={!!item.active} onValueChange={() => toggleOutlet(item)} trackColor={{ true: Colors.primary }} />
        <TouchableOpacity onPress={() => deleteOutlet(item)}><Text style={[s.actionIcon, { color: '#DC2626' }]}>🗑️</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={s.header}>
        <Text style={s.title}>Outlets</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={outlets}
        keyExtractor={o => o.id}
        renderItem={OutletCard}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} />}
        ListEmptyComponent={!loading && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🏨</Text>
            <Text style={s.emptyText}>No outlets yet</Text>
            <Text style={s.emptySub}>Add your first restaurant, spa or bar</Text>
          </View>
        )}
      />

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.sheetTitle}>New outlet</Text>
            <TextInput style={s.input} placeholder="e.g. The Garden Cafe" value={name} onChangeText={setName} />
            <View style={s.typeGrid}>
              {OUTLET_TYPES.map(ot => (
                <TouchableOpacity key={ot} style={[s.typeChip, outletType === ot && s.typeChipActive]} onPress={() => setType(ot)}>
                  <Text style={[s.typeChipText, outletType === ot && s.typeChipTextActive]}>{ot.replace('_',' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.6 }]} onPress={create} disabled={saving}>
                <Text style={s.createBtnText}>{saving ? 'Creating…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: 56 },
  title:      { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  addBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: FontSize.sm },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  cardActions:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { fontSize: 16 },
  name:       { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  meta:       { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  status:     { fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  active:     { color: '#047857', backgroundColor: '#D1FAE5' },
  inactive:   { color: '#6B7280', backgroundColor: '#F3F4F6' },
  empty:      { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText:  { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: Spacing.base },
  input:      { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, fontSize: FontSize.base, marginBottom: 12 },
  typeGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  typeChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
  typeChipTextActive: { color: Colors.primary },
  cancelBtn:  { flex: 1, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: Colors.gray500 },
  createBtn:  { flex: 1, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  createBtnText: { fontWeight: '700', color: 'white' },
});
