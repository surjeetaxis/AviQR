import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Icon not needed — using emoji
// Toast replaced with Alert
import { mallApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
// SearchBar replaced with TextInput
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
// BottomSheet replaced with Modal
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function MallHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [malls, setMalls]       = useState([]);
  const [mall, setMall]         = useState(null);
  const [vendors, setVendors]   = useState([]);
  const [search, setSearch]     = useState('');
  const [refreshing, setRef]    = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [form, setForm]         = useState({ name: '', category: '', floor: '', contact: '' });
  const [saving, setSaving]     = useState(false);
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
    } catch { Toast.show({ type: 'error', text1: 'Failed to update' }); }
  };

  const addVendor = async () => {
    if (!form.name) return Toast.show({ type: 'error', text1: 'Vendor name required' });
    setSaving(true);
    try {
      const res = await mallApi.addVendor({ ...form, mallId: mall.id });
      setVendors(prev => [...prev, res.data.data]);
      setAddSheet(false);
      setForm({ name: '', category: '', floor: '', contact: '' });
      Toast.show({ type: 'success', text1: 'Vendor added!' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to add vendor' }); }
    finally { setSaving(false); }
  };

  const deleteVendor = (vendor) => {
    Alert.alert('Remove vendor', `Remove ${vendor.name} from the mall?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await mallApi.deleteVendor(vendor.id);
        setVendors(prev => prev.filter(v => v.id !== vendor.id));
        Toast.show({ type: 'success', text1: 'Vendor removed' });
      }}
    ]);
  };

  const activeCount   = vendors.filter(v => v.active).length;
  const totalRevenue  = vendors.reduce((s, v) => s + (v.revenue || 0), 0);
  const totalOrders   = vendors.reduce((s, v) => s + (v.orders || 0), 0);

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  const VendorCard = ({ vendor }) => (
    <View style={[styles.vendorCard, !vendor.active && styles.inactiveCard]}>
      <View style={styles.vendorLeft}>
        <View style={styles.vendorAvatar}><Text style={styles.vendorAvatarText}>{vendor.name?.[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <Text style={styles.vendorMeta}>{vendor.category} · {vendor.floor}</Text>
          <Text style={styles.vendorContact}>{vendor.contact}</Text>
        </View>
      </View>
      <View style={styles.vendorRight}>
        <Switch value={!!vendor.active} onValueChange={() => toggleVendor(vendor)} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
        <TouchableOpacity onPress={() => deleteVendor(vendor)}>
          <Icon name="trash-2" size={14} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={['#1E3A5F','#2563EB']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>MALL DASHBOARD</Text>
            <Text style={styles.mallName}>{mall?.name || 'Loading…'}</Text>
            <Text style={styles.mallCity}>{mall?.city}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Icon name="log-out" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label:'Active Vendors', value: activeCount },
            { label:'Commission 10%', value: `₹${Math.round(totalRevenue * 0.1).toLocaleString('en-IN')}` },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search vendors…" />
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddSheet(true)}>
          <Icon name="plus" size={16} color={Colors.white} />
          <Text style={styles.addBtnText}>Add Vendor</Text>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { paddingTop: 52, paddingHorizontal: Spacing.base, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base },
  headerSub:    { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  mallName:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 4 },
  mallCity:     { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statsRow:     { flexDirection: 'row', gap: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.md },
  statItem:     { alignItems: 'center', flex: 1 },
  statValue:    { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  statLabel:    { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
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
});