import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { shopApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const ROLES = ['OWNER','MANAGER','CASHIER','KITCHEN','MENU_EDITOR','ORDER_VIEWER'];
const ROLE_COLORS = { OWNER: '#1D9E75', MANAGER: '#2563EB', CASHIER: '#7C3AED', KITCHEN: '#D97706', MENU_EDITOR: '#059669', ORDER_VIEWER: '#6B7280' };
// Mirrors web's ROLE_PERMISSIONS (AuthContext.jsx) — null means full access.
const ROLE_PERMISSIONS_PREVIEW = {
  OWNER:        'Full access to every screen',
  MANAGER:      'Full access to every screen',
  CASHIER:      ['Dashboard', 'Orders', 'Billing', 'Reports', 'Order History'],
  KITCHEN:      ['Dashboard', 'Orders', 'Kitchen (KOT)'],
  MENU_EDITOR:  ['Dashboard', 'Menu', 'Variants', 'Shortcodes', 'Dine-in Areas'],
  ORDER_VIEWER: ['Dashboard', 'Orders', 'Order History'],
};

export default function StaffScreen() {
  const { user } = useAuth();
  const shopId = useActiveShopId();
  const [staff, setStaff]   = useState([]);
  const [showAdd, setShowAdd]= useState(false);
  const [editing, setEditing]= useState(null);
  const [form, setForm]     = useState({ name: '', phone: '', email: '', role: 'CASHIER' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if(shopId) loadStaff(); }, [shopId]);

  const loadStaff = async () => {
    try {
      const res = await shopApi.getStaff(shopId);
      setStaff(res.data.data || []);
    } catch {}
  };

  const saveStaff = async () => {
    if (!form.name) return Alert.alert('Name required');
    setSaving(true);
    try {
      if (editing) {
        await shopApi.updateStaff(editing.id, form);
        setStaff(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
      } else {
        const res = await shopApi.addStaff(shopId, form);
        setStaff(prev => [...prev, res.data.data]);
      }
      setShowAdd(false); setEditing(null); setForm({ name: '', phone: '', email: '', role: 'CASHIER' });
    } catch { Alert.alert('Failed to save staff member'); }
    finally { setSaving(false); }
  };

  const removeStaff = (member) => {
    Alert.alert('Remove staff', `Remove ${member.name} from your team?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await shopApi.removeStaff(member.id);
          setStaff(prev => prev.filter(s => s.id !== member.id));
        } catch { Alert.alert('Failed to remove staff member'); }
      }}
    ]);
  };

  const StaffCard = ({ member }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[member.role] + '20' }]}>
        <Text style={[styles.avatarText, { color: ROLE_COLORS[member.role] }]}>{member.name?.[0] || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.meta}>{member.phone || member.email || 'No contact'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[member.role] + '18' }]}>
          <Text style={[styles.roleText, { color: ROLE_COLORS[member.role] }]}>{member.role}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => { setEditing(member); setForm({ name: member.name, phone: member.phone || '', email: member.email || '', role: member.role }); setShowAdd(true); }}>
          <Text style={{ fontSize: 16, color: Colors.gray400 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeStaff(member)}>
          <Text style={{ fontSize: 16, color: Colors.error }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Staff · {staff.length}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setForm({ name: '', phone: '', email: '', role: 'CASHIER' }); setShowAdd(true); }}>
          <Text style={{ fontSize: 18, color: Colors.primary }}>➕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <StaffCard member={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState icon="👥" title="No staff added" subtitle="Add team members to manage your shop" />}
      />

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={styles.sheetTitle}>{editing ? 'Edit Staff' : 'Add Staff Member'}</Text>
        <Input label="Full Name *" placeholder="Vikram Sharma" value={form.name} onChangeText={v => set('name', v)} />
        <Input label="Phone" placeholder="9900112233" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        <Input label="Email" placeholder="vikram@spiceroute.in" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.roleLabel}>Role</Text>
        <View style={styles.roleGrid}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[styles.roleChip, form.role === r && { backgroundColor: ROLE_COLORS[r] + '20', borderColor: ROLE_COLORS[r] }]} onPress={() => set('role', r)}>
              <Text style={[styles.roleChipText, form.role === r && { color: ROLE_COLORS[r] }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.permPreview}>
          <Text style={styles.permPreviewLabel}>Can access:</Text>
          {Array.isArray(ROLE_PERMISSIONS_PREVIEW[form.role]) ? (
            <View style={styles.permChipRow}>
              {ROLE_PERMISSIONS_PREVIEW[form.role].map(p => (
                <View key={p} style={styles.permChip}><Text style={styles.permChipText}>{p}</Text></View>
              ))}
            </View>
          ) : (
            <Text style={styles.permFullText}>{ROLE_PERMISSIONS_PREVIEW[form.role]}</Text>
          )}
        </View>
        <Button title={editing ? 'Update' : 'Add Staff'} onPress={saveStaff} loading={saving} style={{ marginTop: Spacing.md }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back:         { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title:        { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  addBtn:       { padding: 8 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 12, borderWidth: 1, borderColor: Colors.border },
  avatar:       { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: FontSize.lg, fontWeight: '800' },
  name:         { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  meta:         { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  roleBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, marginTop: 4 },
  roleText:     { fontSize: FontSize.xs, fontWeight: '700' },
  actions:      { gap: 14 },
  sheetTitle:   { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: Spacing.base },
  roleLabel:    { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8, marginTop: 4 },
  roleGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  roleChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
  permPreview:  { marginTop: 14, padding: 12, backgroundColor: Colors.gray50, borderRadius: Radius.md },
  permPreviewLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  permFullText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  permChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip:     { backgroundColor: Colors.white, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  permChipText: { fontSize: 11, fontWeight: '600', color: Colors.gray700 },
});