import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Button } from '../../../src/components/common/Button.js';
import { Input } from '../../../src/components/common/Input.js';
import { StatusBadge } from '../../../src/components/common/StatusBadge.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { guestName: '', guestPhone: '', checkInDate: today(), checkOutDate: today(), adults: '1', children: '0', groupId: '', agentId: '', rooms: [] };

export default function ReservationsScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [ratePlansByType, setRatePlansByType] = useState({});
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [avail, setAvail] = useState({ roomTypeId: '', checkIn: today(), checkOut: today(), count: null });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (hId) => {
    const [rtRes, gRes, aRes, resvRes] = await Promise.allSettled([
      pmsApi.listRoomTypes(hId), pmsApi.listGroups(hId), pmsApi.listAgents(hId), pmsApi.listReservations(hId),
    ]);
    const types = rtRes.status === 'fulfilled' ? (rtRes.value.data.data || []) : [];
    setRoomTypes(types);
    if (gRes.status === 'fulfilled') setGroups(gRes.value.data.data || []);
    if (aRes.status === 'fulfilled') setAgents(aRes.value.data.data || []);
    if (resvRes.status === 'fulfilled') setReservations(resvRes.value.data.data || []);
    const plans = {};
    await Promise.all(types.map(async rt => {
      try { plans[rt.id] = (await pmsApi.listRatePlans(rt.id)).data.data || []; } catch { plans[rt.id] = []; }
    }));
    setRatePlansByType(plans);
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

  const checkAvailability = async () => {
    if (!avail.roomTypeId) return Alert.alert('Pick a room type first');
    try {
      const res = await pmsApi.availability({ hotelId, roomTypeId: avail.roomTypeId, checkIn: avail.checkIn, checkOut: avail.checkOut });
      setAvail(a => ({ ...a, count: res.data.data.availableRooms }));
    } catch { setAvail(a => ({ ...a, count: null })); Alert.alert('Could not check availability'); }
  };

  const addRoomRow = () => setForm(f => ({ ...f, rooms: [...f.rooms, { roomTypeId: '', ratePlanId: '' }] }));
  const updateRoomRow = (i, field, val) => setForm(f => ({ ...f, rooms: f.rooms.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));
  const removeRoomRow = (i) => setForm(f => ({ ...f, rooms: f.rooms.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.guestName.trim() || form.rooms.length === 0 || form.rooms.some(r => !r.roomTypeId || !r.ratePlanId)) {
      return Alert.alert('Add a guest name and at least one complete room row');
    }
    setSaving(true);
    try {
      await pmsApi.createReservation({
        hotelId, ...form, groupId: form.groupId || null, agentId: form.agentId || null,
        adults: Number(form.adults) || 1, children: Number(form.children) || 0,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load(hotelId);
    } catch (err) { Alert.alert(err?.response?.data?.message || 'Could not create reservation'); }
    finally { setSaving(false); }
  };

  const shareCheckinLink = (r) => {
    const url = `https://aviqr.com/pms/contactless-checkin/${r.id}`;
    Share.share({ message: `Complete your pre-check-in for your stay: ${url}`, url }).catch(() => {});
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Reservations" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Reservations" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Card style={{ marginBottom: 16 }}>
          <Text style={ss.cardTitle}>Check availability</Text>
          <RoomTypePicker roomTypes={roomTypes} value={avail.roomTypeId} onChange={v => setAvail(a => ({ ...a, roomTypeId: v, count: null }))} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input label="Check-in" placeholder="YYYY-MM-DD" value={avail.checkIn} onChangeText={v => setAvail(a => ({ ...a, checkIn: v, count: null }))} style={{ flex: 1 }} />
            <Input label="Check-out" placeholder="YYYY-MM-DD" value={avail.checkOut} onChangeText={v => setAvail(a => ({ ...a, checkOut: v, count: null }))} style={{ flex: 1 }} />
          </View>
          <Button title="Check Availability" onPress={checkAvailability} />
          {avail.count !== null && <Text style={ss.availResult}>{avail.count} room(s) available</Text>}
        </Card>

        <Button title={showForm ? 'Cancel' : '+ New Reservation'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm(s => !s)} style={{ marginBottom: 16 }} />

        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Input label="Guest name *" value={form.guestName} onChangeText={v => setForm(f => ({ ...f, guestName: v }))} />
            <Input label="Phone" keyboardType="phone-pad" value={form.guestPhone} onChangeText={v => setForm(f => ({ ...f, guestPhone: v }))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input label="Check-in" value={form.checkInDate} onChangeText={v => setForm(f => ({ ...f, checkInDate: v }))} style={{ flex: 1 }} />
              <Input label="Check-out" value={form.checkOutDate} onChangeText={v => setForm(f => ({ ...f, checkOutDate: v }))} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input label="Adults" keyboardType="number-pad" value={form.adults} onChangeText={v => setForm(f => ({ ...f, adults: v }))} style={{ flex: 1 }} />
              <Input label="Children" keyboardType="number-pad" value={form.children} onChangeText={v => setForm(f => ({ ...f, children: v }))} style={{ flex: 1 }} />
            </View>

            {agents.length > 0 && (
              <>
                <Text style={ss.fieldLabel}>Booking agent</Text>
                <ChipPicker options={[{ id: '', label: 'No agent' }, ...agents.map(a => ({ id: a.id, label: `${a.name} (${a.commissionPercent}%)` }))]} value={form.agentId} onChange={v => setForm(f => ({ ...f, agentId: v }))} />
              </>
            )}
            {groups.length > 0 && (
              <>
                <Text style={ss.fieldLabel}>Group</Text>
                <ChipPicker options={[{ id: '', label: 'Standalone' }, ...groups.map(g => ({ id: g.id, label: g.name }))]} value={form.groupId} onChange={v => setForm(f => ({ ...f, groupId: v }))} />
              </>
            )}

            <Text style={[ss.fieldLabel, { marginTop: 12 }]}>Rooms</Text>
            {form.rooms.map((r, i) => (
              <View key={i} style={ss.roomRow}>
                <View style={{ flex: 1 }}>
                  <RoomTypePicker roomTypes={roomTypes} value={r.roomTypeId} onChange={v => updateRoomRow(i, 'roomTypeId', v)} compact />
                  {r.roomTypeId && (
                    <ChipPicker
                      options={(ratePlansByType[r.roomTypeId] || []).map(rp => ({ id: rp.id, label: `${rp.name} (₹${rp.baseRate})` }))}
                      value={r.ratePlanId} onChange={v => updateRoomRow(i, 'ratePlanId', v)}
                    />
                  )}
                </View>
                <TouchableOpacity onPress={() => removeRoomRow(i)} style={ss.removeBtn}><Text style={{ fontSize: 16 }}>✕</Text></TouchableOpacity>
              </View>
            ))}
            <Button title="+ Add Room" variant="outline" size="sm" onPress={addRoomRow} style={{ marginBottom: 12 }} />
            <Button title={saving ? 'Creating…' : 'Create Reservation'} loading={saving} onPress={submit} />
          </Card>
        )}

        <Text style={ss.cardTitle}>All reservations ({reservations.length})</Text>
        {reservations.map(r => (
          <Card key={r.id} style={ss.resvCard}>
            <View style={{ flex: 1 }}>
              <Text style={ss.guestName}>{r.guestName}</Text>
              <Text style={ss.resvDates}>{r.checkInDate} → {r.checkOutDate}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <StatusBadge status={r.status} />
                {r.preCheckedIn && <StatusBadge status="ACTIVE" />}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => router.push(`/(hotel)/pms/folio?reservationId=${r.id}`)} style={ss.actionBtn}>
                <Text style={ss.actionTxt}>Folio</Text>
              </TouchableOpacity>
              {r.status === 'BOOKED' && (
                <TouchableOpacity onPress={() => shareCheckinLink(r)} style={ss.actionBtn}>
                  <Text style={ss.actionTxt}>Share link</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
        {reservations.length === 0 && <Text style={ss.emptyTxt}>No reservations yet.</Text>}
      </ScrollView>
    </View>
  );
}

function RoomTypePicker({ roomTypes, value, onChange, compact }) {
  return (
    <View style={{ marginBottom: compact ? 6 : 12 }}>
      {!compact && <Text style={ss.fieldLabel}>Room type</Text>}
      <ChipPicker options={roomTypes.map(rt => ({ id: rt.id, label: rt.name }))} value={value} onChange={onChange} />
    </View>
  );
}

function ChipPicker({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <TouchableOpacity key={o.id || 'none'} onPress={() => onChange(o.id)} style={[ss.chip, active && ss.chipActive]}>
            <Text style={[ss.chipTxt, active && ss.chipTxtActive]} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ss = StyleSheet.create({
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500, marginBottom: 6 },
  availResult: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, marginTop: 8, textAlign: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: Colors.gray100, maxWidth: 220 },
  chipActive: { backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  chipTxtActive: { color: Colors.primary },
  roomRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  removeBtn: { padding: 8 },
  resvCard: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  guestName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  resvDates: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  actionBtn: { backgroundColor: Colors.gray100, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.md },
  actionTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 20 },
});
