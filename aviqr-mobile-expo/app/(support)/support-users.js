import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { authApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { StatusBadge } from '../../src/components/common/StatusBadge.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const ROLE_COLOR = { OWNER:'#1D9E75',MANAGER:'#2563EB',CASHIER:'#7C3AED',ADMIN:'#DC2626',SUPPORT:'#0891B2',HOTEL:'#7C3AED',MALL:'#2563EB',CUSTOMER:'#6B7280',SUPPLIER:'#059669',KITCHEN:'#D97706' };

// View-only lookup for support — no status/delete actions (those are ADMIN-only
// on the web reference too), matching web's UsersPanel exactly.
export default function SupportUsersScreen() {
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers({ size: 100 });
      const d = res.data.data;
      setUsers(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Users · ${filtered.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <View style={ss.controls}><Input placeholder="Name, email…" value={search} onChangeText={setSearch} /></View>
      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="👥" title="No users found" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={[ss.avatar, { backgroundColor: (ROLE_COLOR[item.role] || Colors.gray400) + '20' }]}>
              <Text style={[ss.avatarTxt, { color: ROLE_COLOR[item.role] || Colors.gray600 }]}>{item.name?.[0] || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.name}</Text>
              <Text style={ss.sub}>{item.email}</Text>
              <View style={ss.metaRow}>
                <View style={[ss.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || Colors.gray400) + '18' }]}>
                  <Text style={[ss.roleTxt, { color: ROLE_COLOR[item.role] || Colors.gray600 }]}>{item.role}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  controls: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 12, ...Shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: FontSize.lg, fontWeight: '800' },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  roleTxt: { fontSize: 11, fontWeight: '700' },
});
