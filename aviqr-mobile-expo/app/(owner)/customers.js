import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { customerApi } from '../../src/api/index.js';
import { Card } from '../../src/components/common/Card.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';

const emptyForm = { email:'', birthday:'', anniversary:'', notes:'' };

export default function CustomersScreen() {
  const shopId = useActiveShopId();
  const [customers, setCustomers] = useState([]);
  const [offline, setOffline]     = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [selCust, setSelCust]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [newLabel, setNewLabel]   = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await customerApi.list(shopId);
      setCustomers(res.data.data || []);
      setOffline(false);
    } catch { setOffline(true); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openProfile = (c) => {
    setSelCust(c);
    setForm({
      email: c.email || '',
      birthday: c.birthday || '',
      anniversary: c.anniversary || '',
      notes: c.notes || '',
    });
    setShowEdit(true);
  };

  const saveProfile = async () => {
    if (!selCust) return;
    setSaving(true);
    try {
      await customerApi.updateProfile(shopId, {
        phone: selCust.customerPhone,
        name: selCust.customerName,
        email: form.email || null,
        birthday: form.birthday || null,
        anniversary: form.anniversary || null,
      });
      await customerApi.updateNotes(shopId, { phone: selCust.customerPhone, notes: form.notes || null });
      setShowEdit(false); setSelCust(null);
      load();
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to save profile'); }
    finally { setSaving(false); }
  };

  const addLabel = async () => {
    if (!newLabel.trim() || !selCust) return;
    try {
      await customerApi.addLabel(shopId, { phone: selCust.customerPhone, label: newLabel.trim() });
      setNewLabel('');
      const res = await customerApi.getProfile(shopId, selCust.customerPhone);
      setSelCust(res.data.data);
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to add label'); }
  };

  const removeLabel = async (label) => {
    if (!selCust) return;
    try {
      await customerApi.removeLabel(shopId, selCust.customerPhone, label);
      const res = await customerApi.getProfile(shopId, selCust.customerPhone);
      setSelCust(res.data.data);
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to remove label'); }
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Customers</Text>
        <View style={{ width: 44 }} />
      </View>
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={customers}
        keyExtractor={c => c.customerPhone}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="👥" title="No customers yet" subtitle="Customers appear here once they order or earn loyalty points" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openProfile(item)}>
            <Card style={ss.row} padding={14}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.customerName || 'Customer'}</Text>
                <Text style={ss.phone}>{item.customerPhone}</Text>
                {!!(item.labels && item.labels.length) && (
                  <View style={ss.labelRow}>
                    {item.labels.map(l => <Text key={l} style={ss.labelChip}>{l}</Text>)}
                  </View>
                )}
              </View>
              <Text style={ss.points}>{item.totalPoints || 0} pts</Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <ScrollView style={ss.modal} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>{selCust?.customerName || 'Customer'}</Text>
            <TouchableOpacity onPress={() => setShowEdit(false)}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
          </View>
          <Text style={ss.modalPhone}>{selCust?.customerPhone}</Text>
          <Input label="Birthday (YYYY-MM-DD)" placeholder="1995-07-15" value={form.birthday} onChangeText={v => setForm(f => ({ ...f, birthday: v }))} />
          <Input label="Anniversary (YYYY-MM-DD)" placeholder="2020-02-10" value={form.anniversary} onChangeText={v => setForm(f => ({ ...f, anniversary: v }))} />
          <Input label="Email" placeholder="customer@email.com" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" />
          <Input label="Notes" placeholder="Dietary notes, seating preference…" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline />

          <Text style={ss.label}>Labels</Text>
          <View style={ss.labelRow}>
            {(selCust?.labels || []).map(l => (
              <TouchableOpacity key={l} style={ss.labelEditChip} onPress={() => removeLabel(l)}>
                <Text style={ss.labelEditChipTxt}>{l} ✕</Text>
              </TouchableOpacity>
            ))}
            {!(selCust?.labels && selCust.labels.length) && <Text style={ss.noLabels}>No labels yet</Text>}
          </View>
          <View style={ss.addLabelRow}>
            <TextInput style={ss.labelInput} placeholder="e.g. VIP, Corporate" value={newLabel} onChangeText={setNewLabel} placeholderTextColor={Colors.gray400} />
            <TouchableOpacity style={ss.addLabelBtn} onPress={addLabel}><Text style={ss.addLabelBtnTxt}>Add</Text></TouchableOpacity>
          </View>

          <Button title={saving ? 'Saving…' : 'Save profile'} onPress={saveProfile} loading={saving} style={{ marginTop: 20 }} />
          <Button title="Close" onPress={() => setShowEdit(false)} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600', width: 60 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  phone: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  points: { fontSize: FontSize.md, fontWeight: '800', color: Colors.purple },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  labelChip: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.purple, backgroundColor: Colors.purpleLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  modalPhone: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: 16 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  labelEditChip: { backgroundColor: Colors.purpleLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  labelEditChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.purple },
  noLabels: { fontSize: FontSize.sm, color: Colors.gray400 },
  addLabelRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  labelInput: { flex: 1, height: 44, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: Radius.md, paddingHorizontal: 12, fontSize: FontSize.base, color: Colors.gray900 },
  addLabelBtn: { paddingHorizontal: 16, justifyContent: 'center', backgroundColor: Colors.gray100, borderRadius: Radius.md },
  addLabelBtnTxt: { fontWeight: '700', color: Colors.gray700 },
});
