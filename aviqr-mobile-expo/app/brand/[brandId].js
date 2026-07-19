import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { brandApi } from '../../src/api/index.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Brand QR Flow: customer scans a Supplier's main/brand QR → lands here →
// picks one of the brand's outlets → goes straight to that outlet's own
// menu/cart/checkout — mirrors the Food Court flow one level up (a brand
// groups shops by ownerId instead of by mallId). Public, no auth needed.
export default function BrandHomeScreen() {
  const { brandId } = useLocalSearchParams();
  const [brand, setBrand]     = useState(null);
  const [shops, setShops]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      const [brandRes, shopsRes] = await Promise.all([brandApi.getPublicBrand(brandId), brandApi.getPublicShops(brandId)]);
      setBrand(brandRes.data.data);
      setShops(shopsRes.data.data || []);
    } catch { setError('Could not load this brand. Please check the QR code and try again.'); }
    finally { setLoading(false); }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const filtered = search ? shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.city || '').toLowerCase().includes(search.toLowerCase())) : shops;

  if (loading) return (
    <View style={ss.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={ss.loadingTxt}>Loading…</Text></View>
  );
  if (error || !brand) return (
    <View style={ss.center}><Text style={{ fontSize: 40 }}>🏪</Text><Text style={ss.errorTxt}>{error || 'Brand not found.'}</Text></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#1D9E75', '#178A65']} style={ss.header}>
        <Text style={ss.eyebrow}>OUR OUTLETS</Text>
        <Text style={ss.brandName}>{brand.name}</Text>
        {brand.city && <Text style={ss.brandCity}>{brand.city}</Text>}
      </LinearGradient>

      <View style={ss.searchBox}>
        <TextInput style={ss.searchInput} placeholder="Search outlet or city…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400} />
      </View>

      <Text style={ss.count}>{filtered.length} outlet{filtered.length !== 1 ? 's' : ''} · tap one to view its menu</Text>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        numColumns={2}
        contentContainerStyle={{ padding: Spacing.base, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={<Text style={ss.emptyTxt}>{search ? 'No outlets match your search.' : 'No outlets are open yet.'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => router.push({ pathname: '/(customer)/menu', params: { shopId: item.id } })}>
            <View style={ss.cardIcon}><Text style={{ fontSize: 20 }}>🏪</Text></View>
            <Text style={ss.cardName}>{item.name}</Text>
            {item.tagline && <Text style={ss.cardTagline}>{item.tagline}</Text>}
            {item.city && <Text style={ss.cardCity}>📍 {item.city}</Text>}
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
  brandName: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginTop: 2 },
  brandCity: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  searchBox: { paddingHorizontal: Spacing.base, marginTop: 14 },
  searchInput: { height: 44, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border },
  count: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600', paddingHorizontal: Spacing.base, marginTop: 12 },
  emptyTxt: { textAlign: 'center', color: Colors.gray400, paddingVertical: 40, fontSize: FontSize.sm },
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  cardTagline: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  cardCity: { fontSize: 11, color: Colors.gray400, marginTop: 8 },
});
