import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { hotelApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function AdminHotelsScreen() {
  const [hotels, setHotels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRef]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [viewLoad, setViewLoad] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hotelApi.listAll({ size: 100 });
      const d = res.data.data;
      setHotels(Array.isArray(d) ? d : d?.content || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openView = async (h) => {
    setSelected(h); setViewStats(null); setViewLoad(true);
    try {
      const [roomsRes, reqRes] = await Promise.allSettled([hotelApi.getRooms(h.id), hotelApi.getRequests(h.id)]);
      const rooms = roomsRes.status === 'fulfilled' ? (roomsRes.value.data.data || []) : [];
      const requests = reqRes.status === 'fulfilled' ? (reqRes.value.data.data || []) : [];
      const occupied = rooms.filter(r => (r.status || '').toUpperCase() === 'OCCUPIED').length;
      const pending = requests.filter(r => ['NEW', 'PENDING'].includes((r.status || '').toUpperCase())).length;
      setViewStats({ roomCount: rooms.length, occupied, requestCount: requests.length, pending });
    } catch { setViewStats({ roomCount: 0, occupied: 0, requestCount: 0, pending: 0 }); }
    finally { setViewLoad(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Hotels · ${hotels.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={hotels}
        keyExtractor={h => h.id}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🏨" title="No hotels registered" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.card} onPress={() => openView(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.name}</Text>
              <Text style={ss.sub}>{item.address || '—'} · {item.phone || '—'}</Text>
              <View style={ss.metaRow}>
                {(item.enabledServices || []).map(s => (
                  <View key={s} style={ss.svcBadge}><Text style={ss.svcTxt}>{s}</Text></View>
                ))}
              </View>
            </View>
            <Text style={ss.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <View>
            <Text style={ss.sheetTitle}>{selected.name}</Text>
            <Text style={ss.sectionLabel}>ACTIVITY</Text>
            <View style={ss.statGrid}>
              {[
                ['Total rooms', viewStats?.roomCount], ['Occupied', viewStats?.occupied],
                ['Guest requests', viewStats?.requestCount], ['Pending', viewStats?.pending],
              ].map(([label, value]) => (
                <View key={label} style={ss.statCard}>
                  <Text style={ss.statVal}>{viewLoad ? '…' : (value ?? '—')}</Text>
                  <Text style={ss.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={ss.sectionLabel}>REGISTRATION</Text>
            {[
              ['Hotel ID', selected.id], ['Owner ID', selected.ownerId], ['Phone', selected.phone],
              ['Email', selected.email], ['City', selected.city], ['Address', selected.address],
              ['Check-in / out', `${selected.checkInTime || '—'} / ${selected.checkOutTime || '—'}`],
              ['Enabled services', (selected.enabledServices || []).join(', ') || '—'],
              ['Status', selected.active === false ? 'Inactive' : 'Active'],
              ['Created', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
            ].map(([label, value]) => (
              <View key={label} style={ss.fieldRow}>
                <Text style={ss.fieldLabel}>{label}</Text>
                <Text style={ss.fieldValue} numberOfLines={1}>{String(value ?? '—')}</Text>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 8, ...Shadow.sm },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  svcBadge: { backgroundColor: '#EDE9FE', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  svcTxt: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  chevron: { fontSize: 18, color: Colors.gray300 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.gray400, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47%', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: 10 },
  statVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  fieldValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900, flex: 1, textAlign: 'right' },
});
