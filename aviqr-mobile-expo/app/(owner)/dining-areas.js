import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { menuApi, diningAreaApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function DiningAreasScreen() {
  const shopId = useActiveShopId();
  const [areas, setAreas]     = useState([]);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaModal, setAreaModal] = useState(null); // {mode:'add'|'edit', id}
  const [areaForm, setAreaForm]   = useState({ name: '', active: true });
  const [saving, setSaving]       = useState(false);
  const [pricingArea, setPricingArea] = useState(null);
  const [priceRows, setPriceRows]     = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [savingPrices, setSavingPrices]   = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [aRes, iRes] = await Promise.all([diningAreaApi.getByShop(shopId), menuApi.getItems(shopId)]);
      setAreas(aRes.data.data || []);
      setItems(iRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [shopId]);

  const openAdd = () => { setAreaForm({ name: '', active: true }); setAreaModal({ mode: 'add' }); };
  const openEdit = (a) => { setAreaForm({ name: a.name, active: a.active !== false }); setAreaModal({ mode: 'edit', id: a.id }); };

  const saveArea = async () => {
    if (!areaForm.name.trim()) return Alert.alert('Name required');
    setSaving(true);
    const payload = { shopId, name: areaForm.name, active: areaForm.active };
    try {
      if (areaModal.mode === 'edit') { await diningAreaApi.update(areaModal.id, payload); setAreas(prev => prev.map(a => a.id === areaModal.id ? { ...a, ...payload } : a)); }
      else { const res = await diningAreaApi.create(payload); setAreas(prev => [...prev, res.data.data]); }
      setAreaModal(null);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (a) => {
    setAreas(prev => prev.map(x => x.id === a.id ? { ...x, active: !x.active } : x));
    try { await diningAreaApi.update(a.id, { ...a, active: !a.active }); } catch { load(); }
  };

  const remove = (a) => {
    Alert.alert('Delete area', `Delete "${a.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await diningAreaApi.delete(a.id); setAreas(prev => prev.filter(x => x.id !== a.id)); } catch { Alert.alert('Delete failed'); } } },
    ]);
  };

  const openPricing = async (area) => {
    setPricingArea(area); setPricesLoading(true);
    try {
      const res = await diningAreaApi.getPrices(area.id);
      const rows = {};
      (res.data.data || []).forEach(p => { rows[p.menuItemId] = String(p.price); });
      setPriceRows(rows);
    } catch { setPriceRows({}); }
    finally { setPricesLoading(false); }
  };

  const savePricing = async () => {
    setSavingPrices(true);
    try {
      const payload = Object.entries(priceRows).filter(([, v]) => v !== '' && v != null).map(([menuItemId, price]) => ({ menuItemId, price: parseFloat(price) }));
      await diningAreaApi.savePrices(pricingArea.id, payload);
      setPricingArea(null);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || 'Please try again.'); }
    finally { setSavingPrices(false); }
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Dine-in Areas</Text>
        <TouchableOpacity style={{ padding: 8 }} onPress={openAdd}><Text style={{ fontSize: 18, color: Colors.primary }}>➕</Text></TouchableOpacity>
      </View>
      <FlatList
        data={areas}
        keyExtractor={a => a.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="🍽️" title="No dining areas yet" subtitle="Create separate areas like Garden, AC Hall, Rooftop" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.name}</Text>
              <TouchableOpacity onPress={() => openPricing(item)}><Text style={ss.priceLink}>Set area pricing →</Text></TouchableOpacity>
            </View>
            <Switch value={item.active !== false} onValueChange={() => toggleActive(item)} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
            <TouchableOpacity onPress={() => openEdit(item)}><Text style={{ fontSize: 15 }}>✏️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item)}><Text style={{ fontSize: 15 }}>🗑️</Text></TouchableOpacity>
          </View>
        )}
      />

      <BottomSheet visible={!!areaModal} onClose={() => setAreaModal(null)}>
        <Text style={ss.sheetTitle}>{areaModal?.mode === 'edit' ? 'Edit Area' : 'Add Dining Area'}</Text>
        <Input label="Name *" placeholder="e.g. Garden, AC Hall" value={areaForm.name} onChangeText={v => setAreaForm(f => ({ ...f, name: v }))} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={saveArea} loading={saving} style={{ marginTop: 8 }} />
      </BottomSheet>

      <BottomSheet visible={!!pricingArea} onClose={() => setPricingArea(null)} height={520}>
        <Text style={ss.sheetTitle}>{pricingArea?.name} — Pricing</Text>
        <Text style={ss.priceHint}>Leave blank to use the item's normal menu price</Text>
        {pricesLoading ? <Text style={ss.priceHint}>Loading…</Text> : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <View style={ss.priceRow}>
                <Text style={ss.priceItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={ss.priceDefault}>₹{item.price}</Text>
                <Input placeholder="₹" value={priceRows[item.id] || ''} onChangeText={v => setPriceRows(p => ({ ...p, [item.id]: v }))} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
              </View>
            )}
          />
        )}
        <Button title={savingPrices ? 'Saving…' : 'Save Pricing'} onPress={savePricing} loading={savingPrices} style={{ marginTop: 12 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  priceLink: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  priceHint: { fontSize: FontSize.xs, color: Colors.gray400, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  priceItemName: { flex: 2, fontSize: FontSize.sm, color: Colors.gray900 },
  priceDefault: { fontSize: FontSize.xs, color: Colors.gray400 },
});
