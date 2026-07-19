import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import * as Print from 'expo-print';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { menuApi, variantApi, addonApi, shopApi, posApi, invoiceApi } from '../../src/api/index.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
const ORDER_TYPE_LABEL = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' };
const PAY_METHODS = ['CASH', 'UPI', 'CARD'];
const PAY_METHOD_LABEL = { CASH: '💵 Cash', UPI: '📱 UPI', CARD: '💳 Card' };

export default function BillingScreen() {
  const { user } = useAuth();
  const shopId = useActiveShopId();

  const [cats, setCats]       = useState([]);
  const [items, setItems]     = useState([]);
  const [addons, setAddons]   = useState([]);
  const [taxPercent, setTax]  = useState(0);
  const [selCat, setSelCat]   = useState(null);
  const [search, setSearch]   = useState('');
  const [offline, setOffline] = useState(false);

  const [cart, setCart] = useState([]); // [{key, menuItemId, name, variantName, unitPrice, addons:[{name,price}], qty, notes}]

  const [pickItem, setPickItem]       = useState(null); // item currently being configured
  const [pickVariants, setPickVariants] = useState([]);
  const [pickVariant, setPickVariant] = useState(null);
  const [pickAddons, setPickAddons]   = useState([]); // selected addon objects
  const [pickQty, setPickQty]         = useState(1);
  const [pickNotes, setPickNotes]     = useState('');

  const [showCart, setShowCart]       = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType]     = useState('DINE_IN');
  const [payMethod, setPayMethod]     = useState('CASH');
  const [discount, setDiscount]       = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [placing, setPlacing]         = useState(false);
  const [success, setSuccess]         = useState(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const [c, i, a, s] = await Promise.allSettled([
        menuApi.getCategories(shopId),
        menuApi.getItems(shopId),
        addonApi.getByShop(shopId),
        shopApi.getSettings(shopId),
      ]);
      if (c.status === 'fulfilled') setCats(c.value.data.data || []);
      if (i.status === 'fulfilled') setItems(i.value.data.data || []);
      if (a.status === 'fulfilled') setAddons(a.value.data.data || []);
      if (s.status === 'fulfilled') setTax(s.value.data.data?.taxPercent || 0);
      setOffline(c.status === 'rejected' && i.status === 'rejected');
      if (c.status === 'fulfilled' && (c.value.data.data || []).length && !selCat) setSelCat(c.value.data.data[0]);
    } catch { setOffline(true); }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(it => {
    if (selCat && it.categoryId !== selCat.id) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return it.available !== false;
  });

  // ── Add-item flow ──────────────────────────────────────────────────────────
  const openItem = async (item) => {
    setPickItem(item);
    setPickVariant(null);
    setPickAddons([]);
    setPickQty(1);
    setPickNotes('');
    setPickVariants([]);
    try {
      const res = await variantApi.getVariants(item.id);
      setPickVariants((res.data.data || []).filter(v => v.active !== false));
    } catch { setPickVariants([]); }
  };

  const toggleAddon = (addon) => {
    setPickAddons(prev => prev.some(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]);
  };

  const pickUnitPrice = () => (pickVariant ? pickVariant.price : pickItem?.price) || 0;
  const pickAddonTotal = () => pickAddons.reduce((s, a) => s + (a.price || 0), 0);
  const pickLineTotal = () => (pickUnitPrice() + pickAddonTotal()) * pickQty;

  const addToCart = () => {
    if (!pickItem) return;
    const line = {
      key: `${pickItem.id}-${pickVariant?.id || 'base'}-${Date.now()}`,
      menuItemId: pickItem.id,
      name: pickItem.name,
      variantName: pickVariant?.variantName || null,
      // The backend bills `unitPrice * quantity` only — addon prices are stored for
      // record-keeping/KOT display but never added separately, so (like variantName)
      // the addon total must already be folded into unitPrice or it goes unbilled.
      unitPrice: pickUnitPrice() + pickAddonTotal(),
      addons: pickAddons.map(a => ({ name: a.name, price: a.price })),
      qty: pickQty,
      notes: pickNotes,
    };
    setCart(prev => [...prev, line]);
    setPickItem(null);
  };

  const changeQty = (key, delta) => {
    setCart(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(1, l.qty + delta) } : l));
  };
  const removeLine = (key) => setCart(prev => prev.filter(l => l.key !== key));

  // ── Totals ──────────────────────────────────────────────────────────────────
  // l.unitPrice already has any addon total folded in (see addToCart) — matches
  // the backend's own subtotal formula of unitPrice * quantity exactly.
  const lineTotal = (l) => l.unitPrice * l.qty;
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const discountAmt = Math.min(parseFloat(discount) || 0, subtotal);
  const serviceAmt = parseFloat(serviceCharge) || 0;
  const taxableAmount = subtotal - discountAmt + serviceAmt;
  const taxAmt = taxableAmount * (taxPercent || 0) / 100;
  const total = taxableAmount + taxAmt;
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const placeBill = async () => {
    if (!cart.length) return;
    if (!customerName.trim()) return Alert.alert('Required', 'Customer name is required');
    setPlacing(true);
    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      tableNumber: tableNumber.trim() || undefined,
      type: orderType,
      paymentMethod: payMethod,
      discount: discountAmt,
      serviceCharge: serviceAmt,
      items: cart.map(l => ({
        menuItemId: l.menuItemId,
        itemName: l.name + (l.variantName ? ` (${l.variantName})` : ''),
        variantName: l.variantName || undefined,
        quantity: l.qty,
        unitPrice: l.unitPrice,
        notes: l.notes || undefined,
        addons: l.addons,
      })),
    };
    try {
      const res = await posApi.createBill(shopId, payload);
      setSuccess(res.data.data);
    } catch (e) {
      Alert.alert('Could not place bill', e.response?.data?.message || 'Please check your connection and try again.');
    } finally { setPlacing(false); }
  };

  const printDoc = async (getHtml, orderId) => {
    try {
      const res = await getHtml(orderId);
      await Print.printAsync({ html: res.data });
    } catch { Alert.alert('Print failed', 'Could not load the document to print.'); }
  };

  const resetBill = () => {
    setCart([]); setCustomerName(''); setCustomerPhone(''); setTableNumber('');
    setOrderType('DINE_IN'); setPayMethod('CASH'); setDiscount(''); setServiceCharge('');
    setSuccess(null); setShowCart(false);
  };

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <Text style={ss.title}>Billing</Text>
      </View>
      {offline && <OfflineBadge onRetry={load} />}
      <TextInput style={ss.search} placeholder="Search items…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={cats} keyExtractor={c => c.id}
        style={ss.catList}
        renderItem={({ item: cat }) => (
          <TouchableOpacity style={[ss.catChip, selCat?.id === cat.id && ss.catActive]} onPress={() => setSelCat(cat)}>
            <Text style={[ss.catTxt, selCat?.id === cat.id && ss.catActiveTxt]}>{cat.emoji} {cat.name}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList data={filtered} keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: cart.length ? 96 : 32 }}
        ListEmptyComponent={<EmptyState icon="🍽️" title="No items" subtitle="Add menu items first, then come back to bill" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.item} onPress={() => openItem(item)}>
            <View style={[ss.vegDot, { backgroundColor: item.veg ? '#1D9E75' : '#DC2626' }]} />
            <View style={ss.itemInfo}>
              <Text style={ss.itemName}>{item.name}</Text>
              <Text style={ss.itemPrice}>₹{item.price}</Text>
            </View>
            <Text style={ss.addTxt}>+ Add</Text>
          </TouchableOpacity>
        )}
      />

      {/* Sticky cart bar */}
      {cart.length > 0 && (
        <TouchableOpacity style={ss.cartBar} onPress={() => setShowCart(true)}>
          <Text style={ss.cartBarTxt}>🛒 {cartCount} item{cartCount > 1 ? 's' : ''} · ₹{subtotal.toFixed(0)}</Text>
          <Text style={ss.cartBarView}>View bill →</Text>
        </TouchableOpacity>
      )}

      {/* Item configure modal */}
      <Modal visible={!!pickItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickItem(null)}>
        <ScrollView style={ss.modal} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>{pickItem?.name}</Text>
            <TouchableOpacity onPress={() => setPickItem(null)}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
          </View>

          {pickVariants.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={ss.sectionLabel}>Choose size</Text>
              {pickVariants.map(v => (
                <TouchableOpacity key={v.id} style={[ss.optRow, pickVariant?.id === v.id && ss.optRowActive]} onPress={() => setPickVariant(v)}>
                  <Text style={ss.optName}>{v.variantName}</Text>
                  <Text style={ss.optPrice}>₹{v.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {addons.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={ss.sectionLabel}>Add-ons</Text>
              {addons.map(a => {
                const on = pickAddons.some(x => x.id === a.id);
                return (
                  <TouchableOpacity key={a.id} style={[ss.optRow, on && ss.optRowActive]} onPress={() => toggleAddon(a)}>
                    <Text style={ss.optName}>{on ? '☑' : '☐'} {a.name}</Text>
                    <Text style={ss.optPrice}>+₹{a.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={ss.sectionLabel}>Quantity</Text>
          <View style={ss.qtyRow}>
            <TouchableOpacity style={ss.qtyBtn} onPress={() => setPickQty(q => Math.max(1, q - 1))}><Text style={ss.qtyBtnTxt}>−</Text></TouchableOpacity>
            <Text style={ss.qtyVal}>{pickQty}</Text>
            <TouchableOpacity style={ss.qtyBtn} onPress={() => setPickQty(q => q + 1)}><Text style={ss.qtyBtnTxt}>+</Text></TouchableOpacity>
          </View>

          <Input label="Note (optional)" placeholder="No onions, extra spicy…" value={pickNotes} onChangeText={setPickNotes} />

          <Button title={`Add to bill · ₹${pickLineTotal().toFixed(0)}`} onPress={addToCart} style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* Cart / checkout modal */}
      <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCart(false)}>
        <ScrollView style={ss.modal} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          {success ? (
            <View style={{ alignItems: 'center', paddingTop: 24 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
              <Text style={ss.modalTitle}>Bill #{success.orderNumber} created</Text>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, marginTop: 8 }}>₹{parseFloat(success.totalAmount || 0).toFixed(0)}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' }}>
                <Button title="🧾 Print Receipt" onPress={() => printDoc(invoiceApi.getInvoiceHtml, success.id)} variant="outline" style={{ flex: 1 }} />
                <Button title="🍳 Print KOT" onPress={() => printDoc(invoiceApi.getKotHtml, success.id)} variant="outline" style={{ flex: 1 }} />
              </View>
              <Button title="New Bill" onPress={resetBill} style={{ marginTop: 12, width: '100%' }} />
            </View>
          ) : (
            <>
              <View style={ss.modalHeader}>
                <Text style={ss.modalTitle}>Bill Summary</Text>
                <TouchableOpacity onPress={() => setShowCart(false)}><Text style={{ fontSize: 20, color: Colors.gray500 }}>✕</Text></TouchableOpacity>
              </View>

              {cart.map(l => (
                <View key={l.key} style={ss.cartLine}>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.itemName}>{l.name}{l.variantName ? ` (${l.variantName})` : ''}</Text>
                    {l.addons.length > 0 && <Text style={ss.itemDesc}>{l.addons.map(a => a.name).join(', ')}</Text>}
                    <Text style={ss.itemPrice}>₹{lineTotal(l).toFixed(0)}</Text>
                  </View>
                  <View style={ss.qtyRow}>
                    <TouchableOpacity style={ss.qtyBtn} onPress={() => changeQty(l.key, -1)}><Text style={ss.qtyBtnTxt}>−</Text></TouchableOpacity>
                    <Text style={ss.qtyVal}>{l.qty}</Text>
                    <TouchableOpacity style={ss.qtyBtn} onPress={() => changeQty(l.key, 1)}><Text style={ss.qtyBtnTxt}>+</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => removeLine(l.key)}><Text style={{ color: Colors.error, fontSize: 16, marginLeft: 8 }}>🗑</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <Input label="Customer Name *" placeholder="Walk-in customer" value={customerName} onChangeText={setCustomerName} />
              <Input label="Phone (optional)" placeholder="98765 43210" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
              <Input label="Table Number (optional)" placeholder="T-04" value={tableNumber} onChangeText={setTableNumber} />

              <Text style={ss.sectionLabel}>Order type</Text>
              <View style={ss.chipRow}>
                {ORDER_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[ss.chip, orderType === t && ss.chipActive]} onPress={() => setOrderType(t)}>
                    <Text style={[ss.chipTxt, orderType === t && ss.chipActiveTxt]}>{ORDER_TYPE_LABEL[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={ss.sectionLabel}>Payment method</Text>
              <View style={ss.chipRow}>
                {PAY_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[ss.chip, payMethod === m && ss.chipActive]} onPress={() => setPayMethod(m)}>
                    <Text style={[ss.chipTxt, payMethod === m && ss.chipActiveTxt]}>{PAY_METHOD_LABEL[m]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Input label="Discount (₹)" placeholder="0" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" style={{ flex: 1 }} />
                <Input label="Service Charge (₹)" placeholder="0" value={serviceCharge} onChangeText={setServiceCharge} keyboardType="decimal-pad" style={{ flex: 1 }} />
              </View>

              <View style={ss.totals}>
                <View style={ss.totalRow}><Text style={ss.totalLabel}>Subtotal</Text><Text style={ss.totalVal}>₹{subtotal.toFixed(0)}</Text></View>
                {discountAmt > 0 && <View style={ss.totalRow}><Text style={ss.totalLabel}>Discount</Text><Text style={ss.totalVal}>−₹{discountAmt.toFixed(0)}</Text></View>}
                {serviceAmt > 0 && <View style={ss.totalRow}><Text style={ss.totalLabel}>Service Charge</Text><Text style={ss.totalVal}>₹{serviceAmt.toFixed(0)}</Text></View>}
                {taxPercent > 0 && <View style={ss.totalRow}><Text style={ss.totalLabel}>Tax ({taxPercent}%)</Text><Text style={ss.totalVal}>₹{taxAmt.toFixed(0)}</Text></View>}
                <View style={[ss.totalRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }]}>
                  <Text style={ss.grandLabel}>Total</Text><Text style={ss.grandVal}>₹{total.toFixed(0)}</Text>
                </View>
              </View>

              <Button title={placing ? 'Placing bill…' : `Place Bill · ₹${total.toFixed(0)}`} onPress={placeBill} loading={placing} disabled={!cart.length} style={{ marginTop: 16 }} />
              <Button title="Cancel" onPress={() => setShowCart(false)} variant="ghost" style={{ marginTop: 8 }} />
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 },
  search: { height: 40, backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: 14, margin: 12, fontSize: FontSize.base, color: Colors.gray900 },
  catList: { paddingHorizontal: 12, paddingBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  catActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  catTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  catActiveTxt: { color: Colors.white },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  vegDot: { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: Colors.white, flexShrink: 0 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  itemDesc: { fontSize: FontSize.xs, color: Colors.gray400 },
  itemPrice: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  addTxt: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  cartBar: { position: 'absolute', left: 12, right: 12, bottom: 16, backgroundColor: Colors.gray900, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadow.lg },
  cartBarTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.base },
  cartBarView: { color: Colors.primaryLight, fontWeight: '700', fontSize: FontSize.sm },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, textAlign: 'center' },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginBottom: 8, marginTop: 4 },
  optRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  optRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.gray900 },
  optPrice: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray700 },
  qtyVal: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900, minWidth: 20, textAlign: 'center' },
  cartLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt: { color: Colors.white },
  totals: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginTop: 8, ...Shadow.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: FontSize.sm, color: Colors.gray600 },
  totalVal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  grandLabel: { fontSize: FontSize.md, fontWeight: '800', color: Colors.gray900 },
  grandVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
});
