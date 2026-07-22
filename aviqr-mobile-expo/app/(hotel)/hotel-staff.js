import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { hotelApi, hotelAccessApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const ROLES = ['GENERAL_MANAGER', 'OUTLET_MANAGER', 'STAFF'];
const ROLE_COLOR = { OWNER: '#DC2626', GENERAL_MANAGER: '#7C3AED', OUTLET_MANAGER: '#2563EB', STAFF: '#059669' };
const ROLE_LABEL = { OWNER: 'Owner', GENERAL_MANAGER: 'General Manager', OUTLET_MANAGER: 'Outlet Manager', STAFF: 'Staff' };

// Hotel-wide dashboard access (who can log into the hotel dashboard at all) —
// distinct from an outlet's own shop-service employees (waiters/cashiers,
// managed at Outlets → [outlet] → Staff).
export default function HotelStaffScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [access, setAccess]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ userId: '', role: 'STAFF' });
  const [saving, setSaving]   = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hRes = await hotelApi.getMyHotels();
      const hotel = (hRes.data.data || [])[0];
      if (!hotel) { setAccess([]); setOffline(false); return; }
      setHotelId(hotel.id);
      const res = await hotelAccessApi.list(hotel.id);
      setAccess(res.data.data || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grant = async () => {
    if (!form.userId.trim()) return Alert.alert('User ID required');
    setSaving(true);
    try {
      const res = await hotelAccessApi.grant(hotelId, { userId: form.userId.trim(), role: form.role });
      setAccess(prev => [...prev, res.data.data]);
      setShowAdd(false);
      setForm({ userId: '', role: 'STAFF' });
    } catch (e) { Alert.alert('Failed to grant access', e.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const revoke = (row) => {
    Alert.alert('Revoke access', `Remove this user's access to the hotel dashboard?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        try {
          await hotelAccessApi.revoke(hotelId, row.id);
          setAccess(prev => prev.filter(a => a.id !== row.id));
        } catch { Alert.alert('Failed to revoke access'); }
      }}
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Hotel Staff · ${access.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={access}
        keyExtractor={a => a.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <TouchableOpacity style={ss.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={ss.addBtnTxt}>➕ Grant access</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={!loading && <EmptyState icon="👔" title="No staff access granted yet" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={{ flex: 1 }}>
              <Text style={ss.userId} numberOfLines={1}>{item.userId}</Text>
              <Text style={ss.scope}>{item.outletId ? `Outlet-scoped` : 'Whole hotel'}</Text>
            </View>
            <View style={[ss.badge, { backgroundColor: (ROLE_COLOR[item.role] || '#6B7280') + '20' }]}>
              <Text style={[ss.badgeTxt, { color: ROLE_COLOR[item.role] || '#6B7280' }]}>{ROLE_LABEL[item.role] || item.role}</Text>
            </View>
            {item.role !== 'OWNER' && (
              <TouchableOpacity onPress={() => revoke(item)} style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 16, color: Colors.error }}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={ss.sheetTitle}>Grant hotel access</Text>
        <Input label="User ID *" placeholder="UUID of the user to grant access" value={form.userId} onChangeText={v => set('userId', v)} autoCapitalize="none" />
        <Text style={ss.roleLabel}>Role</Text>
        <View style={ss.roleGrid}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[ss.roleChip, form.role === r && { backgroundColor: (ROLE_COLOR[r]) + '20', borderColor: ROLE_COLOR[r] }]} onPress={() => set('role', r)}>
              <Text style={[ss.roleChipTxt, form.role === r && { color: ROLE_COLOR[r] }]}>{ROLE_LABEL[r]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={saving ? 'Granting…' : 'Grant access'} onPress={grant} loading={saving} style={{ marginTop: 12 }} />
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  addBtn: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  addBtnTxt: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  userId: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900, fontFamily: 'monospace' },
  scope: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  roleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  roleChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
});
