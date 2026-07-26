import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { shopApi } from '../../src/api/index.js';
import { SearchIcon } from '../../src/components/common/NavIcons.js';
import { CustomerBottomNav } from '../../src/components/common/CustomerBottomNav.js';
import { getRecentSearches, addRecentSearch, removeRecentSearch } from '../../src/utils/recentSearches.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Mirrors web's PortalHome.jsx — shown when the app is opened with no shop/table/room
// context (i.e. the customer hasn't scanned a QR code yet this session). Leads with
// "Scan a QR to get started", backed by a search box (with recent-search history) and
// a nearby-shops list. A QR-scan deep link (aviqr://... / a scanned https://aviqr.in/menu/…
// URL resolved in scan.js) never passes through here — it routes straight to the shop.
export default function PortalHomeScreen() {
  const [status, setStatus] = useState('loading'); // loading | granted | denied
  const [shops, setShops] = useState([]);
  const [sort, setSort] = useState('distance'); // distance | rating
  const [coords, setCoords] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState([]);
  const searchInputRef = useRef(null);

  const loadNearby = useCallback(async (lat, lng, sortBy) => {
    try {
      const res = await shopApi.nearby(lat, lng, 10, sortBy === 'distance' ? undefined : sortBy);
      setShops(res.data.data || []);
    } catch { setShops([]); }
  }, []);

  const loadRecent = useCallback(() => { getRecentSearches().then(setRecent); }, []);

  useEffect(() => {
    loadRecent();
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') { setStatus('denied'); return; }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        await loadNearby(pos.coords.latitude, pos.coords.longitude, sort);
        setStatus('granted');
      } catch { setStatus('denied'); }
    })();
  }, []);

  useEffect(() => {
    if (status === 'granted' && coords) loadNearby(coords.lat, coords.lng, sort);
  }, [sort]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const q = search.trim();
      shopApi.listAll({ search: q })
        .then(res => {
          setSearchResults(res.data.data?.content || res.data.data || []);
          addRecentSearch(q).then(setRecent);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openShop = (shopId) => router.push({ pathname: '/(customer)/shop/menu', params: { shopId } });

  const runRecentSearch = (term) => { setSearch(term); searchInputRef.current?.focus(); };

  const onDeleteRecent = (term) => { removeRecentSearch(term).then(setRecent); };

  const handleTabChange = (key) => {
    if (key === 'search') { setSearchFocused(true); searchInputRef.current?.focus(); }
    else if (key === 'home') searchInputRef.current?.blur();
    else if (key === 'cart' || key === 'orders' || key === 'profile') {
      Alert.alert('Pick a restaurant first', 'Scan a QR code or search for a restaurant to continue.');
    }
  };

  const showingRecents = searchFocused && !search.trim();
  const showingResults = !!search.trim();

  if (status === 'loading') {
    return (
      <View style={ss.screen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={ss.sub}>Finding restaurants near you…</Text>
      </View>
    );
  }

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <TouchableOpacity style={ss.scanBanner} onPress={() => router.push('/(customer)/scan')} activeOpacity={0.85}>
          <View style={ss.scanIconWrap}><Text style={ss.scanIcon}>📷</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={ss.scanTitle}>Scan a QR to get started</Text>
            <Text style={ss.scanSub}>Point your camera at a table or menu code</Text>
          </View>
          <Text style={ss.scanArrow}>›</Text>
        </TouchableOpacity>

        <View style={ss.searchBox}>
          <SearchIcon size={16} color={Colors.gray400} />
          <TextInput
            ref={searchInputRef}
            style={ss.searchInput}
            placeholder="Search restaurants…"
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {status === 'granted' && !showingRecents && !showingResults && (
          <View style={ss.sortRow}>
            {[['distance', '📍 Nearest'], ['rating', '⭐ Top rated']].map(([key, label]) => (
              <TouchableOpacity key={key} style={[ss.sortChip, sort === key && ss.sortChipActive]} onPress={() => setSort(key)}>
                <Text style={[ss.sortChipText, sort === key && ss.sortChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {showingRecents ? (
        <FlatList
          style={{ width: '100%' }}
          data={recent}
          keyExtractor={t => t}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={recent.length ? <Text style={ss.sectionTitle}>Recent searches</Text> : null}
          ListEmptyComponent={<Text style={[ss.sub, { marginTop: 24 }]}>No recent searches yet.</Text>}
          renderItem={({ item }) => (
            <View style={ss.recentRow}>
              <TouchableOpacity style={ss.recentRowMain} onPress={() => runRecentSearch(item)}>
                <Text style={ss.recentIcon}>🕘</Text>
                <Text style={ss.recentText}>{item}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteRecent(item)} hitSlop={10}>
                <Text style={ss.recentRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingTop: 4, paddingHorizontal: Spacing.base, paddingBottom: 100 }}
        />
      ) : showingResults ? (
        <FlatList
          style={{ width: '100%' }}
          data={searchResults}
          keyExtractor={s => s.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={!searching ? <Text style={[ss.sub, { marginTop: 24 }]}>No restaurants found for "{search.trim()}".</Text> : null}
          renderItem={({ item }) => <ShopCard shop={item} onPress={() => openShop(item.id)} />}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}
        />
      ) : status === 'denied' ? (
        <View style={[ss.screen, { paddingTop: 8 }]}>
          <Text style={ss.sub}>We couldn't access your location — search above or scan a QR code.</Text>
        </View>
      ) : shops.length === 0 ? (
        <View style={[ss.screen, { paddingTop: 8 }]}>
          <Text style={ss.sub}>No restaurants found within 10km. Try scanning a QR code instead.</Text>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={s => s.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ShopCard shop={item} onPress={() => openShop(item.id)} />}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}
        />
      )}

      <CustomerBottomNav activeTab="home" onChangeTab={handleTabChange} cartCount={0} pageBackground={Colors.background} />
    </View>
  );
}

function ShopCard({ shop, onPress }) {
  return (
    <TouchableOpacity style={ss.card} onPress={onPress} activeOpacity={0.85}>
      <View style={ss.cardEmojiWrap}><Text style={ss.cardEmoji}>🍽</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={ss.cardName} numberOfLines={1}>{shop.name}</Text>
        {!!shop.tagline && <Text style={ss.cardTagline} numberOfLines={1}>{shop.tagline}</Text>}
        <View style={ss.cardMetaRow}>
          {shop.rating != null && <Text style={ss.cardMeta}>⭐ {Number(shop.rating).toFixed(1)} ({shop.ratingCount || 0})</Text>}
          {shop.distanceKm != null && <Text style={ss.cardMeta}>📍 {shop.distanceKm < 1 ? `${Math.round(shop.distanceKm * 1000)}m` : `${shop.distanceKm.toFixed(1)}km`}</Text>}
          {!!shop.city && <Text style={ss.cardMeta}>{shop.city}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30, backgroundColor: Colors.background },
  sub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 19 },
  header: { paddingTop: 56, paddingHorizontal: Spacing.base, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  scanBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: 12 },
  scanIconWrap: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  scanIcon: { fontSize: 22 },
  scanTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primaryDark },
  scanSub: { fontSize: FontSize.xs, color: Colors.gray600, marginTop: 2 },
  scanArrow: { fontSize: 22, color: Colors.primaryDark, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: 14, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.gray900 },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { paddingHorizontal: 12, height: 32, borderRadius: 99, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  sortChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  sortChipText: { fontSize: 12.5, fontWeight: '600', color: Colors.gray600 },
  sortChipTextActive: { color: '#065F46' },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray500, paddingTop: 16, paddingBottom: 4 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  recentRowMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  recentIcon: { fontSize: 15 },
  recentText: { fontSize: FontSize.base, color: Colors.gray900 },
  recentRemove: { fontSize: 14, color: Colors.gray400, paddingHorizontal: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 12, marginBottom: 10, ...Shadow.sm },
  cardEmojiWrap: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 24 },
  cardName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  cardTagline: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  cardMetaRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  cardMeta: { fontSize: 11.5, color: Colors.gray500, fontWeight: '600' },
});
