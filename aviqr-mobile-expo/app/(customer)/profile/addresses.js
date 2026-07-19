import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { addressApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Input } from '../../../src/components/common/Input.js';
import { Button } from '../../../src/components/common/Button.js';
import { BottomSheet } from '../../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../src/theme/index.js';

const LABELS = ['Home', 'Work', 'Other'];
const EMPTY_FORM = { label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '', phone: '', isDefault: false };

export default function CustomerAddressesScreen() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    addressApi.list().then(res => setAddresses(res.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit = (addr) => {
    setEditId(addr.id);
    setForm({ label: addr.label || 'Home', line1: addr.line1 || '', line2: addr.line2 || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '', phone: addr.phone || '', isDefault: !!addr.isDefault });
    setError(''); setShowForm(true);
  };

  const remove = (addr) => {
    Alert.alert('Delete address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => addressApi.remove(addr.id).then(load).catch(() => Alert.alert('Could not remove address')) },
    ]);
  };

  const submit = async () => {
    if (!form.line1.trim()) return setError('Address line is required');
    setError(''); setSaving(true);
    try {
      if (editId) await addressApi.update(editId, form);
      else await addressApi.create(form);
      setShowForm(false);
      load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save address'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Saved Addresses" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {loading ? (
          <Text style={ss.hint}>Loading…</Text>
        ) : addresses.length === 0 ? (
          <EmptyState icon="📍" title="No saved addresses yet" />
        ) : addresses.map(a => (
          <View key={a.id} style={ss.card}>
            <View style={{ flex: 1 }}>
              <View style={ss.badgeRow}>
                <View style={ss.labelBadge}><Text style={ss.labelBadgeTxt}>{a.label}</Text></View>
                {a.isDefault && <Text style={ss.defaultTxt}>⭐ Default</Text>}
              </View>
              <Text style={ss.line}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
              <Text style={ss.city}>{[a.city, a.state, a.pincode].filter(Boolean).join(', ')}</Text>
              {a.phone && <Text style={ss.phone}>{a.phone}</Text>}
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={() => openEdit(a)} style={ss.iconBtn}><Text>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(a)} style={ss.iconBtn}><Text>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={ss.addBtn} onPress={openAdd}>
          <Text style={ss.addBtnTxt}>➕ Add new address</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={ss.sheetTitle}>{editId ? 'Edit Address' : 'Add Address'}</Text>
          <View style={ss.labelRow}>
            {LABELS.map(l => (
              <TouchableOpacity key={l} style={[ss.labelChip, form.label === l && ss.labelChipActive]} onPress={() => set('label', l)}>
                <Text style={[ss.labelChipTxt, form.label === l && ss.labelChipTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Address line 1" value={form.line1} onChangeText={v => set('line1', v)} />
          <Input label="Address line 2 (optional)" value={form.line2} onChangeText={v => set('line2', v)} />
          <Input label="City" value={form.city} onChangeText={v => set('city', v)} />
          <Input label="State" value={form.state} onChangeText={v => set('state', v)} />
          <Input label="Pincode" value={form.pincode} onChangeText={v => set('pincode', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
          <Input label="Contact phone (optional)" value={form.phone} onChangeText={v => set('phone', v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" />
          <TouchableOpacity style={ss.defaultRow} onPress={() => set('isDefault', !form.isDefault)}>
            <Text style={{ fontSize: 16 }}>{form.isDefault ? '☑' : '☐'}</Text>
            <Text style={ss.defaultRowTxt}>Set as default address</Text>
          </TouchableOpacity>
          {error ? <Text style={ss.error}>{error}</Text> : null}
          <Button title={saving ? 'Saving…' : 'Save address'} onPress={submit} loading={saving} style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  hint: { textAlign: 'center', color: Colors.gray400, paddingVertical: 20 },
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 10, ...Shadow.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  labelBadge: { backgroundColor: '#E6F7F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  labelBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  defaultTxt: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  line: { fontSize: FontSize.sm, color: Colors.gray700 },
  city: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  phone: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center' },
  addBtn: { alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.gray300, borderStyle: 'dashed', marginTop: 4 },
  addBtnTxt: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  labelRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  labelChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  labelChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  labelChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
  labelChipTxtActive: { color: Colors.primaryDark },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 },
  defaultRowTxt: { fontSize: FontSize.sm, color: Colors.gray700 },
  error: { color: '#DC2626', fontSize: FontSize.xs, marginTop: 4 },
});
