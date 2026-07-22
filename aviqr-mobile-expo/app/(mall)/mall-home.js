import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { mallApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { Logo } from '../../src/components/common/Logo.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { QrPosterStudio } from '../../src/components/common/QrPosterStudio.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const LINK_STATUS_CFG = {
  ACTIVE:   { label: 'Approved', color: '#059669', bg: '#DCFCE7' },
  PENDING:  { label: 'Pending',  color: '#D97706', bg: '#FEF3C7' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
};
const LINK_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'ACTIVE',   label: 'Approved' },
  { key: 'PENDING',  label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];
const NAV_ITEMS = [
  { icon: '🧾', label: 'Orders',       href: '/(mall)/mall-orders' },
  { icon: '💰', label: 'Revenue Share', href: '/(mall)/revenue' },
  { icon: '📱', label: 'QR Code',      href: '/(mall)/qrcode' },
  { icon: '📊', label: 'Reports',      href: '/(mall)/mall-reports' },
  { icon: '⭐', label: 'Subscription', href: '/(mall)/mall-subscription' },
  { icon: '⚙️', label: 'Settings',     href: '/(mall)/mall-settings' },
];

export default function MallHomeScreen() {
  const { user, logout } = useAuth();
  const [malls, setMalls]       = useState([]);
  const [mall, setMall]         = useState(null);
  const [vendors, setVendors]   = useState([]);
  const [search, setSearch]     = useState('');
  const [refreshing, setRef]    = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [form, setForm]         = useState({ name: '', category: '', floor: '', contact: '' });
  const [saving, setSaving]     = useState(false);
  const [linkFilter, setLinkFilter] = useState('all');
  const [inviteSheet, setInviteSheet] = useState(false);
  const [inviteShopId, setInviteShopId] = useState('');
  const [qrVendor, setQrVendor] = useState(null);
  const [inviting, setInviting] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const load = useCallback(async () => {
    try {
      const res = await mallApi.getMyMalls();
      const list = res.data.data || [];
      setMalls(list);
      if (list.length > 0) { setMall(list[0]); loadVendors(list[0].id); }
    } catch {}
  }, []);

  const loadVendors = async (mallId) => {
    try {
      const res = await mallApi.getVendors(mallId);
      setVendors(res.data.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRef(true); await load(); setRef(false); };

  const toggleVendor = async (vendor) => {
    try {
      await mallApi.toggleVendor(vendor.id, !vendor.active);
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, active: !v.active } : v));
    } catch { Alert.alert('Failed to update vendor status'); }
  };

  const addVendor = async () => {
    if (!form.name) return Alert.alert('Vendor name required');
    setSaving(true);
    try {
      const res = await mallApi.addVendor({ ...form, mallId: mall.id });
      setVendors(prev => [...prev, res.data.data]);
      setAddSheet(false);
      setForm({ name: '', category: '', floor: '', contact: '' });
    } catch { Alert.alert('Failed to add vendor'); }
    finally { setSaving(false); }
  };

  const inviteRestaurant = async () => {
    if (!inviteShopId.trim()) return Alert.alert('Enter the restaurant\'s shop ID');
    setInviting(true);
    try {
      const res = await mallApi.requestVendor({ mallId: mall.id, shopId: inviteShopId.trim() });
      setVendors(prev => [...prev, res.data.data]);
      setInviteSheet(false);
      setInviteShopId('');
      Alert.alert('Invite sent', 'The restaurant owner will see this request and can accept or reject it.');
    } catch (e) { Alert.alert('Could not send invite', e.response?.data?.message || 'Please check the shop ID and try again.'); }
    finally { setInviting(false); }
  };

  const deleteVendor = (vendor) => {
    Alert.alert('Remove vendor', `Remove ${vendor.name} from the mall?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await mallApi.deleteVendor(vendor.id);
          setVendors(prev => prev.filter(v => v.id !== vendor.id));
        } catch { Alert.alert('Failed to remove vendor'); }
      }}
    ]);
  };

  const activeCount = vendors.filter(v => v.active).length;
  // Vendor.revenue/orders don't exist on the backend entity — real per-vendor
  // revenue is computed properly (via a vendor-scoped token) in the Revenue
  // Share and Reports screens instead of read here as always-zero fields.

  const filtered = vendors
    .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()))
    .filter(v => linkFilter === 'all' || (v.status || 'ACTIVE') === linkFilter);

  const VendorCard = ({ vendor }) => {
    const link = LINK_STATUS_CFG[vendor.status || 'ACTIVE'];
    return (
      <View style={[styles.vendorCard, !vendor.active && styles.inactiveCard]}>
        <View style={styles.vendorLeft}>
          <View style={styles.vendorAvatar}><Text style={styles.vendorAvatarText}>{vendor.name?.[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              <View style={[styles.linkBadge, { backgroundColor: link.bg }]}><Text style={[styles.linkBadgeTxt, { color: link.color }]}>{link.label}</Text></View>
            </View>
            <Text style={styles.vendorMeta}>{vendor.category} · {vendor.floor}</Text>
            <Text style={styles.vendorContact}>{vendor.contact}</Text>
          </View>
        </View>
        <View style={styles.vendorRight}>
          {vendor.shopId && (
            <TouchableOpacity onPress={() => setQrVendor(vendor)}>
              <Text style={{ fontSize: 16, color: Colors.primary }}>📱</Text>
            </TouchableOpacity>
          )}
          <Switch value={!!vendor.active} onValueChange={() => toggleVendor(vendor)} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
          <TouchableOpacity onPress={() => deleteVendor(vendor)}>
            <Text style={{ fontSize: 16, color: Colors.error }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#1E3A5F','#2563EB']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Logo size={30} />
            <View>
              <Text style={styles.headerSub}>MALL DASHBOARD</Text>
              <Text style={styles.mallName}>{mall?.name || 'Loading…'}</Text>
              <Text style={styles.mallCity}>{mall?.city}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>🚪</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label:'Active Vendors', value: activeCount },
            { label:'Total Vendors',  value: vendors.length },
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

      <View style={styles.controls}>
        <Input placeholder="Search vendors…" value={search} onChangeText={setSearch} style={{ flex: 1, marginBottom: 0 }} />
        <TouchableOpacity style={styles.addBtn} onPress={() => setInviteSheet(true)}>
          <Text style={{ fontSize: 16, color: Colors.white }}>✉️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddSheet(true)}>
          <Text style={{ fontSize: 16, color: Colors.white }}>➕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {LINK_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, linkFilter === f.key && styles.filterChipActive]} onPress={() => setLinkFilter(f.key)}>
            <Text style={[styles.filterChipTxt, linkFilter === f.key && styles.filterChipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={v => v.id}
        renderItem={({ item }) => <VendorCard vendor={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        ListEmptyComponent={<EmptyState icon="🏪" title="No vendors yet" subtitle="Add your first vendor to the food court" />}
      />

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)}>
        <Text style={styles.sheetTitle}>Add Vendor</Text>
        <Input label="Vendor / Restaurant Name *" placeholder="Spice Route" value={form.name} onChangeText={v => set('name',v)} />
        <Input label="Category" placeholder="North Indian, Fast Food…" value={form.category} onChangeText={v => set('category',v)} />
        <Input label="Floor" placeholder="F1, F2, GF…" value={form.floor} onChangeText={v => set('floor',v)} />
        <Input label="Contact Number" placeholder="9845012345" value={form.contact} onChangeText={v => set('contact',v)} keyboardType="phone-pad" />
        <Button title="Add Vendor" onPress={addVendor} loading={saving} style={{ marginTop: 12 }} />
      </BottomSheet>

      <BottomSheet visible={inviteSheet} onClose={() => setInviteSheet(false)}>
        <Text style={styles.sheetTitle}>Invite a Restaurant</Text>
        <Text style={styles.inviteHint}>Enter the restaurant's shop ID — they'll get a request to link their shop to your food court, which they can accept or reject.</Text>
        <Input label="Restaurant shop ID" placeholder="e.g. ecdbc557-91fa-44ee-992f-03683ad8bbde" value={inviteShopId} onChangeText={setInviteShopId} autoCapitalize="none" />
        <Button title={inviting ? 'Sending…' : 'Send Invite'} onPress={inviteRestaurant} loading={inviting} style={{ marginTop: 12 }} />
      </BottomSheet>

      <QrPosterStudio
        visible={!!qrVendor}
        onClose={() => setQrVendor(null)}
        shopId={qrVendor?.shopId}
        shopName={qrVendor?.name}
        targetUrl={qrVendor?.shopId ? `https://aviqr.in/menu/${qrVendor.shopId}` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base },
  brandRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSub:    { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  mallName:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  mallCity:     { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statsRow:     { flexDirection: 'row', gap: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:     { alignItems: 'center', flex: 1 },
  statValue:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  statLabel:    { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  navGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.base, paddingBottom: 0 },
  navItem:      { width: '18%', alignItems: 'center', gap: 6, paddingVertical: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  navEmoji:     { fontSize: 20 },
  navLabel:     { fontSize: 10, fontWeight: '600', color: Colors.gray700, textAlign: 'center' },
  controls:     { flexDirection: 'row', gap: 10, padding: Spacing.base, alignItems: 'center' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, height: 44, paddingHorizontal: 14, borderRadius: Radius.md },
  addBtnText:   { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  vendorCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  inactiveCard: { opacity: 0.55 },
  vendorLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  vendorAvatarText:{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  vendorName:   { fontSize: FontSize.base, fontWeight: '700' },
  vendorMeta:   { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 1 },
  vendorContact:{ fontSize: FontSize.xs, color: Colors.gray400 },
  vendorRight:  { alignItems: 'center', gap: 10 },
  sheetTitle:   { fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.base },
  linkBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  linkBadgeTxt: { fontSize: 9.5, fontWeight: '700' },
  filterRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  filterChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipTxt: { fontSize: 11.5, fontWeight: '700', color: Colors.gray600 },
  filterChipTxtActive: { color: Colors.white },
  inviteHint:   { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 12, lineHeight: 17 },
});