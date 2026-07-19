import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { rawMaterialApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const UNITS = ['kg', 'gram', 'litre', 'ml', 'piece'];
const EMPTY_FORM = { name: '', unit: 'kg', currentStock: '0', minStockLevel: '0', costPerUnit: '0', supplier: '' };

export default function RawMaterialsScreen() {
  const shopId = useActiveShopId();
  const [mats, setMats]       = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [editModal, setEditModal] = useState(null); // {mode:'add'|'edit', id?}
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [adjustMat, setAdjustMat] = useState(null);
  const [adjDelta, setAdjDelta]   = useState('');
  const [adjReason, setAdjReason] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await rawMaterialApi.getByShop(shopId);
      setMats(res.data.data || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditModal({ mode: 'add' }); };
  const openEdit = (m) => {
    setForm({ name: m.name, unit: m.unit, currentStock: String(m.currentStock ?? 0), minStockLevel: String(m.minStockLevel ?? 0), costPerUnit: String(m.costPerUnit ?? 0), supplier: m.supplier || '' });
    setEditModal({ mode: 'edit', id: m.id });
  };

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Name required');
    setSaving(true);
    const payload = { shopId, name: form.name, unit: form.unit, currentStock: parseFloat(form.currentStock || 0), minStockLevel: parseFloat(form.minStockLevel || 0), costPerUnit: parseFloat(form.costPerUnit || 0), supplier: form.supplier };
    try {
      if (editModal.mode === 'edit') {
        await rawMaterialApi.update(editModal.id, payload);
        setMats(prev => prev.map(m => m.id === editModal.id ? { ...m, ...payload } : m));
      } else {
        const res = await rawMaterialApi.create(payload);
        setMats(prev => [...prev, res.data.data]);
      }
      setEditModal(null);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || e.message); }
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    const delta = parseFloat(adjDelta);
    if (!adjDelta || isNaN(delta)) return;
    try {
      await rawMaterialApi.adjustStock(adjustMat.id, delta, adjReason);
      setMats(prev => prev.map(m => m.id === adjustMat.id ? { ...m, currentStock: parseFloat(m.currentStock || 0) + delta } : m));
      setAdjustMat(null); setAdjDelta(''); setAdjReason('');
    } catch (e) { Alert.alert('Adjustment failed', e.response?.data?.message || 'Please try again.'); }
  };

  const deleteMat = (mat) => {
    Alert.alert('Delete material', `Delete "${mat.name}"? This will remove it from all recipes.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await rawMaterialApi.delete(mat.id); setMats(prev => prev.filter(m => m.id !== mat.id)); }
        catch { Alert.alert('Delete failed'); }
      }},
    ]);
  };

  const filtered = mats.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const lowStockCount = mats.filter(m => parseFloat(m.currentStock || 0) <= parseFloat(m.minStockLevel || 0)).length;

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Raw Materials</Text>
        <TouchableOpacity style={ss.addBtn} onPress={openAdd}><Text style={{ fontSize: 18, color: Colors.primary }}>➕</Text></TouchableOpacity>
      </View>
      {offline && <OfflineBadge onRetry={load} />}
      {lowStockCount > 0 && <View style={ss.alertBanner}><Text style={ss.alertTxt}>⚠ {lowStockCount} ingredient{lowStockCount > 1 ? 's' : ''} low on stock</Text></View>}
      <View style={ss.searchBox}><Input placeholder="Search ingredients…" value={search} onChangeText={setSearch} style={{ marginBottom: 0 }} /></View>
      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="🧂" title="No raw materials yet" />}
        renderItem={({ item }) => {
          const low = parseFloat(item.currentStock || 0) <= parseFloat(item.minStockLevel || 0);
          return (
            <View style={[ss.card, low && { borderLeftWidth: 3, borderLeftColor: '#DC2626' }]}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={[ss.stock, low && { color: '#DC2626' }]}>{item.currentStock} {item.unit} · ₹{item.costPerUnit}/{item.unit}</Text>
                {item.supplier ? <Text style={ss.supplier}>{item.supplier}</Text> : null}
              </View>
              <View style={ss.actions}>
                <TouchableOpacity style={ss.adjustBtn} onPress={() => setAdjustMat(item)}><Text style={ss.adjustTxt}>Adjust</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(item)}><Text style={{ fontSize: 15 }}>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => deleteMat(item)}><Text style={{ fontSize: 15 }}>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <BottomSheet visible={!!editModal} onClose={() => setEditModal(null)}>
        <Text style={ss.sheetTitle}>{editModal?.mode === 'edit' ? 'Edit Ingredient' : 'Add Ingredient'}</Text>
        <Input label="Name *" placeholder="Paneer" value={form.name} onChangeText={v => set('name', v)} />
        <Text style={ss.unitLabel}>Unit</Text>
        <View style={ss.unitRow}>
          {UNITS.map(u => (
            <TouchableOpacity key={u} style={[ss.unitChip, form.unit === u && ss.unitChipActive]} onPress={() => set('unit', u)}>
              <Text style={[ss.unitChipTxt, form.unit === u && ss.unitChipTxtActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Current Stock" value={form.currentStock} onChangeText={v => set('currentStock', v)} keyboardType="decimal-pad" />
        <Input label="Low Stock Threshold" value={form.minStockLevel} onChangeText={v => set('minStockLevel', v)} keyboardType="decimal-pad" />
        <Input label="Cost per Unit (₹)" value={form.costPerUnit} onChangeText={v => set('costPerUnit', v)} keyboardType="decimal-pad" />
        <Input label="Supplier (optional)" value={form.supplier} onChangeText={v => set('supplier', v)} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
      </BottomSheet>

      <BottomSheet visible={!!adjustMat} onClose={() => setAdjustMat(null)}>
        <Text style={ss.sheetTitle}>Adjust Stock — {adjustMat?.name}</Text>
        <Text style={ss.currentTxt}>Current: {adjustMat?.currentStock} {adjustMat?.unit}</Text>
        <Input label="Adjustment (+/-)" placeholder="e.g. -2.5 or 10" value={adjDelta} onChangeText={setAdjDelta} keyboardType="numbers-and-punctuation" />
        <Input label="Reason (optional)" placeholder="Wastage, new delivery…" value={adjReason} onChangeText={setAdjReason} />
        <Button title="Apply Adjustment" onPress={doAdjust} style={{ marginTop: 8 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  addBtn: { padding: 8 },
  alertBanner: { backgroundColor: '#FEF3C7', margin: Spacing.base, marginBottom: 0, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: '#FCD34D' },
  alertTxt: { fontSize: FontSize.xs, color: '#92400E', fontWeight: '700' },
  searchBox: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  stock: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  supplier: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  actions: { alignItems: 'center', gap: 10 },
  adjustBtn: { backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  adjustTxt: { fontSize: 11, fontWeight: '700', color: Colors.gray700 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  unitLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  unitChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  unitChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
  unitChipTxtActive: { color: Colors.primaryDark },
  currentTxt: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 12 },
});
