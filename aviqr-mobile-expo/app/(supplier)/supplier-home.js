import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { shopApi, reportApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { Logo } from '../../src/components/common/Logo.js';
import { Card } from '../../src/components/common/Card.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const NAV_ITEMS = [
  { icon: '🔄', label: 'Menu Sync',   href: '/(supplier)/menu-sync' },
  { icon: '🧾', label: 'Orders',      href: '/(supplier)/orders' },
  { icon: '📱', label: 'QR Codes',    href: '/(supplier)/qrcodes' },
  { icon: '📊', label: 'Reports',     href: '/(supplier)/reports' },
  { icon: '⭐', label: 'Subscription', href: '/(supplier)/subscription' },
  { icon: '⚙️', label: 'Settings',     href: '/(supplier)/settings' },
];

export default function SupplierHomeScreen() {
  const { user, logout } = useAuth();
  const [shops, setShops]   = useState([]);
  const [refreshing, setRef]= useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '', tableCount: '' });
  const [creating, setCreating] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { load(); }, []);

  const createOutlet = async () => {
    if (!form.name.trim() || !form.phone.trim()) return Alert.alert('Name and phone are required');
    setCreating(true);
    try {
      await shopApi.create({ name: form.name.trim(), phone: form.phone.trim(), city: form.city, address: form.address, tableCount: form.tableCount ? Number(form.tableCount) : undefined });
      setAddSheet(false);
      setForm({ name: '', phone: '', city: '', address: '', tableCount: '' });
      await load();
    } catch (e) { Alert.alert('Could not create outlet', e.response?.data?.message || 'Please check the details and try again.'); }
    finally { setCreating(false); }
  };

  const load = async () => {
    try {
      const res = await shopApi.getMyShops();
      const shopList = res.data.data || [];
      const base = shopList.map(s => ({ ...s, orders: 0, revenue: 0 }));
      setShops(base);
      // Today's orders/revenue per outlet — the supplier's own login has no
      // shopId, so a direct report-service call would 403; mint a
      // shop-scoped token first (Shop entity has no revenue/orders fields of
      // its own, so this is the only way to show a real number here).
      const results = await Promise.all(base.map(o =>
        shopApi.enter(o.id)
          .then(res => reportApi.getDaily(o.id, res.data.data.accessToken))
          .then(res => ({ id: o.id, ...res.data.data }))
          .catch(() => null)
      ));
      setShops(prev => prev.map(o => {
        const r = results.find(x => x?.id === o.id);
        return r ? { ...o, orders: r.totalOrders || 0, revenue: r.totalRevenue || 0 } : o;
      }));
    } catch {}
  };

  const totalRevenue = shops.reduce((s, sh) => s + (sh.revenue || 0), 0);
  const totalOrders  = shops.reduce((s, sh) => s + (sh.orders || 0), 0);

  const ShopCard = ({ shop }) => (
    <TouchableOpacity style={styles.shopCard} onPress={() => router.push(`/(supplier)/shops/${shop.id}/dashboard`)} activeOpacity={0.85}>
      <View style={styles.shopAvatar}>
        <Text style={styles.shopAvatarText}>{shop.name?.[0]}</Text>
      </View>
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shop.name}</Text>
        <Text style={styles.shopCity}>{shop.city}</Text>
        <View style={styles.shopMetaRow}>
          <Text style={styles.shopOrders}>📦 {shop.tableCount || 0} tables</Text>
          <StatusBadge status={shop.status || 'ACTIVE'} />
        </View>
      </View>
      <Text style={{fontSize:16,color:Colors.gray300}}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#064E3B','#059669']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Logo size={30} />
            <View>
              <Text style={styles.headerSub}>BRAND / SUPPLIER</Text>
              <Text style={styles.headerName}>{user?.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Text style={{fontSize:18,color:'rgba(255,255,255,0.6)'}}>⎋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label:'Outlets', value: shops.length },
            { label:'Active',  value: shops.filter(s => s.status === 'ACTIVE').length },
            { label:'Revenue (today)', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.navGrid}>
        {NAV_ITEMS.map(n => (
          <TouchableOpacity key={n.href} style={styles.navItem} onPress={() => router.push(n.href)} activeOpacity={0.8}>
            <Text style={styles.navEmoji}>{n.icon}</Text>
            <Text style={styles.navLabel}>{n.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={shops}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <ShopCard shop={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.white} />}
        ListHeaderComponent={
          <View style={styles.kpis}>
            <Card style={[styles.kpi, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.kpiValue}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
            </Card>
            <Card style={[styles.kpi, { borderLeftColor: '#2563EB' }]}>
              <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{totalOrders}</Text>
              <Text style={styles.kpiLabel}>Total Orders</Text>
            </Card>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>No outlets added yet</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addOutletBtn} onPress={() => setAddSheet(true)}>
            <Text style={styles.addOutletText}>+ Add Outlet</Text>
          </TouchableOpacity>
        }
      />

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} height={480}>
        <Text style={styles.sheetTitle}>Add a new outlet</Text>
        <Input label="Outlet name *" placeholder="Ramesh Tea House — Jayanagar" value={form.name} onChangeText={v => set('name', v)} />
        <Input label="Phone *" placeholder="9900112233" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        <Input label="City" placeholder="Bengaluru" value={form.city} onChangeText={v => set('city', v)} />
        <Input label="Address" value={form.address} onChangeText={v => set('address', v)} multiline />
        <Input label="Number of tables" value={form.tableCount} onChangeText={v => set('tableCount', v)} keyboardType="numeric" />
        <Button title={creating ? 'Creating…' : 'Create Outlet'} onPress={createOutlet} loading={creating} style={{ marginTop: 8 }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base },
  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSub:  { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  headerName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  statsRow:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:   { flex: 1, alignItems: 'center' },
  statValue:  { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  statLabel:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  navGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.base, paddingBottom: 0 },
  navItem:    { width: '18%', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  navEmoji:   { fontSize: 20 },
  navLabel:   { fontSize: 10, fontWeight: '600', color: Colors.gray700, textAlign: 'center' },
  kpis:       { flexDirection: 'row', gap: 10, marginBottom: Spacing.base },
  kpi:        { flex: 1, padding: Spacing.base, borderLeftWidth: 3 },
  kpiValue:   { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.primary },
  kpiLabel:   { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 3 },
  shopCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  shopAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  shopAvatarText:{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  shopInfo:   { flex: 1 },
  shopName:   { fontSize: FontSize.base, fontWeight: '700' },
  shopCity:   { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  shopMetaRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  shopOrders: { fontSize: FontSize.xs, color: Colors.gray500 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontSize: FontSize.base, color: Colors.gray400 },
  addOutletBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', marginTop: 4 },
  addOutletText: { fontWeight: '700', color: Colors.primary, fontSize: FontSize.sm },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: Spacing.base },
});