import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// Icon not needed — using emoji
// Toast replaced with Alert
import { shopApi } from '../../src/api/index.js';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
// Header removed - expo-router handles navigation
// BottomSheet replaced with Modal
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const ROLES = ['OWNER','MANAGER','CASHIER','KITCHEN','MENU_EDITOR','ORDER_VIEWER'];
const ROLE_COLORS = { OWNER: '#1D9E75', MANAGER: '#2563EB', CASHIER: '#7C3AED', KITCHEN: '#D97706', MENU_EDITOR: '#059669', ORDER_VIEWER: '#6B7280' };

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
    if (!form.name) return Toast.show({ type: 'error', text1: 'Name required' });
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
      Toast.show({ type: 'success', text1: editing ? 'Staff updated' : 'Staff added' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to save' }); }
    finally { setSaving(false); }
  };

  const removeStaff = (member) => {
    Alert.alert('Remove staff', `Remove ${member.name} from your team?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await shopApi.removeStaff(member.id);
        setStaff(prev => prev.filter(s => s.id !== member.id));
        Toast.show({ type: 'success', text1: 'Staff removed' });
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
          <Icon name="edit-2" size={16} color={Colors.gray400} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeStaff(member)}>
          <Icon name="trash-2" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Header title="Staff" subtitle={`${staff.length} members`} rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setForm({ name: '', phone: '', email: '', role: 'CASHIER' }); setShowAdd(true); }}>
          <Icon name="user-plus" size={18} color={Colors.primary} />
        </TouchableOpacity>
      } />

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
        <Button title={editing ? 'Update' : 'Add Staff'} onPress={saveStaff} loading={saving} style={{ marginTop: Spacing.md }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
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
});