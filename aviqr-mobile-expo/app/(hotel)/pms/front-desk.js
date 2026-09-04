import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { StatusBadge } from '../../../src/components/common/StatusBadge.js';
import { BottomSheet } from '../../../src/components/common/BottomSheet.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

export default function FrontDeskScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [extendId, setExtendId] = useState(null);
  const [extendDate, setExtendDate] = useState('');
  const [card, setCard] = useState(null);

  const load = useCallback(async (hId) => {
    const res = await pmsApi.listReservations(hId);
    setReservations(res.data.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await load(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [load]);

  const act = async (fn, id) => {
    setBusy(p => ({ ...p, [id]: true }));
    try { await fn(id); await load(hotelId); }
    catch (err) { Alert.alert(err?.response?.data?.message || 'Action failed'); }
    finally { setBusy(p => ({ ...p, [id]: false })); }
  };

  const submitExtend = async (id) => {
    if (!extendDate) return;
    setBusy(p => ({ ...p, [id]: true }));
    try { await pmsApi.extendStay(id, extendDate); setExtendId(null); setExtendDate(''); await load(hotelId); }
    catch (err) { Alert.alert(err?.response?.data?.message || 'Could not extend stay'); }
    finally { setBusy(p => ({ ...p, [id]: false })); }
  };

  const viewCard = async (id) => {
    try { const res = await pmsApi.getRegistrationCard(id); setCard(res.data.data); }
    catch (err) { Alert.alert(err?.response?.data?.message || 'No registration card on file'); }
  };

  const confirmAction = (title, message, onConfirm) => {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]);
  };

  const live = reservations.filter(r => r.status === 'BOOKED' || r.status === 'CHECKED_IN');

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Front Desk" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Front Desk" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Check guests in and out.</Text>

        {live.map(r => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={ss.guestName}>{r.guestName}</Text>
                <Text style={ss.dates}>{r.checkInDate} → {r.checkOutDate}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <StatusBadge status={r.status} />
                  {r.preCheckedIn && <StatusBadge status="ACTIVE" />}
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push(`/(hotel)/pms/folio?reservationId=${r.id}`)} style={ss.iconBtn}>
                <Text style={ss.iconTxt}>🧾</Text>
              </TouchableOpacity>
            </View>

            {extendId === r.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                <Input placeholder="New check-out YYYY-MM-DD" value={extendDate} onChangeText={setExtendDate} style={{ flex: 1, marginBottom: 0 }} />
                <Button title="Save" size="sm" loading={busy[r.id]} onPress={() => submitExtend(r.id)} />
                <Button title="Cancel" size="sm" variant="ghost" onPress={() => { setExtendId(null); setExtendDate(''); }} />
              </View>
            ) : (
              <View style={ss.actionsRow}>
                {r.preCheckedIn && (
                  <TouchableOpacity onPress={() => viewCard(r.id)} style={ss.actionBtn}><Text style={ss.actionTxt}>Reg. card</Text></TouchableOpacity>
                )}
                {r.status === 'BOOKED' && (
                  <>
                    <TouchableOpacity disabled={busy[r.id]} onPress={() => act(pmsApi.checkIn, r.id)} style={[ss.actionBtn, ss.primaryBtn]}>
                      <Text style={ss.primaryTxt}>Check in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={busy[r.id]} onPress={() => confirmAction('Cancel reservation?', `Cancel ${r.guestName}'s booking?`, () => act(pmsApi.cancel, r.id))} style={ss.actionBtn}>
                      <Text style={ss.actionTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={busy[r.id]} onPress={() => confirmAction('Mark no-show?', `Mark ${r.guestName} as a no-show?`, () => act(pmsApi.noShow, r.id))} style={ss.actionBtn}>
                      <Text style={ss.actionTxt}>No-show</Text>
                    </TouchableOpacity>
                  </>
                )}
                {r.status === 'CHECKED_IN' && (
                  <>
                    <TouchableOpacity disabled={busy[r.id]} onPress={() => confirmAction('Check out?', `Check out ${r.guestName}?`, () => act(pmsApi.checkOut, r.id))} style={[ss.actionBtn, ss.primaryBtn]}>
                      <Text style={ss.primaryTxt}>Check out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setExtendId(r.id); setExtendDate(r.checkOutDate); }} style={ss.actionBtn}>
                      <Text style={ss.actionTxt}>Extend stay</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </Card>
        ))}
        {live.length === 0 && <Text style={ss.emptyTxt}>No arrivals or in-house guests right now.</Text>}
      </ScrollView>

      <BottomSheet visible={!!card} onClose={() => setCard(null)} height={420}>
        {card && (
          <>
            <Text style={ss.sheetTitle}>Registration Card</Text>
            <Text style={ss.cardLine}><Text style={ss.cardLabel}>Guest: </Text>{card.guestName}</Text>
            <Text style={ss.cardLine}><Text style={ss.cardLabel}>ID proof: </Text>{card.idProofType || '—'} {card.idProofNumber || ''}</Text>
            <Text style={ss.cardLine}><Text style={ss.cardLabel}>Address: </Text>{card.address || '—'}</Text>
            <Text style={ss.cardLine}><Text style={ss.cardLabel}>Signed: </Text>{card.signedAt ? new Date(card.signedAt).toLocaleString() : '—'}</Text>
            {card.signatureData && (
              <>
                <Text style={[ss.cardLabel, { marginTop: 10, marginBottom: 6 }]}>Signature</Text>
                <Image source={{ uri: card.signatureData }} style={{ width: '100%', height: 120, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border }} resizeMode="contain" />
              </>
            )}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  guestName: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  dates: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  iconBtn: { padding: 6 },
  iconTxt: { fontSize: 18 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  actionBtn: { backgroundColor: Colors.gray100, paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md },
  actionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  primaryBtn: { backgroundColor: Colors.primary },
  primaryTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.white },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 40 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 12 },
  cardLine: { fontSize: FontSize.sm, color: Colors.gray900, marginBottom: 6, lineHeight: 20 },
  cardLabel: { fontWeight: '700', color: Colors.gray700 },
});
