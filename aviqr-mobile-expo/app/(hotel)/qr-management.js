import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { hotelApi, hotelOutletApi, qrApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Card } from '../../src/components/common/Card.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

const deviceLabel = (ua) => {
  if (!ua) return 'Unknown device';
  if (/ipad/i.test(ua)) return '📱 iPad';
  if (/iphone/i.test(ua)) return '📱 iPhone';
  if (/android/i.test(ua)) return '📱 Android';
  if (/windows/i.test(ua)) return '💻 Windows';
  if (/macintosh/i.test(ua)) return '💻 Mac';
  return '🖥️ Other';
};

export default function HotelQrManagementScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [hotelName, setHotelName] = useState('');
  const [mainQr, setMainQr]   = useState(null);
  const [rooms, setRooms]     = useState([]);
  const [qrMap, setQrMap]     = useState({}); // roomNumber -> qr row
  const [outlets, setOutlets] = useState([]);
  const [trend, setTrend]     = useState([]);
  const [byRoom, setByRoom]   = useState([]);
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [busy, setBusy]       = useState({}); // regenerate/generate in-flight per key
  const [roomServiceQrs, setRoomServiceQrs] = useState({}); // room.id -> qr row

  const load = useCallback(async (hId) => {
    const [qrRes, roomsRes, outletsRes, codesRes, trendRes, byRoomRes, recentRes] = await Promise.allSettled([
      hotelApi.createHotelQr(hId),
      hotelApi.getRooms(hId),
      hotelOutletApi.list(hId),
      hotelApi.getHotelQrCodes(hId),
      hotelApi.qrScanTrend(hId, 14),
      hotelApi.qrScansByRoom(hId),
      hotelApi.qrRecentScans(hId, 15),
    ]);
    if (qrRes.status === 'fulfilled') setMainQr(qrRes.value.data.data);
    if (roomsRes.status === 'fulfilled') setRooms(roomsRes.value.data.data || []);
    if (outletsRes.status === 'fulfilled') setOutlets(outletsRes.value.data.data || []);
    if (codesRes.status === 'fulfilled') {
      const map = {};
      // The list has no guaranteed order, and a regenerated room keeps its
      // deactivated old row (for scan history) alongside the new one — sort
      // by createdAt first so the newest row per room always wins the map.
      (codesRes.value.data.data || [])
        .filter(q => q.type === 'HOTEL_ROOM')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach(q => { map[q.groupParam] = q; });
      setQrMap(map);
    }
    if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.data || []);
    if (byRoomRes.status === 'fulfilled') setByRoom(byRoomRes.value.data.data || []);
    if (recentRes.status === 'fulfilled') setRecent(recentRes.value.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        setHotelName(hotel.name || '');
        await load(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

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

  const generateRoomQr = async (room) => {
    setBusy(p => ({ ...p, [room.id]: true }));
    try {
      await hotelApi.createRoomQr(room.id);
      await load(hotelId);
    } catch { Alert.alert('Could not generate QR code'); }
    finally { setBusy(p => ({ ...p, [room.id]: false })); }
  };

  const regenerateRoomQr = (room) => {
    Alert.alert(
      'Regenerate QR code?',
      'This creates a new QR code and permanently deactivates the current one — any printed copies of the old QR will stop working.',
      [{ text: 'Cancel', style: 'cancel' }, {
        text: 'Regenerate', style: 'destructive', onPress: async () => {
          setBusy(p => ({ ...p, [room.id]: true }));
          try { await hotelApi.regenerateRoomQr(room.id); await load(hotelId); }
          catch { Alert.alert('Could not regenerate QR code'); }
          finally { setBusy(p => ({ ...p, [room.id]: false })); }
        },
      }],
    );
  };

  const regenerateHotelQr = () => {
    Alert.alert(
      'Regenerate QR code?',
      'This creates a new QR code and permanently deactivates the current one — any printed copies of the old QR will stop working.',
      [{ text: 'Cancel', style: 'cancel' }, {
        text: 'Regenerate', style: 'destructive', onPress: async () => {
          setBusy(p => ({ ...p, hotel: true }));
          try { const res = await hotelApi.regenerateHotelQr(hotelId); setMainQr(res.data.data); }
          catch { Alert.alert('Could not regenerate QR code'); }
          finally { setBusy(p => ({ ...p, hotel: false })); }
        },
      }],
    );
  };

  const shareLink = (url) => {
    if (!url) return;
    Share.share({ message: `Scan to access hotel services: ${url}`, url }).catch(() => {});
  };

  // Links one room to one outlet's menu — the guest scans it and lands straight on
  // that outlet's menu with room context pre-filled ("one QR, one linked target").
  const generateRoomServiceQr = async (room, outletId) => {
    setBusy(p => ({ ...p, [`rs-${room.id}`]: true }));
    try {
      const res = await hotelOutletApi.createRoomServiceQr(outletId, room.id);
      setRoomServiceQrs(prev => ({ ...prev, [room.id]: res.data.data }));
    } catch { Alert.alert('Could not generate room service QR'); }
    finally { setBusy(p => ({ ...p, [`rs-${room.id}`]: false })); }
  };

  const outletsWithShop = outlets.filter(o => o.shopId);
  const pickOutletForRoomService = (room) => {
    if (outletsWithShop.length === 0) return;
    if (outletsWithShop.length === 1) { generateRoomServiceQr(room, outletsWithShop[0].id); return; }
    Alert.alert(
      `Room ${room.roomNumber} — link to which outlet?`,
      undefined,
      [
        ...outletsWithShop.map(o => ({ text: o.name, onPress: () => generateRoomServiceQr(room, o.id) })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="QR Management" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  const mainScanUrl = mainQr?.qrCode ? qrApi.redirectUrl(mainQr.qrCode) : mainQr?.targetUrl;
  const maxTrend = Math.max(1, ...trend.map(d => Number(d.count || 0)));
  const totalTrend = trend.reduce((n, d) => n + Number(d.count || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="QR Management" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        {mainQr && (
          <Card style={ss.mainCard}>
            <Text style={ss.sectionTitle}>Main Hotel QR</Text>
            <View style={ss.qrBox}>
              <QRCode value={mainScanUrl || 'https://aviqr.com'} size={180} color={Colors.gray900} backgroundColor="white" />
            </View>
            <Text style={ss.scanCount}>👁 {(mainQr.scanCount || 0).toLocaleString()} scans</Text>
            <View style={ss.actionsRow}>
              <Button title="Share Link" variant="outline" size="sm" onPress={() => shareLink(mainScanUrl)} style={{ flex: 1 }} />
              <Button title={busy.hotel ? 'Regenerating…' : 'Regenerate'} variant="ghost" size="sm" loading={busy.hotel} onPress={regenerateHotelQr} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        <Text style={ss.sectionTitle}>Rooms ({rooms.length})</Text>
        {rooms.map(r => {
          const qr = qrMap[r.roomNumber];
          const scanUrl = qr?.qrCode ? qrApi.redirectUrl(qr.qrCode) : null;
          const rsQr = roomServiceQrs[r.id];
          const rsScanUrl = rsQr?.qrCode ? qrApi.redirectUrl(rsQr.qrCode) : rsQr?.targetUrl;
          return (
            <Card key={r.id} style={{ marginBottom: 8 }} padding={12}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={ss.roomThumb}>
                  {scanUrl
                    ? <QRCode value={scanUrl} size={48} color={Colors.gray900} backgroundColor="white" />
                    : <View style={ss.roomThumbEmpty} />}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={ss.rowLabel}>Room {r.roomNumber}</Text>
                  {qr && <Text style={ss.roomScans}>👁 {(qr.scanCount || 0).toLocaleString()} scans</Text>}
                </View>
                {qr ? (
                  <>
                    <Switch value={!!r.qrActive} onValueChange={() => toggleRoomQr(r)} disabled={toggling[r.id]} trackColor={{ true: Colors.primary }} thumbColor={Colors.white} />
                    <TouchableOpacity onPress={() => regenerateRoomQr(r)} disabled={busy[r.id]} style={ss.smallActionBtn}>
                      <Text style={ss.smallActionTxt}>{busy[r.id] ? '…' : 'Regenerate'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => generateRoomQr(r)} disabled={busy[r.id]} style={ss.smallActionBtn}>
                    <Text style={ss.smallActionTxt}>{busy[r.id] ? '…' : 'Generate QR'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {outletsWithShop.length > 0 && (
                <View style={ss.roomServiceRow}>
                  {rsQr && (
                    <View style={ss.roomThumb}>
                      <QRCode value={rsScanUrl} size={40} color={Colors.gray900} backgroundColor="white" />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => rsQr ? shareLink(rsScanUrl) : pickOutletForRoomService(r)}
                    disabled={busy[`rs-${r.id}`]}
                    style={[ss.smallActionBtn, { marginLeft: rsQr ? 10 : 0 }]}
                  >
                    <Text style={ss.smallActionTxt}>
                      {busy[`rs-${r.id}`] ? '…' : rsQr ? '🍽 Share Room Service QR' : '🍽 Room Service QR'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })}

        <Text style={ss.sectionTitle}>Scan Analytics</Text>
        <Card style={{ marginBottom: 8 }}>
          <Text style={ss.analyticsSub}>{totalTrend.toLocaleString()} scans in the last 14 days</Text>
          {trend.length === 0 ? (
            <Text style={ss.emptyTxt}>No scans in this period.</Text>
          ) : (
            <View style={ss.trendRow}>
              {trend.map(d => (
                <View key={d.day} style={ss.trendBarWrap}>
                  <View style={[ss.trendBar, { height: Math.max(4, (Number(d.count) / maxTrend) * 60) }]} />
                </View>
              ))}
            </View>
          )}
        </Card>

        {byRoom.some(r => Number(r.total || 0) > 0) && (
          <Card style={{ marginBottom: 8 }}>
            <Text style={ss.analyticsSub}>Most-scanned rooms</Text>
            {byRoom.filter(r => Number(r.total || 0) > 0).map(r => (
              <View key={r.groupParam} style={ss.analyticsRow}>
                <Text style={ss.rowLabel}>{r.label || `Room ${r.groupParam}`}</Text>
                <Text style={ss.roomScans}>{Number(r.total).toLocaleString()} scans</Text>
              </View>
            ))}
          </Card>
        )}

        {recent.length > 0 && (
          <Card style={{ marginBottom: 8 }}>
            <Text style={ss.analyticsSub}>Recent activity</Text>
            {recent.slice(0, 8).map((s, i) => (
              <View key={i} style={ss.analyticsRow}>
                <Text style={ss.recentLabel} numberOfLines={1}>
                  {s.type === 'HOTEL' ? 'Main Hotel QR' : (s.label || `Room ${s.groupParam}`)}
                </Text>
                <Text style={ss.recentDevice}>{deviceLabel(s.userAgent)}</Text>
              </View>
            ))}
          </Card>
        )}

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
  mainCard: { alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10, marginTop: 4 },
  qrBox: { padding: 12, backgroundColor: Colors.white, borderRadius: Radius.md, marginVertical: 10 },
  scanCount: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray700, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  rowLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray900 },
  roomThumb: { width: 48, height: 48, borderRadius: Radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  roomServiceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  roomThumbEmpty: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.gray100 },
  roomScans: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  smallActionBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6 },
  smallActionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  analyticsSub: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 8 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 64 },
  trendBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  trendBar: { width: '100%', maxWidth: 18, backgroundColor: Colors.primary, borderRadius: 3 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  recentLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray900, flex: 1, marginRight: 8 },
  recentDevice: { fontSize: FontSize.xs, color: Colors.gray500 },
});
