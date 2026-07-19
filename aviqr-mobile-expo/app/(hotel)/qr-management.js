import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Switch, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { hotelApi, hotelOutletApi, qrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function HotelQrManagementScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [mainQr, setMainQr]   = useState(null);
  const [rooms, setRooms]     = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        const [qrRes, roomsRes, outletsRes] = await Promise.allSettled([
          hotelApi.createHotelQr(hotel.id),
          hotelApi.getRooms(hotel.id),
          hotelOutletApi.list(hotel.id),
        ]);
        if (qrRes.status === 'fulfilled') setMainQr(qrRes.value.data.data);
        if (roomsRes.status === 'fulfilled') setRooms(roomsRes.value.data.data || []);
        if (outletsRes.status === 'fulfilled') setOutlets(outletsRes.value.data.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const toggleRoomQr = async (room) => {
    setToggling(p => ({ ...p, [room.id]: true }));
    try {
      await hotelApi.toggleRoomQr(room.id, !room.qrActive);
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, qrActive: !r.qrActive } : r));
    } catch {}
    finally { setToggling(p => ({ ...p, [room.id]: false })); }
  };

  const toggleOutletQr = async (outlet) => {
    setToggling(p => ({ ...p, [outlet.id]: true }));
    try {
      await hotelOutletApi.toggleQr(outlet.id, !outlet.qrActive);
      setOutlets(prev => prev.map(o => o.id === outlet.id ? { ...o, qrActive: !o.qrActive } : o));
    } catch {}
    finally { setToggling(p => ({ ...p, [outlet.id]: false })); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="QR Management" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="QR Management" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {mainQr && (
          <View style={ss.mainCard}>
            <Text style={ss.sectionTitle}>Main Hotel QR</Text>
            <Image source={{ uri: qrApi.imageUrl(mainQr.qrCode) }} style={ss.qrImage} />
            <TouchableOpacity onPress={() => Linking.openURL(qrApi.imageUrl(mainQr.qrCode))} style={ss.downloadBtn}>
              <Text style={ss.downloadTxt}>⬇ Download</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={ss.sectionTitle}>Rooms ({rooms.length})</Text>
        {rooms.map(r => (
          <View key={r.id} style={ss.row}>
            <Text style={ss.rowLabel}>Room {r.roomNumber}</Text>
            <Switch value={!!r.qrActive} onValueChange={() => toggleRoomQr(r)} disabled={toggling[r.id]} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
          </View>
        ))}

        <Text style={ss.sectionTitle}>Outlets ({outlets.length})</Text>
        {outlets.map(o => (
          <View key={o.id} style={ss.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => o.shopId && router.push(`/(hotel)/outlets/${o.id}/qrcodes`)}>
              <Text style={ss.rowLabel}>{o.name} {o.shopId ? '→' : ''}</Text>
            </TouchableOpacity>
            <Switch value={!!o.qrActive} onValueChange={() => toggleOutletQr(o)} disabled={toggling[o.id]} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  mainCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, alignItems: 'center', marginBottom: 20, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  qrImage: { width: 180, height: 180, borderRadius: Radius.md, marginVertical: 10 },
  downloadBtn: { backgroundColor: Colors.gray100, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  downloadTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
});
