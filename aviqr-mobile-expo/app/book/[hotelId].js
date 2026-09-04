import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { pmsApi } from '../../src/api/index.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

// Public, guest-facing direct booking engine — a hotel's own "book now" page,
// no AviQR login. Reachable at /book/:hotelId, mirrors the web route.
export default function BookingEngineScreen() {
  const { hotelId } = useLocalSearchParams();
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [selected, setSelected] = useState(null);
  const [availableRooms, setAvailableRooms] = useState(null);
  const [checking, setChecking] = useState(false);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '', adults: '1', children: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    pmsApi.publicHotelInfo(hotelId).then(res => setHotel(res.data.data)).catch(() => {});
    pmsApi.publicRoomTypes(hotelId).then(res => setRoomTypes(res.data.data || [])).catch(() => {});
  }, [hotelId]);

  const pickPlan = (rt, plan) => {
    setSelected({ roomTypeId: rt.roomTypeId, ratePlanId: plan.ratePlanId, rate: plan.baseRate, roomTypeName: rt.name, planName: plan.name });
    setAvailableRooms(null);
  };

  const checkAvailability = async () => {
    if (!selected) return;
    setChecking(true); setError(null);
    try {
      const res = await pmsApi.publicAvailability(hotelId, selected.roomTypeId, checkIn, checkOut);
      setAvailableRooms(res.data.data.availableRooms);
    } catch { setError('Could not check availability. Please try again.'); }
    finally { setChecking(false); }
  };

  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const total = selected ? Number(selected.rate) * nights : 0;

  const book = async () => {
    if (!guest.guestName.trim() || !guest.guestPhone.trim()) return Alert.alert('Name and phone are required');
    setLoading(true); setError(null);
    try {
      const res = await pmsApi.publicBook(hotelId, {
        guestName: guest.guestName, guestPhone: guest.guestPhone,
        checkInDate: checkIn, checkOutDate: checkOut,
        adults: Number(guest.adults) || 1, children: Number(guest.children) || 0,
        roomTypeId: selected.roomTypeId, ratePlanId: selected.ratePlanId,
      });
      setConfirmation(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete your booking. Please try again.');
    } finally { setLoading(false); }
  };

  if (confirmation) {
    return (
      <View style={ss.page}>
        <View style={ss.center}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={ss.doneTitle}>Booking confirmed!</Text>
          <Text style={ss.doneSub}>{confirmation.guestName} · {confirmation.checkInDate} → {confirmation.checkOutDate}</Text>
          <TouchableOpacity style={[ss.primaryBtn, { marginTop: 20, width: '100%' }]} onPress={() => router.push(`/checkin/${confirmation.id}`)}>
            <Text style={ss.primaryBtnTxt}>Complete contactless check-in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={ss.page}>
      <ScrollView>
        <LinearGradient colors={['#1D9E75', '#178A65']} style={ss.header}>
          <Text style={{ fontSize: 24 }}>🛏️</Text>
          <Text style={ss.headerTitle}>{hotel?.name || 'Book your stay'}</Text>
          <Text style={ss.headerSub}>{hotel?.city ? `${hotel.city} · ` : ''}Book directly, no OTA fees.</Text>
        </LinearGradient>

        <View style={ss.body}>
          {error && <View style={ss.errorBox}><Text style={ss.errorTxt}>⚠ {error}</Text></View>}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={ss.label}>Check-in</Text>
              <TextInput style={ss.input} value={checkIn} onChangeText={v => { setCheckIn(v); setAvailableRooms(null); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.label}>Check-out</Text>
              <TextInput style={ss.input} value={checkOut} onChangeText={v => { setCheckOut(v); setAvailableRooms(null); }} />
            </View>
          </View>

          <Text style={ss.sectionTitle}>Choose a room</Text>
          {roomTypes.map(rt => (
            <View key={rt.roomTypeId} style={ss.card}>
              <Text style={ss.rtName}>{rt.name}</Text>
              {rt.description ? <Text style={ss.rtDesc}>{rt.description}</Text> : null}
              <Text style={ss.rtMeta}>👥 Up to {rt.maxOccupancy} guests</Text>
              <View style={{ gap: 6, marginTop: 10 }}>
                {rt.ratePlans.map(plan => {
                  const active = selected?.ratePlanId === plan.ratePlanId;
                  return (
                    <TouchableOpacity key={plan.ratePlanId} onPress={() => pickPlan(rt, plan)} style={[ss.planRow, active && ss.planRowActive]}>
                      <Text style={ss.planLabel}>{plan.name} <Text style={ss.planMeta}>({plan.mealPlan.replace('_', ' ')})</Text></Text>
                      <Text style={ss.planRate}>₹{Number(plan.baseRate).toLocaleString('en-IN')}/night</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          {roomTypes.length === 0 && <Text style={ss.emptyTxt}>No rooms available to book online right now.</Text>}

          {selected && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity style={ss.secondaryBtn} onPress={checkAvailability} disabled={checking}>
                <Text style={ss.secondaryBtnTxt}>{checking ? 'Checking…' : 'Check availability'}</Text>
              </TouchableOpacity>

              {availableRooms !== null && (
                availableRooms > 0 ? (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    <View style={ss.card}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={ss.summaryTxt}>{selected.roomTypeName} · {selected.planName}</Text>
                        <Text style={ss.summaryTxt}>{nights} night{nights > 1 ? 's' : ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={ss.totalLabel}>Total</Text>
                        <Text style={ss.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
                      </View>
                    </View>
                    <Text style={ss.label}>Full name</Text>
                    <TextInput style={ss.input} value={guest.guestName} onChangeText={v => setGuest(g => ({ ...g, guestName: v }))} />
                    <Text style={ss.label}>Phone number</Text>
                    <TextInput style={ss.input} keyboardType="phone-pad" value={guest.guestPhone} onChangeText={v => setGuest(g => ({ ...g, guestPhone: v }))} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.label}>Adults</Text>
                        <TextInput style={ss.input} keyboardType="number-pad" value={guest.adults} onChangeText={v => setGuest(g => ({ ...g, adults: v }))} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.label}>Children</Text>
                        <TextInput style={ss.input} keyboardType="number-pad" value={guest.children} onChangeText={v => setGuest(g => ({ ...g, children: v }))} />
                      </View>
                    </View>
                    <TouchableOpacity style={ss.primaryBtn} onPress={book} disabled={loading}>
                      <Text style={ss.primaryBtnTxt}>{loading ? 'Booking…' : `Book now — ₹${total.toLocaleString('en-IN')}`}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[ss.errorBox, { marginTop: 10 }]}><Text style={ss.errorTxt}>⚠ No rooms available for these dates.</Text></View>
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  doneTitle: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  doneSub: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center' },
  header: { padding: 24, paddingTop: 52 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 8 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  body: { padding: Spacing.base, paddingBottom: 40 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, height: 46, fontSize: FontSize.base, backgroundColor: Colors.white, marginBottom: 10 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray700, marginBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10 },
  rtName: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  rtDesc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  rtMeta: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 4 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.white },
  planRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  planLabel: { fontSize: FontSize.sm, color: Colors.gray900 },
  planMeta: { fontSize: 11, color: Colors.gray400 },
  planRate: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 20 },
  secondaryBtn: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, height: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnTxt: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  summaryTxt: { fontSize: FontSize.sm, color: Colors.gray900 },
  totalLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  totalValue: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  errorTxt: { color: '#B91C1C', fontSize: FontSize.sm },
});
