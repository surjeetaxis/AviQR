import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { menuApi, variantApi, shortcodeApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const EMPTY_FORM = { code: '', menuItemId: '', variantId: '', active: true };

export default function ShortcodesScreen() {
  const shopId = useActiveShopId();
  const [items, setItems]           = useState([]);
  const [shortcodes, setShortcodes] = useState([]);
  const [itemVariants, setItemVariants] = useState({});
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // {mode:'add'|'edit', id}
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [iRes, sRes] = await Promise.all([menuApi.getItems(shopId), shortcodeApi.getByShop(shopId)]);
      setItems(iRes.data.data || []);
      setShortcodes(sRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [shopId]);

  const itemName = (id) => items.find(i => i.id === id)?.name || '—';

  const loadVariantsFor = async (itemId) => {
    if (!itemId || itemVariants[itemId]) return;
    try { const res = await variantApi.getVariants(itemId); setItemVariants(v => ({ ...v, [itemId]: res.data.data || [] })); } catch {}
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal({ mode: 'add' }); };
  const openEdit = (s) => { setForm({ code: s.code, menuItemId: s.menuItemId, variantId: s.variantId || '', active: s.active !== false }); loadVariantsFor(s.menuItemId); setModal({ mode: 'edit', id: s.id }); };

  const save = async () => {
    if (!form.code.trim() || !form.menuItemId) return Alert.alert('Code and menu item are required');
    setSaving(true);
    const payload = { shopId, code: form.code.trim().toUpperCase(), menuItemId: form.menuItemId, variantId: form.variantId || null, active: form.active };
    try {
      if (modal.mode === 'edit') { await shortcodeApi.update(modal.id, payload); setShortcodes(prev => prev.map(s => s.id === modal.id ? { ...s, ...payload } : s)); }
      else { const res = await shortcodeApi.create(payload); setShortcodes(prev => [...prev, res.data.data]); }
      setModal(null);
    } catch (e) { Alert.alert('Save failed', e.response?.data?.message || 'Code may already be in use.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    setShortcodes(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
    try { await shortcodeApi.update(s.id, { ...s, active: !s.active }); } catch { load(); }
  };

  const remove = (s) => {
    Alert.alert('Delete shortcode', `Delete "${s.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await shortcodeApi.delete(s.id); setShortcodes(prev => prev.filter(x => x.id !== s.id)); } catch { Alert.alert('Delete failed'); } } },
    ]);
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Shortcodes</Text>
        <TouchableOpacity style={{ padding: 8 }} onPress={openAdd}><Text style={{ fontSize: 18, color: Colors.primary }}>➕</Text></TouchableOpacity>
      </View>
      <Text style={ss.hint}>Assign quick-entry codes to menu items for lightning-fast billing</Text>
      <FlatList
        data={shortcodes}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="⚡" title="No shortcodes yet" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openEdit(item)}>
            <View style={ss.codeBadge}><Text style={ss.codeTxt}>{item.code}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={ss.itemName}>{itemName(item.menuItemId)}</Text>
            </View>
            <Switch value={item.active !== false} onValueChange={() => toggleActive(item)} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
            <TouchableOpacity onPress={() => remove(item)}><Text style={{ fontSize: 15 }}>🗑️</Text></TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <BottomSheet visible={!!modal} onClose={() => setModal(null)}>
        <Text style={ss.sheetTitle}>{modal?.mode === 'edit' ? 'Edit Shortcode' : 'Add Shortcode'}</Text>
        <Input label="Code *" placeholder="e.g. BC1" value={form.code} onChangeText={v => setForm(f => ({ ...f, code: v.toUpperCase() }))} autoCapitalize="characters" />
        <Text style={ss.pickLabel}>Menu Item *</Text>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={i => i.id}
          style={{ marginBottom: 12 }}
          renderItem={({ item: mi }) => (
            <TouchableOpacity style={[ss.chip, form.menuItemId === mi.id && ss.chipActive]} onPress={() => { setForm(f => ({ ...f, menuItemId: mi.id, variantId: '' })); loadVariantsFor(mi.id); }}>
              <Text style={[ss.chipTxt, form.menuItemId === mi.id && ss.chipActiveTxt]}>{mi.name}</Text>
            </TouchableOpacity>
          )}
        />
        {form.menuItemId && (itemVariants[form.menuItemId] || []).length > 0 && (
          <>
            <Text style={ss.pickLabel}>Variant (optional)</Text>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={itemVariants[form.menuItemId]}
              keyExtractor={v => v.id}
              style={{ marginBottom: 12 }}
              renderItem={({ item: v }) => (
                <TouchableOpacity style={[ss.chip, form.variantId === v.id && ss.chipActive]} onPress={() => setForm(f => ({ ...f, variantId: v.id }))}>
                  <Text style={[ss.chipTxt, form.variantId === v.id && ss.chipActiveTxt]}>{v.variantName}</Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}
        <Button title={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400, paddingHorizontal: Spacing.base, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 10, ...Shadow.sm },
  codeBadge: { backgroundColor: Colors.gray900, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  codeTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.sm, fontFamily: 'monospace' },
  itemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  pickLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 8 },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
});
