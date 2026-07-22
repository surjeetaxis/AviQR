import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const ROLE_COLOR = { OWNER:'#1D9E75',MANAGER:'#2563EB',CASHIER:'#7C3AED',ADMIN:'#DC2626',SUPPORT:'#0891B2',HOTEL:'#7C3AED',MALL:'#2563EB',CUSTOMER:'#6B7280',SUPPLIER:'#059669',KITCHEN:'#D97706' };

export default function AdminUsersScreen() {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');
  const [page, setPage]     = useState(0);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRef]= useState(false);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const res = await authApi.getUsers({ search, role, page: reset ? 0 : page, size: 20 });
      const data = res.data.data;
      setUsers(reset ? (data.content || []) : prev => [...prev, ...(data.content || [])]);
      setTotal(data.totalElements || 0);
      if (reset) setPage(0);
    } catch {}
    finally { setLoading(false); }
  }, [search, role, page]);

  useEffect(() => { load(true); }, [search, role]);

  const changeStatus = async (id, status) => {
    try {
      await authApi.updateStatus(id, status);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
      setSelected(null);
    } catch { Alert.alert('Failed to update status'); }
  };

  const deleteUser = (user) => {
    Alert.alert('Delete user', `Permanently delete ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await authApi.deleteUser(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          setSelected(null);
        } catch { Alert.alert('Failed to delete user'); }
      }}
    ]);
  };

  const ROLES = ['', 'OWNER','MANAGER','CASHIER','KITCHEN','ADMIN','SUPPORT','HOTEL','MALL','CUSTOMER','SUPPLIER'];
  const EDITABLE_ROLES = ['OWNER','MANAGER','CASHIER','KITCHEN','MENU_EDITOR','ORDER_VIEWER','ADMIN','SUPPORT','HOTEL','MALL','SUPPLIER'];
  const [changingRole, setChangingRole] = useState(false);

  const changeRole = async (newRole) => {
    if (newRole === selected.role) return;
    setChangingRole(true);
    try {
      await authApi.updateRole(selected.id, newRole);
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, role: newRole } : u));
      setSelected(prev => prev ? { ...prev, role: newRole } : prev);
    } catch { Alert.alert('Failed to update role'); }
    finally { setChangingRole(false); }
  };

  const UserCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
      <View style={[styles.avatar, { backgroundColor: (ROLE_COLOR[item.role] || Colors.gray400) + '20' }]}>
        <Text style={[styles.avatarTxt, { color: ROLE_COLOR[item.role] || Colors.gray600 }]}>{item.name?.[0] || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || Colors.gray400) + '18' }]}>
            <Text style={[styles.roleTxt, { color: ROLE_COLOR[item.role] || Colors.gray600 }]}>{item.role}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
      </View>
      <Text style={{ fontSize: 16, color: Colors.gray300 }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Users · ${total} total`} />
      <View style={styles.controls}>
        <Input placeholder="Name, email, phone…" value={search} onChangeText={setSearch} />
        <FlatList
          data={ROLES}
          horizontal showsHorizontalScrollIndicator={false} keyExtractor={r => r}
          style={{ marginTop: 8 }}
          renderItem={({ item: r }) => (
            <TouchableOpacity style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
              <Text style={[styles.chipTxt, role === r && styles.chipActiveTxt]}>{r || 'All Roles'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        renderItem={({ item }) => <UserCard item={item} />}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(true); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="👥" title="No users found" />}
        onEndReached={() => { if (users.length < total) { setPage(p => p + 1); load(); } }}
        onEndReachedThreshold={0.3}
      />

      {/* User action sheet */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <View style={styles.selectedHeader}>
              <View style={[styles.avatar, { backgroundColor: (ROLE_COLOR[selected.role] || Colors.gray400) + '20' }]}>
                <Text style={[styles.avatarTxt, { color: ROLE_COLOR[selected.role] || Colors.gray600 }]}>{selected.name?.[0]}</Text>
              </View>
              <View>
                <Text style={styles.selectedName}>{selected.name}</Text>
                <Text style={styles.selectedEmail}>{selected.email}</Text>
                <Text style={styles.selectedPhone}>{selected.phone}</Text>
              </View>
            </View>
            <View style={styles.actionBtns}>
              {selected.status !== 'ACTIVE'     && <Button title="✓ Activate"  onPress={() => changeStatus(selected.id,'ACTIVE')}     style={{ marginBottom: 8 }} />}
              {selected.status !== 'SUSPENDED'  && <Button title="⊘ Suspend"   onPress={() => changeStatus(selected.id,'SUSPENDED')}  variant="outline" style={{ marginBottom: 8 }} />}
              {selected.status !== 'INACTIVE'   && <Button title="◌ Deactivate"onPress={() => changeStatus(selected.id,'INACTIVE')}   variant="ghost" style={{ marginBottom: 8 }} />}
            </View>

            <Text style={styles.roleEditLabel}>Change role {changingRole ? '(saving…)' : ''}</Text>
            <View style={styles.roleGrid}>
              {EDITABLE_ROLES.map(r => (
                <TouchableOpacity key={r} disabled={changingRole} style={[styles.roleChip, selected.role === r && { backgroundColor: (ROLE_COLOR[r] || Colors.gray400) + '20', borderColor: ROLE_COLOR[r] || Colors.gray400 }]} onPress={() => changeRole(r)}>
                  <Text style={[styles.roleChipTxt, selected.role === r && { color: ROLE_COLOR[r] || Colors.gray600 }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="🗑 Delete user" onPress={() => deleteUser(selected)} variant="danger" style={{ marginTop: 16 }} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  controls:     { padding: Spacing.base, paddingBottom: 0 },
  chip:         { height: 30, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', marginRight: 6 },
  chipActive:   { backgroundColor: Colors.gray900, borderColor: Colors.gray900 },
  chipTxt:      { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipActiveTxt:{ color: Colors.white },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 12, borderWidth: 1, borderColor: Colors.border },
  avatar:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: FontSize.lg, fontWeight: '800' },
  userName:     { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  userEmail:    { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  metaRow:      { flexDirection: 'row', gap: 6, marginTop: 4 },
  roleBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  roleTxt:      { fontSize: FontSize.xs, fontWeight: '700' },
  selectedHeader:{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.xl },
  selectedName: { fontSize: FontSize.lg, fontWeight: '800' },
  selectedEmail:{ fontSize: FontSize.sm, color: Colors.gray400 },
  selectedPhone:{ fontSize: FontSize.sm, color: Colors.gray400 },
  actionBtns:   {},
  roleEditLabel:{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 8 },
  roleGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  roleChipTxt:  { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
});