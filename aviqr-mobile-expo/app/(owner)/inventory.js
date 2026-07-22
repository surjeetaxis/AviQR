import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { menuApi, inventoryApi } from '../../src/api/index.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Finished-goods stock levels — merges menu items with their stock record
// (a menu item has no stock row until tracking is turned on for it),
// matching web's Inventory.jsx exactly.
export default function InventoryScreen() {
  const shopId = useActiveShopId();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty]     = useState('');
  const [editThreshId, setEditThreshId] = useState(null);
  const [editThreshVal, setEditThreshVal] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [cRes, iRes, sRes] = await Promise.allSettled([
        menuApi.getCategories(shopId), menuApi.getItems(shopId), inventoryApi.getStock(shopId),
      ]);
      const cats = cRes.status === 'fulfilled' ? (cRes.value.data.data || []) : [];
      const menuItems = iRes.status === 'fulfilled' ? (iRes.value.data.data || []) : [];
      const stockRows = sRes.status === 'fulfilled' ? (sRes.value.data.data || []) : [];
      const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
      const stockMap = Object.fromEntries(stockRows.map(s => [String(s.menuItemId), s]));
      setItems(menuItems.map(m => {
        const s = stockMap[String(m.id)] || {};
        return {
          menuItemId: m.id, name: m.name, veg: m.veg, categoryName: catMap[m.categoryId]?.name || '',
          stockQty: s.stockQty ?? null, lowStockThreshold: s.lowStockThreshold ?? 5, trackStock: s.trackStock ?? false,
        };
      }));
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const toggleTracking = async (item) => {
    const next = !item.trackStock;
    setItems(prev => prev.map(i => i.menuItemId === item.menuItemId ? { ...i, trackStock: next } : i));
    try { await inventoryApi.setStock(item.menuItemId, { trackStock: next, stockQty: item.stockQty ?? 0, shopId }); }
    catch { Alert.alert('Failed to toggle tracking'); load(); }
  };

  const saveQty = async (item) => {
    const qty = parseInt(editQty, 10);
    setEditingId(null);
    if (isNaN(qty) || qty < 0) return;
    setItems(prev => prev.map(i => i.menuItemId === item.menuItemId ? { ...i, stockQty: qty, trackStock: true } : i));
    try { await inventoryApi.setStock(item.menuItemId, { stockQty: qty, trackStock: true, shopId }); }
    catch { Alert.alert('Failed to update stock'); load(); }
  };

  const saveThreshold = async (item) => {
    const val = parseInt(editThreshVal, 10);
    setEditThreshId(null);
    if (isNaN(val) || val < 0) return;
    setItems(prev => prev.map(i => i.menuItemId === item.menuItemId ? { ...i, lowStockThreshold: val } : i));
    try { await inventoryApi.setStock(item.menuItemId, { lowStockThreshold: val, shopId }); }
    catch { Alert.alert('Failed to update threshold'); load(); }
  };

  const lowStockCount = items.filter(i => i.trackStock && i.stockQty != null && i.stockQty <= i.lowStockThreshold).length;

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={ss.back}>‹ Back</Text></TouchableOpacity>
        <Text style={ss.title}>Stock Levels</Text>
        <View style={{ width: 44 }} />
      </View>
      {offline && <OfflineBadge onRetry={load} />}
      {lowStockCount > 0 && (
        <View style={ss.alertBanner}><Text style={ss.alertTxt}>⚠ {lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on stock</Text></View>
      )}
      <FlatList
        data={items}
        keyExtractor={i => i.menuItemId}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="📦" title="No menu items yet" />}
        renderItem={({ item }) => {
          const low = item.trackStock && item.stockQty != null && item.stockQty <= item.lowStockThreshold;
          return (
            <View style={[ss.card, low && { borderLeftWidth: 3, borderLeftColor: '#DC2626' }]}>
              <View style={ss.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.name}>{item.name}</Text>
                  <Text style={ss.sub}>{item.categoryName}</Text>
                </View>
                <Switch value={item.trackStock} onValueChange={() => toggleTracking(item)} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
              </View>
              {item.trackStock && (
                <View style={ss.stockRow}>
                  <TouchableOpacity style={ss.stockField} onPress={() => { setEditingId(item.menuItemId); setEditQty(String(item.stockQty ?? 0)); }}>
                    {editingId === item.menuItemId ? (
                      <Input value={editQty} onChangeText={setEditQty} keyboardType="number-pad" autoFocus onBlur={() => saveQty(item)} style={{ marginBottom: 0 }} />
                    ) : (
                      <Text style={[ss.stockVal, low && { color: '#DC2626' }]}>{item.stockQty ?? 0} in stock</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={ss.threshField} onPress={() => { setEditThreshId(item.menuItemId); setEditThreshVal(String(item.lowStockThreshold)); }}>
                    {editThreshId === item.menuItemId ? (
                      <Input value={editThreshVal} onChangeText={setEditThreshVal} keyboardType="number-pad" autoFocus onBlur={() => saveThreshold(item)} style={{ marginBottom: 0 }} />
                    ) : (
                      <Text style={ss.threshTxt}>Alert at {item.lowStockThreshold}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  alertBanner: { backgroundColor: '#FEF3C7', margin: Spacing.base, marginBottom: 0, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: '#FCD34D' },
  alertTxt: { fontSize: FontSize.xs, color: '#92400E', fontWeight: '700' },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  stockRow: { flexDirection: 'row', gap: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray50, paddingTop: 10 },
  stockField: { flex: 1 },
  threshField: { flex: 1 },
  stockVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  threshTxt: { fontSize: FontSize.xs, color: Colors.gray500 },
});
