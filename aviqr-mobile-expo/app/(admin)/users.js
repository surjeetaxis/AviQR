import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
// Icon not needed — using emoji
// Toast replaced with Alert
import { authApi } from '../../src/api/index.js';
// Header removed - expo-router handles navigation
// SearchBar replaced with TextInput
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
// BottomSheet replaced with Modal
import { Button } from '../../src/components/common/Button.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const ROLE_COLOR = { OWNER:'#1D9E75',MANAGER:'#2563EB',CASHIER:'#7C3AED',ADMIN:'#DC2626',SUPPORT:'#0891B2',HOTEL:'#7C3AED',MALL:'#2563EB',CUSTOMER:'#6B7280',SUPPLIER:'#059669',KITCHEN:'#D97706' };

export default function AdminUsersScreen({ navigation }) {
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
      await authApi.updateUserStatus(id, status);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
      setSelected(null);
      Toast.show({ type: 'success', text1: `User ${status.toLowerCase()}` });
    } catch { Toast.show({ type: 'error', text1: 'Failed to update status' }); }
  };

  const deleteUser = (user) => {
    Alert.alert('Delete user', `Permanently delete ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await authApi.deleteUser(user.id);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setSelected(null);
        Toast.show({ type: 'success', text1: 'User deleted' });
      }}
    ]);
  };

  const ROLES = ['', 'OWNER','MANAGER','CASHIER','ADMIN','SUPPORT','HOTEL','MALL','CUSTOMER','SUPPLIER'];

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
      <Icon name="chevron-right" size={16} color={Colors.gray300} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Header title="Users" subtitle={`${total} total`} onBack={() => navigation.goBack()} />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Name, email, phone…" />
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
              <Button title="🗑 Delete user"    onPress={() => deleteUser(selected)} variant="danger" />
            </View>
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
});