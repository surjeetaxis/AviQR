import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { shopApi, menuApi, rawMaterialApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function MenuSyncScreen() {
  const [outlets, setOutlets]   = useState([]);
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading]   = useState(true);
  const [offline, setOffline]   = useState(false);
  const [copyFrom, setCopyFrom] = useState(null);
  const [copyTargets, setCopyTargets] = useState([]);
  const [copying, setCopying]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await shopApi.getMyShops();
        const shops = res.data.data || [];
        setOutlets(shops);
        setOffline(false);
        const results = await Promise.all(shops.map(o =>
          Promise.all([
            menuApi.getCategories(o.id).catch(() => ({ data: { data: [] } })),
            menuApi.getItems(o.id).catch(() => ({ data: { data: [] } })),
          ]).then(([cats, items]) => ({ id: o.id, categories: (cats.data.data || []).length, items: (items.data.data || []).length }))
        ));
        const map = {};
        results.forEach(r => { map[r.id] = r; });
        setMenuData(map);
      } catch { setOffline(true); }
      finally { setLoading(false); }
    })();
  }, []);

  const otherOutlets = copyFrom ? outlets.filter(o => o.id !== copyFrom.id) : [];
  const toggleTarget = (id) => setCopyTargets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const runCopy = async () => {
    if (!copyFrom || copyTargets.length === 0) return;
    setCopying(true);
    try {
      await Promise.all([
        menuApi.copyToShops(copyFrom.id, copyTargets),
        rawMaterialApi.copyToShops(copyFrom.id, copyTargets),
      ]);
      setCopyFrom(null); setCopyTargets([]);
      Alert.alert('Done', 'Menu and raw materials copied to the selected outlets.');
    } catch { Alert.alert('Could not copy to all selected outlets'); }
    finally { setCopying(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Menu Sync" />
      {offline && <OfflineBadge />}
      <Text style={ss.hint}>View menu per outlet · centrally push a menu & raw-material master to other outlets</Text>
      <FlatList
        data={outlets}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={!loading && <EmptyState icon="🏪" title="No outlets" subtitle="Add outlets first to manage menus" />}
        renderItem={({ item }) => {
          const md = menuData[item.id] || { categories: 0, items: 0 };
          return (
            <View style={ss.card}>
              <View style={{ flex: 1 }}>
                <Text style={ss.name}>{item.name}</Text>
                <Text style={ss.sub}>{md.categories} categories · {md.items} items</Text>
              </View>
              {outlets.length > 1 && (
                <TouchableOpacity style={ss.copyBtn} onPress={() => { setCopyFrom(item); setCopyTargets([]); }}>
                  <Text style={ss.copyBtnTxt}>Copy to others</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <BottomSheet visible={!!copyFrom} onClose={() => !copying && setCopyFrom(null)}>
        {copyFrom && (
          <View>
            <Text style={ss.sheetTitle}>Copy menu & raw materials</Text>
            <Text style={ss.sheetHint}>From <Text style={{ fontWeight: '800' }}>{copyFrom.name}</Text> — select outlets to copy the menu and raw-material master to. Existing items at targets aren't removed; this adds a fresh copy.</Text>
            {otherOutlets.length === 0 ? (
              <Text style={ss.sheetHint}>No other outlets to copy to.</Text>
            ) : otherOutlets.map(o => (
              <TouchableOpacity key={o.id} style={ss.targetRow} onPress={() => toggleTarget(o.id)}>
                <Text style={{ fontSize: 16 }}>{copyTargets.includes(o.id) ? '☑' : '☐'}</Text>
                <Text style={ss.targetName}>{o.name}</Text>
              </TouchableOpacity>
            ))}
            <Button title={copying ? 'Copying…' : `Copy to ${copyTargets.length || ''} outlet${copyTargets.length === 1 ? '' : 's'}`} onPress={runCopy} loading={copying} disabled={copyTargets.length === 0} style={{ marginTop: 12 }} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  hint: { fontSize: FontSize.xs, color: Colors.gray400, paddingHorizontal: Spacing.base, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  copyBtn: { backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  copyBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 8 },
  sheetHint: { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 14, lineHeight: 18 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  targetName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
});
