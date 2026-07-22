import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { menuApi, variantApi, addonApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function MenuVariantsScreen() {
  const shopId = useActiveShopId();
  const [tab, setTab]         = useState('variants');
  const [items, setItems]     = useState([]);
  const [addons, setAddons]   = useState([]);
  const [variants, setVariants] = useState({}); // itemId -> rows[]
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [addonModal, setAddonModal] = useState(null); // {mode,'add'|'edit', id}
  const [addonForm, setAddonForm]   = useState({ name: '', price: '', veg: true });
  const [savingAddon, setSavingAddon] = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [iRes, aRes] = await Promise.all([menuApi.getItems(shopId), addonApi.getByShop(shopId)]);
      setItems(iRes.data.data || []);
      setAddons(aRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [shopId]);

  const loadVariants = async (itemId) => {
    try { const res = await variantApi.getVariants(itemId); setVariants(v => ({ ...v, [itemId]: res.data.data || [] })); } catch {}
  };
  const toggleExpand = async (item) => {
    if (!expanded[item.id] && !variants[item.id]) await loadVariants(item.id);
    setExpanded(e => ({ ...e, [item.id]: !e[item.id] }));
  };
  const addRow = (itemId) => setVariants(v => ({ ...v, [itemId]: [...(v[itemId] || []), { id: `new_${Date.now()}`, variantName: '', price: '', isDefault: false, active: true }] }));
  const updateRow = (itemId, idx, field, value) => setVariants(v => ({ ...v, [itemId]: v[itemId].map((r, i) => i === idx ? { ...r, [field]: value } : r) }));
  const removeRow = (itemId, idx) => setVariants(v => ({ ...v, [itemId]: v[itemId].filter((_, i) => i !== idx) }));

  const saveItemVariants = async (itemId) => {
    setSavingId(itemId);
    try {
      const rows = (variants[itemId] || []).filter(r => r.variantName && r.price).map((r, i) => ({ variantName: r.variantName, price: parseFloat(r.price), isDefault: !!r.isDefault, sortOrder: i, active: r.active !== false }));
      await variantApi.saveVariants(itemId, rows);
      await loadVariants(itemId);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || e.message); }
    finally { setSavingId(null); }
  };

  const deleteAllVariants = (itemId) => {
    Alert.alert('Delete all variants', 'Delete all variants for this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await variantApi.deleteVariants(itemId); setVariants(v => ({ ...v, [itemId]: [] })); } },
    ]);
  };

  const openAddonAdd = () => { setAddonForm({ name: '', price: '', veg: true }); setAddonModal({ mode: 'add' }); };
  const openAddonEdit = (a) => { setAddonForm({ name: a.name, price: String(a.price), veg: a.veg !== false }); setAddonModal({ mode: 'edit', id: a.id }); };
  const saveAddon = async () => {
    if (!addonForm.name.trim() || !addonForm.price) return Alert.alert('Name and price are required');
    setSavingAddon(true);
    const payload = { shopId, name: addonForm.name, price: parseFloat(addonForm.price), veg: addonForm.veg };
    try {
      if (addonModal.mode === 'edit') { await addonApi.update(addonModal.id, payload); setAddons(prev => prev.map(a => a.id === addonModal.id ? { ...a, ...payload } : a)); }
      else { const res = await addonApi.create(payload); setAddons(prev => [...prev, res.data.data]); }
      setAddonModal(null);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || 'Please try again.'); }
    finally { setSavingAddon(false); }
  };
  const deleteAddon = (a) => {
    Alert.alert('Delete add-on', `Delete "${a.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await addonApi.delete(a.id); setAddons(prev => prev.filter(x => x.id !== a.id)); } catch { Alert.alert('Delete failed'); } } },
    ]);
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Menu Variants</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={ss.tabRow}>
        {[['variants', 'Variants'], ['addons', 'Add-ons']].map(([k, l]) => (
          <TouchableOpacity key={k} style={[ss.tabBtn, tab === k && ss.tabActive]} onPress={() => setTab(k)}>
            <Text style={[ss.tabTxt, tab === k && ss.tabActiveTxt]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'variants' ? (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
          ListEmptyComponent={!loading && <EmptyState icon="🍽️" title="No menu items yet" />}
          renderItem={({ item }) => (
            <View style={ss.itemCard}>
              <TouchableOpacity style={ss.itemHeader} onPress={() => toggleExpand(item)}>
                <Text style={ss.itemName}>{item.name}</Text>
                <Text style={ss.chevron}>{expanded[item.id] ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {expanded[item.id] && (
                <View style={ss.variantBody}>
                  {(variants[item.id] || []).map((row, idx) => (
                    <View key={row.id || idx} style={ss.variantRow}>
                      <Input placeholder="Size (Small)" value={row.variantName} onChangeText={v => updateRow(item.id, idx, 'variantName', v)} style={{ flex: 2, marginBottom: 0 }} />
                      <Input placeholder="₹" value={String(row.price)} onChangeText={v => updateRow(item.id, idx, 'price', v)} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
                      <TouchableOpacity onPress={() => removeRow(item.id, idx)}><Text style={{ fontSize: 16 }}>🗑️</Text></TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={ss.addRowBtn} onPress={() => addRow(item.id)}><Text style={ss.addRowTxt}>➕ Add size</Text></TouchableOpacity>
                  <View style={ss.variantActions}>
                    <Button title={savingId === item.id ? 'Saving…' : 'Save'} onPress={() => saveItemVariants(item.id)} loading={savingId === item.id} style={{ flex: 1 }} />
                    {(variants[item.id] || []).length > 0 && <Button title="Delete all" onPress={() => deleteAllVariants(item.id)} variant="outline" style={{ flex: 1 }} />}
                  </View>
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={addons}
          keyExtractor={a => a.id}
          contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
          ListHeaderComponent={<TouchableOpacity style={ss.addRowBtn} onPress={openAddonAdd}><Text style={ss.addRowTxt}>➕ Add-on</Text></TouchableOpacity>}
          ListEmptyComponent={!loading && <EmptyState icon="🧩" title="No add-ons yet" />}
          renderItem={({ item }) => (
            <View style={ss.addonCard}>
              <View style={[ss.vegDot, { backgroundColor: item.veg ? '#1D9E75' : '#DC2626' }]} />
              <View style={{ flex: 1 }}>
                <Text style={ss.itemName}>{item.name}</Text>
                <Text style={ss.addonPrice}>+₹{item.price}</Text>
              </View>
              <TouchableOpacity onPress={() => openAddonEdit(item)}><Text style={{ fontSize: 15 }}>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteAddon(item)}><Text style={{ fontSize: 15 }}>🗑️</Text></TouchableOpacity>
            </View>
          )}
        />
      )}

      <BottomSheet visible={!!addonModal} onClose={() => setAddonModal(null)}>
        <Text style={ss.sheetTitle}>{addonModal?.mode === 'edit' ? 'Edit Add-on' : 'Add Add-on'}</Text>
        <Input label="Name *" placeholder="Extra Cheese" value={addonForm.name} onChangeText={v => setAddonForm(f => ({ ...f, name: v }))} />
        <Input label="Price (₹) *" value={addonForm.price} onChangeText={v => setAddonForm(f => ({ ...f, price: v }))} keyboardType="decimal-pad" />
        <View style={ss.vegRow}>
          <Text style={ss.vegLabel}>Vegetarian</Text>
          <Switch value={addonForm.veg} onValueChange={v => setAddonForm(f => ({ ...f, veg: v }))} trackColor={{ true: Colors.primary }} />
        </View>
        <Button title={savingAddon ? 'Saving…' : 'Save'} onPress={saveAddon} loading={savingAddon} style={{ marginTop: 8 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray500 },
  tabActiveTxt: { color: Colors.gray900, fontWeight: '800' },
  itemCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  itemName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  chevron: { fontSize: 14, color: Colors.gray400 },
  variantBody: { padding: Spacing.base, paddingTop: 0, gap: 8 },
  variantRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addRowBtn: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  addRowTxt: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.xs },
  variantActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  vegDot: { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: Colors.white },
  addonPrice: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  vegRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vegLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
});
