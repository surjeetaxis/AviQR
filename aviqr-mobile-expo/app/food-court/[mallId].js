import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { mallApi } from '../../src/api/index.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Food Court QR Flow: customer scans one Food Court QR → lands here → picks a
// restaurant → goes straight to that restaurant's own menu/cart/checkout —
// the mall is never involved in the order. Public, no auth needed.
export default function FoodCourtHomeScreen() {
  const { mallId } = useLocalSearchParams();
  const [mall, setMall]       = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      const [mallRes, vendorsRes] = await Promise.all([mallApi.getPublicMall(mallId), mallApi.getPublicVendors(mallId)]);
      setMall(mallRes.data.data);
      setVendors(vendorsRes.data.data || []);
    } catch { setError('Could not load this food court. Please check the QR code and try again.'); }
    finally { setLoading(false); }
  }, [mallId]);

  useEffect(() => { load(); }, [load]);

  const filtered = search ? vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.category || '').toLowerCase().includes(search.toLowerCase())) : vendors;

  if (loading) return (
    <View style={ss.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={ss.loadingTxt}>Loading food court…</Text></View>
  );
  if (error || !mall) return (
    <View style={ss.center}><Text style={{ fontSize: 40 }}>🍽️</Text><Text style={ss.errorTxt}>{error || 'Food court not found.'}</Text></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#1D9E75', '#178A65']} style={ss.header}>
        <Text style={ss.eyebrow}>FOOD COURT</Text>
        <Text style={ss.mallName}>{mall.name}</Text>
        {mall.city && <Text style={ss.mallCity}>{mall.city}</Text>}
      </LinearGradient>

      <View style={ss.searchBox}>
        <TextInput style={ss.searchInput} placeholder="Search restaurant or cuisine…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400} />
      </View>

      <Text style={ss.count}>{filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} · tap one to view its menu</Text>

      <FlatList
        data={filtered}
        keyExtractor={v => v.id}
        numColumns={2}
        contentContainerStyle={{ padding: Spacing.base, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={<Text style={ss.emptyTxt}>{search ? 'No restaurants match your search.' : 'No restaurants are open here yet.'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ss.card, !item.shopId && { opacity: 0.5 }]}
            disabled={!item.shopId}
            onPress={() => item.shopId && router.push({ pathname: '/(customer)/shop/menu', params: { shopId: item.shopId } })}
          >
            <View style={ss.cardIcon}><Text style={{ fontSize: 20 }}>🍴</Text></View>
            <Text style={ss.cardName}>{item.name}</Text>
            {item.category && <Text style={ss.cardCat}>{item.category}</Text>}
            {item.floor && <Text style={ss.cardFloor}>📍 {item.floor}</Text>}
            {!item.shopId && <Text style={ss.cardUnavailable}>Menu unavailable</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, paddingHorizontal: 30 },
  loadingTxt: { color: Colors.gray500, marginTop: 12 },
  errorTxt: { color: '#DC2626', marginTop: 12, textAlign: 'center' },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  eyebrow: { fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5, fontWeight: '700' },
  mallName: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginTop: 2 },
  mallCity: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  searchBox: { paddingHorizontal: Spacing.base, marginTop: 14 },
  searchInput: { height: 44, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border },
  count: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600', paddingHorizontal: Spacing.base, marginTop: 12 },
  emptyTxt: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40, fontSize: FontSize.sm },
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  cardCat: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  cardFloor: { fontSize: 11, color: Colors.gray400, marginTop: 8 },
  cardUnavailable: { fontSize: 11, color: Colors.gray400, marginTop: 8 },
});
