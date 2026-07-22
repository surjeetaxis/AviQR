import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, SectionList, FlatList, StyleSheet,
  TouchableOpacity, TextInput, Image, Alert, Animated, Share, Linking, Modal, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { menuApi, orderApi, paymentApi } from '../../../src/api/index.js';
import { useAuth } from '../../../src/context/AuthContext.js';
import { Button } from '../../../src/components/common/Button.js';
import { BottomSheet } from '../../../src/components/common/BottomSheet.js';
import { StatusBadge } from '../../../src/components/common/StatusBadge.js';
import { CustomerBottomNav } from '../../../src/components/common/CustomerBottomNav.js';
import { OrderCodePanel } from '../../../src/components/common/OrderCodePanel.js';
import { SearchIcon, MinusIcon, PlusIcon, ArrowRightIcon, ShoppingBagIcon } from '../../../src/components/common/NavIcons.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../src/theme/index.js';

// Mirrors aviqr-ui-web's LANGUAGES list (CustomerMenu.jsx) — same order/codes,
// so a shopper sees the same language picker on both platforms.
const LANGUAGES = [
  { code:'en', label:'English',   native:'English' },
  { code:'hi', label:'Hindi',     native:'हिंदी' },
  { code:'ta', label:'Tamil',     native:'தமிழ்' },
  { code:'te', label:'Telugu',    native:'తెలుగు' },
  { code:'kn', label:'Kannada',   native:'ಕನ್ನಡ' },
  { code:'ml', label:'Malayalam', native:'മലയാളം' },
  { code:'bn', label:'Bengali',   native:'বাংলা' },
  { code:'mr', label:'Marathi',   native:'मराठी' },
  { code:'gu', label:'Gujarati',  native:'ગુજરાતી' },
];

export default function CustomerMenuScreen() {
  // expo-router passes route params via useLocalSearchParams(), not a `route`
  // prop (that's React Navigation) — this previously always fell through to
  // the hardcoded demo shop regardless of which QR/link was actually opened.
  const { shopId = '00000000-0000-0000-0000-000000000101', tableNumber, lang: langParam = 'en' } = useLocalSearchParams();
  const { user } = useAuth();

  const [menu, setMenu]         = useState([]);
  const [shop, setShop]         = useState({ name: 'Restaurant', tagline: '', emoji: '🍽', rating: 4.5, reviews: 0, timing: '9 AM – 11 PM', location: '', color: Colors.primary });
  const [cart, setCart]         = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen]= useState(false);
  const [search, setSearch]     = useState('');
  const [activeCat, setActiveCat]= useState('all');
  const [placedOrder, setPlaced]= useState(null);
  const [ordering, setOrdering] = useState(false);
  const [filter, setFilter]     = useState('all'); // all, veg
  const [customerInfo, setInfo] = useState({ name: user?.name || '', phone: user?.phone || '', table: tableNumber || '', paymentMethod: 'ONLINE', orderType: 'DINE_IN' });
  const [activeTab, setActiveTab] = useState('home');
  const [lang, setLang]         = useState(langParam);
  const [showLang, setShowLang] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const searchInputRef = useRef(null);
  const sectionListRef = useRef(null);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'search') searchInputRef.current?.focus();
    else if (key === 'cart') setCartOpen(true);
    else if (key === 'orders') router.push({ pathname: '/(customer)/shop/orders', params: { shopId } });
    else if (key === 'profile') router.push({ pathname: '/(customer)/shop/profile', params: { shopId } });
  };

  useEffect(() => { loadMenu(); }, [shopId, lang]);

  const loadMenu = async () => {
    try {
      const res = await menuApi.getPublicMenu(shopId, lang);
      const data = res.data.data;
      setMenu(data?.categories || []);
      const s = data?.shop || {};
      setShop({
        name: s.name || 'Restaurant',
        tagline: s.tagline || '',
        emoji: s.emoji || '🍽',
        rating: s.rating || 4.5,
        reviews: s.reviews || 0,
        timing: s.timing || s.openingHours || '9 AM – 11 PM',
        location: s.address || s.location || '',
        color: s.color || Colors.primary,
      });
    } catch {}
  };

  const scrollToCategory = (catId) => {
    setActiveCat(catId);
    if (catId === 'all') { sectionListRef.current?.scrollToLocation?.({ sectionIndex: 0, itemIndex: 0, viewOffset: 0, animated: true }); return; }
    const sectionIndex = filteredMenu.findIndex(cat => cat.id === catId);
    if (sectionIndex >= 0) {
      sectionListRef.current?.scrollToLocation?.({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: true });
    }
  };

  const onShare = async () => {
    try { await Share.share({ message: `${shop.name} — order on AviQR`, title: shop.name }); } catch {}
  };

  // Cart helpers
  const addItem = (item) => setCart(c => ({ ...c, [item.id]: { ...item, qty: (c[item.id]?.qty || 0) + 1 } }));
  const removeItem = (item) => setCart(c => {
    if ((c[item.id]?.qty || 0) <= 1) { const n = { ...c }; delete n[item.id]; return n; }
    return { ...c, [item.id]: { ...c[item.id], qty: c[item.id].qty - 1 } };
  });
  const cartItems = Object.values(cart).filter(i => i.qty > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.effectivePrice * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const placeOrder = async () => {
    if (!customerInfo.name) return Alert.alert('Name required', 'Please enter your name');
    if (cartItems.length === 0) return;
    setOrdering(true);
    try {
      const orderData = {
        customerName:  customerInfo.name,
        customerPhone: customerInfo.phone,
        tableNumber:   customerInfo.orderType === 'DINE_IN' ? (customerInfo.table || tableNumber) : null,
        paymentMethod: customerInfo.paymentMethod,
        type: customerInfo.orderType,
        items: cartItems.map(i => ({ menuItemId: i.id, itemName: i.name, quantity: i.qty, unitPrice: i.effectivePrice })),
      };
      const res = await orderApi.placeOrder(shopId, orderData);
      setPlaced(res.data.data);
      setCart({});
      setCartOpen(false);
      setOrderOpen(true);
    } catch (e) {
      Alert.alert('Failed to place order', e.response?.data?.message || 'Please try again.');
    } finally { setOrdering(false); }
  };

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: (cat.items || []).filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'veg' && !item.veg) return false;
      return true;
    })
  })).filter(cat => cat.items.length > 0);

  const MenuItem = ({ item }) => {
    const qty = cart[item.id]?.qty || 0;
    const imageCount = item.images?.length || (item.imageUrl ? 1 : 0);
    const openMedia = (url) => { if (url) Linking.openURL(url).catch(() => {}); };
    return (
      <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={() => setDetailItem(item)}>
        <View style={styles.menuItemLeft}>
          <View style={styles.foodTypeRow}>
            <View style={[styles.foodDot, { borderColor: item.veg ? '#1D9E75' : '#DC2626' }]}>
              <View style={[styles.foodDotInner, { backgroundColor: item.veg ? '#1D9E75' : '#DC2626' }]} />
            </View>
            {item.popular && <View style={styles.popularTag}><Text style={styles.popularTagText}>⭐ Popular</Text></View>}
            {item.spicy   && <Text style={styles.spicyTag}>🌶</Text>}
          </View>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {item.description && <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.menuItemPrice}>₹{item.effectivePrice || item.price}</Text>
            {item.effectivePrice && item.effectivePrice < item.price && (
              <Text style={styles.originalPrice}>₹{item.price}</Text>
            )}
          </View>
          {/* Media quick-links — mirrors .cm-item-media-links on web. Opens
              externally rather than an in-app player/3D viewer, which would
              need expo-av/expo-video + react-native-webview (not installed). */}
          {(item.videoUrl || item.modelUrl) && (
            <View style={styles.mediaLinks}>
              {!!item.videoUrl && (
                <TouchableOpacity style={styles.mediaLinkVideo} onPress={() => openMedia(item.videoUrl)}>
                  <Text style={styles.mediaLinkVideoText}>▶ Watch video</Text>
                </TouchableOpacity>
              )}
              {!!item.modelUrl && (
                <TouchableOpacity style={styles.mediaLink3d} onPress={() => openMedia(item.modelUrl)}>
                  <Text style={styles.mediaLink3dText}>◈ View in 3D</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        {!!item.imageUrl && (
          <TouchableOpacity style={styles.menuItemImageWrap} onPress={() => setDetailItem(item)} activeOpacity={0.85}>
            <Image source={{ uri: item.imageUrl }} style={styles.menuItemImage} />
            {(item.videoUrl || item.modelUrl) && (
              <View style={styles.mediaBadgeRow}>
                {!!item.videoUrl && <View style={styles.mediaBadge}><Text style={styles.mediaBadgeIcon}>▶</Text></View>}
                {!!item.modelUrl && <View style={[styles.mediaBadge, styles.mediaBadge3d]}><Text style={styles.mediaBadgeIcon}>◈</Text></View>}
              </View>
            )}
            {imageCount > 1 && (
              <View style={styles.galleryBadge}><Text style={styles.galleryBadgeText}>🖼 {imageCount}</Text></View>
            )}
          </TouchableOpacity>
        )}
        <View style={styles.qtyControl}>
          {qty > 0 ? (
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item)}>
                <MinusIcon size={14} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(item)}>
                <PlusIcon size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ItemDetailModal = () => {
    const item = detailItem;
    if (!item) return null;
    const images = item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : []);
    const qty = cart[item.id]?.qty || 0;
    const screenW = Dimensions.get('window').width;
    return (
      <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailItem(null)}>
        <View style={styles.detailScreen}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={() => setDetailItem(null)}><Text style={styles.detailClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {images.length > 0 ? (
              <FlatList
                data={images} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                keyExtractor={(uri, i) => String(i)}
                renderItem={({ item: uri }) => <Image source={{ uri }} style={{ width: screenW, height: screenW * 0.75 }} resizeMode="cover" />}
              />
            ) : (
              <View style={[styles.detailEmptyMedia, { width: screenW, height: screenW * 0.6 }]}><Text style={{ fontSize: 48 }}>🍽</Text></View>
            )}
            {(item.videoUrl || item.modelUrl) && (
              <View style={styles.detailMediaLinks}>
                {!!item.videoUrl && (
                  <TouchableOpacity style={styles.mediaLinkVideo} onPress={() => Linking.openURL(item.videoUrl).catch(() => {})}>
                    <Text style={styles.mediaLinkVideoText}>▶ Watch video</Text>
                  </TouchableOpacity>
                )}
                {!!item.modelUrl && (
                  <TouchableOpacity style={styles.mediaLink3d} onPress={() => Linking.openURL(item.modelUrl).catch(() => {})}>
                    <Text style={styles.mediaLink3dText}>◈ View in 3D</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.detailBody}>
              <View style={styles.foodTypeRow}>
                <View style={[styles.foodDot, { borderColor: item.veg ? '#1D9E75' : '#DC2626' }]}>
                  <View style={[styles.foodDotInner, { backgroundColor: item.veg ? '#1D9E75' : '#DC2626' }]} />
                </View>
                {item.popular && <View style={styles.popularTag}><Text style={styles.popularTagText}>⭐ Popular</Text></View>}
                {item.spicy && <Text style={styles.spicyTag}>🌶</Text>}
              </View>
              {!!item.description && <Text style={styles.detailDesc}>{item.description}</Text>}
            </View>
          </ScrollView>
          <View style={styles.detailFooter}>
            <Text style={styles.detailPrice}>₹{item.effectivePrice || item.price}</Text>
            {qty === 0 ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
                <Text style={styles.addBtnText}>+ Add to cart</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item)}><MinusIcon size={14} color={Colors.primary} /></TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(item)}><PlusIcon size={14} color={Colors.primary} /></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header — mirrors aviqr-ui-web's .cm-header (brand + language + share) */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>▦</Text>
          <Text style={styles.brandName}>Avi<Text style={{ color: Colors.primary }}>QR</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.langBtn} onPress={() => setShowLang(v => !v)}>
            <Text style={styles.langBtnText}>🌐 {LANGUAGES.find(l => l.code === lang)?.native || 'English'} ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onShare}>
            <Text style={{ fontSize: 15 }}>📤</Text>
          </TouchableOpacity>
        </View>
        {showLang && (
          <View style={styles.langDropdown}>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langOption, lang === l.code && styles.langOptionActive]}
                  onPress={() => { setLang(l.code); setShowLang(false); }}
                >
                  <Text style={styles.langNative}>{l.native}</Text>
                  <Text style={styles.langLabel}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Shop banner — mirrors .cm-shop-banner */}
      <LinearGradient colors={[shop.color, '#085041']} style={styles.shopBanner}>
        <View style={styles.shopEmojiWrap}><Text style={styles.shopEmoji}>{shop.emoji}</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <TouchableOpacity style={styles.favBtn} onPress={() => setFavorited(f => !f)}>
            <Text style={{ fontSize: 12 }}>{favorited ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        {!!shop.tagline && <Text style={styles.shopTagline}>{shop.tagline}</Text>}
        <View style={styles.shopMeta}>
          <View style={styles.metaChip}><Text style={styles.metaChipText}>⭐ {shop.rating} ({shop.reviews})</Text></View>
          <View style={styles.metaChip}><Text style={styles.metaChipText}>🕐 {shop.timing}</Text></View>
          {!!shop.location && <View style={styles.metaChip}><Text style={styles.metaChipText} numberOfLines={1}>📍 {shop.location}</Text></View>}
        </View>
        {!!tableNumber && (
          <View style={styles.tableChip}><Text style={styles.tableChipText}>📍 Table {tableNumber}</Text></View>
        )}
      </LinearGradient>

      {/* Toolbar: search + veg-only toggle — mirrors .cm-toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={Colors.gray400} />
          <TextInput ref={searchInputRef} style={styles.searchInput} placeholder="Search dishes…" placeholderTextColor={Colors.gray400} value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity style={[styles.vegFilter, filter === 'veg' && styles.vegFilterActive]} onPress={() => setFilter(f => f === 'veg' ? 'all' : 'veg')}>
          <View style={[styles.vegDot, filter === 'veg' && styles.vegDotActive]} />
          <Text style={[styles.vegText, filter === 'veg' && styles.vegTextActive]}>Veg</Text>
        </TouchableOpacity>
      </View>

      {/* Category tabs: All + real categories — mirrors .cm-cats */}
      <View style={styles.catTabsWrap}>
        <FlatList
          data={[{ id: 'all', name: 'All', emoji: null }, ...menu]}
          horizontal showsHorizontalScrollIndicator={false} keyExtractor={c => c.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 8 }}
          renderItem={({ item: cat }) => (
            <TouchableOpacity style={[styles.catTab, activeCat === cat.id && styles.catTabActive]} onPress={() => scrollToCategory(cat.id)}>
              {!!cat.emoji && <Text style={styles.catEmoji}>{cat.emoji}</Text>}
              <Text style={[styles.catTabText, activeCat === cat.id && styles.catTabActiveText]}>{cat.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Menu items */}
      <SectionList
        ref={sectionListRef}
        sections={filteredMenu.map(cat => ({ id: cat.id, title: cat.name, emoji: cat.emoji, data: cat.items }))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MenuItem item={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        onScrollToIndexFailed={() => {}}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 190 : 100 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Cart FAB */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => setCartOpen(true)} activeOpacity={0.9}>
          <ShoppingBagIcon size={18} color={Colors.white} />
          <Text style={styles.cartFabText}>{cartCount} item{cartCount > 1 ? 's' : ''}</Text>
          <Text style={styles.cartFabTotal}>₹{cartTotal.toFixed(0)}</Text>
          <ArrowRightIcon size={16} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Cart Bottom Sheet */}
      <BottomSheet visible={cartOpen} onClose={() => setCartOpen(false)} height={520}>
        <Text style={styles.sheetTitle}>Your order</Text>
        <ScrollView style={{ maxHeight: 200 }}>
          {cartItems.map(item => (
            <View key={item.id} style={styles.cartRow}>
              <View style={styles.cartQtyControl}>
                <TouchableOpacity onPress={() => removeItem(item)} style={styles.qtyBtn}><MinusIcon size={12} color={Colors.primary} /></TouchableOpacity>
                <Text style={styles.cartQtyText}>{item.qty}</Text>
                <TouchableOpacity onPress={() => addItem(item)} style={styles.qtyBtn}><PlusIcon size={12} color={Colors.primary} /></TouchableOpacity>
              </View>
              <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cartItemPrice}>₹{(item.effectivePrice * item.qty).toFixed(0)}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.cartTotal}>
          <Text style={styles.cartTotalLabel}>Total</Text>
          <Text style={styles.cartTotalValue}>₹{cartTotal.toFixed(0)}</Text>
        </View>
        <TextInput style={styles.infoInput} placeholder="Your name *" value={customerInfo.name} onChangeText={v => setInfo(i => ({ ...i, name: v }))} placeholderTextColor={Colors.gray400} />
        <TextInput style={styles.infoInput} placeholder="Phone (optional)" value={customerInfo.phone} onChangeText={v => setInfo(i => ({ ...i, phone: v }))} keyboardType="phone-pad" placeholderTextColor={Colors.gray400} />
        <View style={styles.payRow}>
          {[['DINE_IN','🍽️ Dine-in'],['TAKEAWAY','🥡 Takeaway']].map(([t,l]) => (
            <TouchableOpacity key={t} style={[styles.payChip, customerInfo.orderType === t && styles.payChipActive]} onPress={() => setInfo(i => ({ ...i, orderType: t }))}>
              <Text style={[styles.payChipText, customerInfo.orderType === t && { color: Colors.primary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {customerInfo.orderType === 'DINE_IN' && (
          <TextInput style={styles.infoInput} placeholder="Table number" value={customerInfo.table} onChangeText={v => setInfo(i => ({ ...i, table: v }))} keyboardType="number-pad" placeholderTextColor={Colors.gray400} />
        )}
        <View style={styles.payRow}>
          {[['ONLINE','💳 Online'],['CASH','💵 Cash']].map(([m,l]) => (
            <TouchableOpacity key={m} style={[styles.payChip, customerInfo.paymentMethod === m && styles.payChipActive]} onPress={() => setInfo(i => ({ ...i, paymentMethod: m }))}>
              <Text style={[styles.payChipText, customerInfo.paymentMethod === m && { color: Colors.primary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={ordering ? 'Placing order…' : `Place Order · ₹${cartTotal.toFixed(0)}`} onPress={placeOrder} loading={ordering} style={{ marginTop: 12 }} />
      </BottomSheet>

      {/* Order Confirmation */}
      <BottomSheet visible={orderOpen} onClose={() => setOrderOpen(false)} height={placedOrder?.confirmationCode ? 560 : 380}>
        {placedOrder && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmEmoji}>🎉</Text>
              <Text style={styles.confirmTitle}>Order Placed!</Text>
              <Text style={styles.confirmNum}>{placedOrder.orderNumber}</Text>
              <Text style={styles.confirmMsg}>Your order is being prepared. We'll notify you when it's ready.</Text>
              <StatusBadge status={placedOrder.status} />
              <View style={styles.confirmMeta}>
                <Text style={styles.confirmMetaText}>Total: ₹{parseFloat(placedOrder.totalAmount).toFixed(0)}</Text>
                <Text style={styles.confirmMetaText}>Table: {placedOrder.tableNumber || 'N/A'}</Text>
              </View>
              <OrderCodePanel order={placedOrder} />
            </View>
          </ScrollView>
        )}
      </BottomSheet>

      <CustomerBottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        cartCount={cartCount}
        pageBackground={Colors.background}
      />

      <ItemDetailModal />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: Colors.background },
  detailScreen:   { flex: 1, backgroundColor: Colors.white },
  detailHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailTitle:    { flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginRight: 12 },
  detailClose:    { fontSize: 20, color: Colors.gray500 },
  detailEmptyMedia: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray100 },
  detailMediaLinks: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  detailBody:     { padding: 16, gap: 10 },
  detailDesc:     { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 20 },
  detailFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  detailPrice:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },

  // ── Header — mirrors .cm-header/.cm-brand/.cm-lang-*/.cm-icon-btn ──
  topHeader:      { paddingTop: 52, paddingBottom: 10, paddingHorizontal: Spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  brandRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon:      { fontSize: 17, color: Colors.primary },
  brandName:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.4, color: Colors.gray900 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn:        { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200 },
  langBtnText:    { fontSize: 12, fontWeight: '600', color: Colors.gray700 },
  iconBtn:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray100 },
  langDropdown:   { position: 'absolute', top: 56, right: Spacing.base, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.gray200, minWidth: 180, ...Shadow.lg, zIndex: 100 },
  langOption:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  langOptionActive:{ backgroundColor: Colors.primaryLight },
  langNative:     { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  langLabel:      { fontSize: 11, color: Colors.gray400 },

  // ── Shop banner — mirrors .cm-shop-banner ──
  shopBanner:     { paddingTop: 20, paddingBottom: 18, paddingHorizontal: Spacing.base },
  shopEmojiWrap:  { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shopEmoji:      { fontSize: 28 },
  shopName:       { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.4 },
  favBtn:         { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shopTagline:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3, marginBottom: 10 },
  shopMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip:       { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  metaChipText:   { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  tableChip:      { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tableChipText:  { fontSize: 12, fontWeight: '700', color: Colors.white },

  // ── Toolbar (search + veg toggle) — mirrors .cm-toolbar/.cm-veg-filter ──
  toolbar:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: 14, height: 40, gap: 8 },
  searchInput:    { flex: 1, fontSize: FontSize.base, color: Colors.gray900 },
  vegFilter:      { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: Colors.white },
  vegFilterActive:{ borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  vegDot:         { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: Colors.gray400 },
  vegDotActive:   { borderColor: '#16A34A' },
  vegText:        { fontSize: 12.5, fontWeight: '700', color: Colors.gray600 },
  vegTextActive:  { color: '#166534' },

  // ── Category tabs — mirrors .cm-cats/.cm-cat-tab ──
  catTabsWrap:    { height: 54, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, justifyContent: 'center' },
  catTab:         { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 14, borderRadius: 99, backgroundColor: Colors.gray100, borderWidth: 1.5, borderColor: 'transparent' },
  catTabActive:   { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catEmoji:       { fontSize: 14 },
  catTabText:     { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
  catTabActiveText:{ color: '#065F46' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.base, paddingVertical: 12, backgroundColor: Colors.gray50 },
  sectionEmoji:   { fontSize: 18 },
  sectionTitle:   { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray800 },
  menuItem:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  menuItemLeft:   { flex: 1 },
  foodTypeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  foodDot:        { width: 14, height: 14, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  foodDotInner:   { width: 6, height: 6, borderRadius: 3 },
  popularTag:     { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  popularTagText: { fontSize: 10, fontWeight: '600', color: '#92400E' },
  spicyTag:       { fontSize: 14 },
  menuItemName:   { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  menuItemDesc:   { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2, lineHeight: 16 },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  menuItemPrice:  { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  originalPrice:  { fontSize: FontSize.sm, color: Colors.gray400, textDecorationLine: 'line-through' },
  menuItemImageWrap:{ position: 'relative', width: 80, height: 80, borderRadius: Radius.md, overflow: 'hidden' },
  menuItemImage:  { width: 80, height: 80, borderRadius: Radius.md },
  mediaBadgeRow:  { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', gap: 3 },
  mediaBadge:     { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  mediaBadge3d:   { backgroundColor: 'rgba(124,58,237,0.8)' },
  mediaBadgeIcon: { fontSize: 8, color: Colors.white },
  galleryBadge:   { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9 },
  galleryBadgeText:{ fontSize: 9, fontWeight: '700', color: Colors.white },
  mediaLinks:     { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  mediaLinkVideo: { backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  mediaLinkVideoText:{ fontSize: 11, fontWeight: '700', color: '#92400E' },
  mediaLink3d:    { backgroundColor: '#EDE9FE', borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  mediaLink3dText:{ fontSize: 11, fontWeight: '700', color: '#5B21B6' },
  qtyControl:     { position: 'absolute', bottom: Spacing.base, right: Spacing.base },
  qtyRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.primary, overflow: 'hidden' },
  qtyBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyText:        { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary, paddingHorizontal: 6 },
  addBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 16 },
  addBtnText:     { color: Colors.white, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
  cartFab:        { position: 'absolute', bottom: 92, left: 16, right: 16, backgroundColor: Colors.gray900, borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, ...Shadow.lg },
  cartFabText:    { flex: 1, color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  cartFabTotal:   { color: Colors.white, fontWeight: '800', fontSize: FontSize.base },
  sheetTitle:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, marginBottom: Spacing.base },
  cartRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  cartQtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full },
  cartQtyText:    { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary, paddingHorizontal: 8 },
  cartItemName:   { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  cartItemPrice:  { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  cartTotal:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1.5, borderTopColor: Colors.gray900, marginBottom: 12 },
  cartTotalLabel: { fontSize: FontSize.lg, fontWeight: '800' },
  cartTotalValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  infoInput:      { height: 44, borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: FontSize.base, color: Colors.gray900, marginBottom: 8 },
  payRow:         { flexDirection: 'row', gap: 8 },
  payChip:        { flex: 1, height: 42, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' },
  payChipActive:  { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  payChipText:    { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  confirmSheet:   { alignItems: 'center', gap: 10 },
  confirmEmoji:   { fontSize: 52 },
  confirmTitle:   { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 },
  confirmNum:     { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  confirmMsg:     { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', lineHeight: 20 },
  confirmMeta:    { flexDirection: 'row', gap: 20 },
  confirmMetaText:{ fontSize: FontSize.base, fontWeight: '700', color: Colors.gray700 },
});