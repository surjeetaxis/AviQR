import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { hotelApi, hotelOpsApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

// Read-only — there's no check-in/check-out backend action anywhere in the
// hotel service (guestName/checkInDate/checkOutDate exist on Room but nothing
// ever sets them via an API), matching the web app's own Guests tab exactly.
export default function HotelGuestsScreen() {
  const [rooms, setRooms]         = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [offline, setOffline]     = useState(false);
  const [refreshing, setRef]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hRes = await hotelApi.getMyHotels();
      const hotel = (hRes.data.data || [])[0];
      if (!hotel) { setRooms([]); setBookings([]); setOffline(false); return; }
      const [rRes, bRes] = await Promise.allSettled([hotelApi.getRooms(hotel.id), hotelOpsApi.listBookings(hotel.id)]);
      if (rRes.status === 'fulfilled') setRooms(rRes.value.data.data || []);
      if (bRes.status === 'fulfilled') setBookings(bRes.value.data.data || []);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const guestRooms = rooms.filter(r => r.status === 'OCCUPIED' && r.guestName);
  const activeBookings = bookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title={`Guests · ${guestRooms.length}`} />
      {offline && <OfflineBadge onRetry={load} />}
      <FlatList
        data={guestRooms}
        keyExtractor={r => r.id}
        ListHeaderComponent={<Text style={ss.sectionTitle}>In-house guests</Text>}
        contentContainerStyle={{ padding: Spacing.base, gap: 8, paddingBottom: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRef(true); await load(); setRef(false); }} tintColor={Colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="🧑‍🤝‍🧑" title="No guests in-house" />}
        renderItem={({ item }) => (
          <View style={ss.card}>
            <View style={ss.avatar}><Text style={ss.avatarTxt}>{item.guestName?.[0] || '?'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={ss.name}>{item.guestName}</Text>
              <Text style={ss.sub}>Room {item.roomNumber} · {item.roomType}</Text>
              {item.checkInDate && <Text style={ss.dates}>In: {item.checkInDate} · Out: {item.checkOutDate || '—'}</Text>}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <Text style={ss.sectionTitle}>Active outlet bookings</Text>
            {activeBookings.length === 0 ? (
              <Text style={ss.empty}>No active outlet bookings.</Text>
            ) : activeBookings.map(b => (
              <View key={b.id} style={ss.bookingRow}>
                <Text style={ss.bookingRoom}>Room {b.roomNumber}</Text>
                <Text style={ss.bookingDetail}>{b.outletName} · {b.serviceName} · {b.bookingDate} {b.bookingTime}</Text>
              </View>
            ))}
          </View>
        }
      />
    </View>
  );
}

const ss = StyleSheet.create({
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: 12, ...Shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  dates: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  empty: { fontSize: FontSize.sm, color: Colors.gray400, paddingHorizontal: Spacing.base },
  bookingRow: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginHorizontal: Spacing.base, marginBottom: 8, ...Shadow.sm },
  bookingRoom: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  bookingDetail: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
});
