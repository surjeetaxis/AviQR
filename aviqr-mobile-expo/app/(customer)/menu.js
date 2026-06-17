import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, SectionList, FlatList, StyleSheet,
  TouchableOpacity, TextInput, Image, Alert, Animated
} from 'react-native';
// Icon not needed — using emoji
import { LinearGradient } from 'expo-linear-gradient';
// Toast replaced with Alert
import { menuApi, orderApi, paymentApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { Button } from '../../src/components/common/Button.js';
// BottomSheet replaced with Modal
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function CustomerMenuScreen({ route }) {
  const { shopId = '00000000-0000-0000-0000-000000000101', tableNumber, lang = 'en' } = route?.params || {};
  const { user } = useAuth();

  const [menu, setMenu]         = useState([]);
  const [cart, setCart]         = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen]= useState(false);
  const [search, setSearch]     = useState('');
  const [activeCat, setActiveCat]= useState(null);
  const [placedOrder, setPlaced]= useState(null);
  const [ordering, setOrdering] = useState(false);
  const [filter, setFilter]     = useState('all'); // all, veg, nonveg, popular
  const [customerInfo, setInfo] = useState({ name: user?.name || '', phone: user?.phone || '', table: tableNumber || '', paymentMethod: 'ONLINE' });

  useEffect(() => { loadMenu(); }, [shopId, lang]);

  const loadMenu = async () => {
    try {
      const res = await menuApi.getPublicMenu(shopId, lang);
      setMenu(res.data.data?.categories || []);
      if (res.data.data?.categories?.length > 0) setActiveCat(res.data.data.categories[0].id);
    } catch {}
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
        tableNumber:   customerInfo.table || tableNumber,
        paymentMethod: customerInfo.paymentMethod,
        type: 'DINE_IN',
        items: cartItems.map(i => ({ menuItemId: i.id, itemName: i.name, quantity: i.qty, unitPrice: i.effectivePrice })),
      };
      const res = await orderApi.placeOrder(shopId, orderData);
      setPlaced(res.data.data);
      setCart({});
      setCartOpen(false);
      setOrderOpen(true);
      Toast.show({ type: 'success', text1: '🎉 Order placed!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to place order' });
    } finally { setOrdering(false); }
  };

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: (cat.items || []).filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'veg' && !item.veg) return false;
      if (filter === 'nonveg' && item.veg) return false;
      if (filter === 'popular' && !item.popular) return false;
      return true;
    })
  })).filter(cat => cat.items.length > 0);

  const MenuItem = ({ item }) => {
    const qty = cart[item.id]?.qty || 0;
    return (
      <View style={styles.menuItem}>
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
        </View>
        {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.menuItemImage} />}
        <View style={styles.qtyControl}>
          {qty > 0 ? (
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item)}>
                <Icon name="minus" size={14} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(item)}>
                <Icon name="plus" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#0F6E56','#1D9E75']} style={styles.header}>
        <Text style={styles.shopTitle}>Menu</Text>
        {tableNumber && <Text style={styles.tableInfo}>Table {tableNumber}</Text>}
      </LinearGradient>

      {/* Search & Filters */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={Colors.gray400} />
          <TextInput style={styles.searchInput} placeholder="Search dishes…" placeholderTextColor={Colors.gray400} value={search} onChangeText={setSearch} />
        </View>
        <FlatList
          data={[{id:'all',label:'All'},{id:'veg',label:'🟢 Veg'},{id:'nonveg',label:'🔴 Non-Veg'},{id:'popular',label:'⭐ Popular'}]}
          horizontal showsHorizontalScrollIndicator={false} keyExtractor={f => f.id}
          style={{ marginTop: 8 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity style={[styles.filterChip, filter === f.id && styles.filterChipActive]} onPress={() => setFilter(f.id)}>
              <Text style={[styles.filterChipText, filter === f.id && styles.filterChipActiveText]}>{f.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Category tabs */}
      <FlatList
        data={menu}
        horizontal showsHorizontalScrollIndicator={false} keyExtractor={c => c.id}
        style={styles.catTabs}
        renderItem={({ item: cat }) => (
          <TouchableOpacity style={[styles.catTab, activeCat === cat.id && styles.catTabActive]} onPress={() => setActiveCat(cat.id)}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catTabText, activeCat === cat.id && styles.catTabActiveText]}>{cat.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Menu items */}
      <SectionList
        sections={filteredMenu.map(cat => ({ title: cat.name, emoji: cat.emoji, data: cat.items }))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MenuItem item={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 120 : 32 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Cart FAB */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => setCartOpen(true)} activeOpacity={0.9}>
          <Icon name="shopping-bag" size={18} color={Colors.white} />
          <Text style={styles.cartFabText}>{cartCount} item{cartCount > 1 ? 's' : ''}</Text>
          <Text style={styles.cartFabTotal}>₹{cartTotal.toFixed(0)}</Text>
          <Icon name="arrow-right" size={16} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Cart Bottom Sheet */}
      <BottomSheet visible={cartOpen} onClose={() => setCartOpen(false)} height={520}>
        <Text style={styles.sheetTitle}>Your order</Text>
        <ScrollView style={{ maxHeight: 200 }}>
          {cartItems.map(item => (
            <View key={item.id} style={styles.cartRow}>
              <View style={styles.cartQtyControl}>
                <TouchableOpacity onPress={() => removeItem(item)} style={styles.qtyBtn}><Icon name="minus" size={12} color={Colors.primary} /></TouchableOpacity>
                <Text style={styles.cartQtyText}>{item.qty}</Text>
                <TouchableOpacity onPress={() => addItem(item)} style={styles.qtyBtn}><Icon name="plus" size={12} color={Colors.primary} /></TouchableOpacity>
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
        <TextInput style={styles.infoInput} placeholder="Table number" value={customerInfo.table} onChangeText={v => setInfo(i => ({ ...i, table: v }))} keyboardType="number-pad" placeholderTextColor={Colors.gray400} />
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
      <BottomSheet visible={orderOpen} onClose={() => setOrderOpen(false)} height={380}>
        {placedOrder && (
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
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: Colors.background },
  header:         { paddingTop: 52, paddingBottom: 16, paddingHorizontal: Spacing.base },
  shopTitle:      { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white },
  tableInfo:      { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  searchWrap:     { backgroundColor: Colors.white, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: 14, height: 40, gap: 8 },
  searchInput:    { flex: 1, fontSize: FontSize.base, color: Colors.gray900 },
  filterChip:     { height: 30, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.gray100, justifyContent: 'center', marginRight: 6 },
  filterChipActive:{ backgroundColor: Colors.gray900 },
  filterChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  filterChipActiveText:{ color: Colors.white },
  catTabs:        { backgroundColor: Colors.white, paddingVertical: 10, paddingHorizontal: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catTab:         { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  catTabActive:   { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  catEmoji:       { fontSize: 14 },
  catTabText:     { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  catTabActiveText:{ color: Colors.white },
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
  menuItemImage:  { width: 80, height: 80, borderRadius: Radius.md },
  qtyControl:     { position: 'absolute', bottom: Spacing.base, right: Spacing.base },
  qtyRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.primary, overflow: 'hidden' },
  qtyBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyText:        { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary, paddingHorizontal: 6 },
  addBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 16 },
  addBtnText:     { color: Colors.white, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
  cartFab:        { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: Colors.gray900, borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, ...Shadow.lg },
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